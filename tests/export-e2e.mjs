/* Integración de exportación en navegador real (Chromium headless).
   Cada formato se valida en una página limpia para aislar el límite de
   contextos WebGL del entorno headless (SwiftShader).

   Captura el Blob descargado sin tocar el disco y valida:
   - PNG: firma, dimensiones, profundidad y canal alfa (colorType 6).
   - TIFF: firma, dimensiones, RowsPerStrip=1, tiras por fila, DPI.
   - El nombre del archivo refleja la configuración vigente (preset).
   Requiere el servidor en PORT (por defecto 3000). */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";
import { writeTestPng } from "./png.mjs";

const PREFIX = process.env.PREFIX || "/data/data/com.termux/files/usr";
const PORT = process.env.PORT || "3000";
const OUT = process.env.E2E_TMP || "/data/data/com.termux/files/usr/tmp/opencode";
const BASE = `http://localhost:${PORT}`;

function parsePng(bytes) {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  signature.forEach((value, index) => {
    assert.equal(bytes[index], value, "firma PNG");
  });
  const view = new DataView(Uint8Array.from(bytes).buffer);
  assert.equal(
    String.fromCharCode(bytes[12], bytes[13], bytes[14], bytes[15]),
    "IHDR"
  );
  return {
    width: view.getUint32(16),
    height: view.getUint32(20),
    bitDepth: bytes[24],
    colorType: bytes[25],
  };
}

function parseTiff(bytes) {
  const view = new DataView(Uint8Array.from(bytes).buffer);
  assert.equal(String.fromCharCode(bytes[0], bytes[1]), "II", "firma TIFF");
  assert.equal(view.getUint16(2, true), 42, "magic TIFF");
  const ifd = view.getUint32(4, true);
  const count = view.getUint16(ifd, true);
  const entries = new Map();
  for (let i = 0; i < count; i++) {
    const at = ifd + 2 + i * 12;
    entries.set(view.getUint16(at, true), {
      type: view.getUint16(at + 2, true),
      count: view.getUint32(at + 4, true),
      value: view.getUint32(at + 8, true),
    });
  }
  const xRes = entries.get(282);
  return {
    width: entries.get(256)?.value,
    height: entries.get(257)?.value,
    bitsPerSample: entries.get(258)?.value,
    compression: entries.get(259)?.value,
    photometric: entries.get(262)?.value,
    stripOffsetCount: entries.get(273)?.count,
    samplesPerPixel: entries.get(277)?.value,
    rowsPerStrip: entries.get(278)?.value,
    stripByteCountCount: entries.get(279)?.count,
    dpi: xRes ? view.getUint32(xRes.value, true) : null,
  };
}

async function exportInFreshPage(browser, source, { format, scale }) {
  const page = await browser.newPage();
  await page.setCacheEnabled(false);
  const pageErrors = [];
  const consoleLines = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => consoleLines.push(message.text()));
  await page.setViewport({ width: 1280, height: 900 });

  await page.evaluateOnNewDocument(() => {
    window.__exports = [];
    let lastBlob = null;
    const create = URL.createObjectURL.bind(URL);
    URL.createObjectURL = (object) => {
      if (object instanceof Blob) lastBlob = object;
      return create(object);
    };
    const nativeClick = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () {
      if (this.download) {
        window.__exports.push({ name: this.download, blob: lastBlob });
        return;
      }
      return nativeClick.call(this);
    };
  });

  try {
    const response = await page.goto(
      `${BASE}/herramientas/semitonos-dtf?noRetry=1&exportOnly=1`,
      {
        waitUntil: "networkidle2",
        timeout: 45000,
      }
    );
    assert.ok(
      response && [200, 304].includes(response.status()),
      `editor responde ${response?.status()}`
    );

    const input = await page.$("input[type=file]");
    assert.ok(input);
    await input.uploadFile(source);
    await page.waitForFunction(
      () => document.body.innerText.includes("300 × 200 PX"),
      { timeout: 15000 }
    );

    const clickButton = (needle, exact = false) =>
      page.evaluate(
        ({ needle: text, exact: isExact }) => {
          const button = [...document.querySelectorAll("button")].find(
            (candidate) => {
              const content = candidate.textContent.trim();
              return isExact ? content === text : content.includes(text);
            }
          );
          if (!button) throw new Error(`Botón no encontrado: ${text}`);
          button.click();
        },
        { needle, exact }
      );

    // Configuración vigente distinta del default (22 LPI, 15°).
    await clickButton("Vintage");

    const openExport = async () => {
      await page.evaluate(() => {
        const button = document.querySelector('button[title^="Exportar"]');
        if (!button) throw new Error("Botón Exportar de la barra no encontrado");
        button.click();
      });
      await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
    };

    await openExport();
    if (format === "tiff") {
      await clickButton("TIFF 1-BIT");
    }
    if (scale === 2) {
      await clickButton("2×", true);
    }
    await clickButton(format === "png" ? "Exportar PNG" : "Exportar TIFF");

    try {
      await page.waitForFunction(
        () => (window.__exports?.length ?? 0) >= 1,
        { timeout: 60000 }
      );
    } catch {
      const dialog = await page.evaluate(
        () => document.querySelector('[role="dialog"]')?.innerText ?? "(sin diálogo)"
      );
      throw new Error(
        `La exportación ${format} no produjo archivo. Diálogo: ${dialog} ` +
          `Consola: ${consoleLines.slice(-6).join(" | ")}`
      );
    }

    const exported = await page.evaluate(async () => {
      const entry = window.__exports[0];
      const bytes = new Uint8Array(await entry.blob.arrayBuffer());
      return { name: entry.name, bytes: Array.from(bytes) };
    });

    assert.deepEqual(pageErrors, [], "sin errores de página");
    return exported;
  } finally {
    await page.close();
  }
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const source = writeTestPng(
    path.join(OUT, "export-300x200.png"),
    300,
    200,
    90
  );

  const browser = await puppeteer.launch({
    executablePath: path.join(PREFIX, "bin/headless_shell"),
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--enable-unsafe-swiftshader",
    ],
  });

  try {
    const png = await exportInFreshPage(browser, source, {
      format: "png",
      scale: 1,
    });
    const pngInfo = parsePng(png.bytes);
    assert.equal(pngInfo.width, 300, "PNG ancho");
    assert.equal(pngInfo.height, 200, "PNG alto");
    assert.equal(pngInfo.bitDepth, 8);
    assert.equal(pngInfo.colorType, 6, "PNG RGBA con alfa");
    assert.match(
      png.name,
      /-22lpi-15deg-1x\.png$/,
      "nombre con ajustes vigentes"
    );

    const tiff = await exportInFreshPage(browser, source, {
      format: "tiff",
      scale: 2,
    });
    const tiffInfo = parseTiff(tiff.bytes);
    assert.equal(tiffInfo.width, 600, "TIFF ancho = 2×");
    assert.equal(tiffInfo.height, 400, "TIFF alto = 2×");
    assert.equal(tiffInfo.bitsPerSample, 1);
    assert.equal(tiffInfo.compression, 32773, "PackBits");
    assert.equal(tiffInfo.photometric, 0, "WhiteIsZero");
    assert.equal(tiffInfo.samplesPerPixel, 1);
    assert.equal(tiffInfo.rowsPerStrip, 1, "una fila por tira");
    assert.equal(tiffInfo.stripOffsetCount, 400, "una tira por fila");
    assert.equal(tiffInfo.stripByteCountCount, 400);
    assert.equal(tiffInfo.dpi, 600, "DPI efectivo de la escala 2×");
    assert.match(tiff.name, /-22lpi-15deg-2x\.tif$/, "nombre con escala");

    console.log(
      "OK — e2e export: PNG RGBA 300×200 y TIFF 1-bit 600×400 (RowsPerStrip=1, 600 DPI)"
    );
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error("FALLO e2e export:", error.message);
  process.exit(1);
});
