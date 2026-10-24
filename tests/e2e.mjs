/* Prueba de integración en navegador real (Chromium headless de Termux).
   Requiere el servidor de producción o dev en PORT (por defecto 3000).

   Verifica el camino completo archivo → decode → UI → preview:
   - PNG válido se muestra (placeholder <img> o canvas con píxeles).
   - La barra muestra nombre y dimensiones reales.
   - Una segunda carga antes de terminar la primera actualiza el preview.
   - No hay errores de página.

   NOTA: en este entorno headless WebGL no rasteriza (SwiftShader),
   por lo que la trama puede quedar en el placeholder con aviso; eso
   NO se considera fallo de la prueba: el requisito es que la imagen
   seleccionada sea visible y el flujo no rompa. */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import puppeteer from "puppeteer-core";

const PREFIX = process.env.PREFIX || "/data/data/com.termux/files/usr";
const PORT = process.env.PORT || "3000";
const OUT = process.env.E2E_TMP || "/data/data/com.termux/files/usr/tmp/opencode";
const BASE = `http://localhost:${PORT}`;

function crc32(buffer) {
  let crc = 0xffffffff;
  for (let n = 0; n < buffer.length; n++) {
    let c = (crc ^ buffer[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = c ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const tag = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([tag, data])));
  return Buffer.concat([length, tag, data, crc]);
}

function makePng(file, width, height, hue) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const raw = Buffer.alloc((width * 3 + 1) * height);
  let offset = 0;
  for (let y = 0; y < height; y++) {
    raw[offset++] = 0;
    for (let x = 0; x < width; x++) {
      raw[offset++] = Math.round((x / width) * 255);
      raw[offset++] = Math.round((y / height) * 255);
      raw[offset++] = hue;
    }
  }
  fs.writeFileSync(
    file,
    Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk("IHDR", ihdr),
      chunk("IDAT", zlib.deflateSync(raw)),
      chunk("IEND", Buffer.alloc(0)),
    ])
  );
  return file;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const first = makePng(path.join(OUT, "e2e-512x512.png"), 512, 512, 40);
  const second = makePng(path.join(OUT, "e2e-300x200.png"), 300, 200, 180);

  const browser = await puppeteer.launch({
    executablePath: path.join(PREFIX, "bin/headless_shell"),
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--enable-unsafe-swiftshader",
    ],
  });

  const pageErrors = [];
  try {
    const page = await browser.newPage();
    page.on("pageerror", (error) => pageErrors.push(error.message));
    const mobile = process.env.MOBILE === "1";
    await page.setViewport(
      mobile
        ? { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }
        : { width: 1280, height: 900 }
    );

    const response = await page.goto(`${BASE}/herramientas/semitonos-dtf`, {
      waitUntil: "networkidle2",
      timeout: 45000,
    });
    assert.equal(response?.status(), 200, "la ruta del editor responde 200");

    const upload = async (file) => {
      const input = await page.$("input[type=file]");
      assert.ok(input, "debe existir input[type=file]");
      await input.uploadFile(file);
    };

    const readState = () =>
      page.evaluate(() => {
        const imgs = [...document.querySelectorAll("img")]
          .map((img) => ({
            naturalW: img.naturalWidth,
            naturalH: img.naturalHeight,
            cssW: Math.round(img.getBoundingClientRect().width),
            cssH: Math.round(img.getBoundingClientRect().height),
            visible: !!(img.offsetWidth || img.offsetHeight),
            rect: (() => {
              const r = img.getBoundingClientRect();
              return { x: Math.round(r.x), y: Math.round(r.y), right: Math.round(r.right), bottom: Math.round(r.bottom) };
            })(),
          }))
          .filter((img) => img.naturalW > 0);
        const canvases = [...document.querySelectorAll("canvas")].map(
          (canvas) => {
            let painted = 0;
            try {
              const context = canvas.getContext("2d");
              if (context && canvas.width && canvas.height) {
                const data = context.getImageData(
                  0,
                  0,
                  canvas.width,
                  canvas.height
                ).data;
                for (let i = 3; i < data.length; i += 4) {
                  if (data[i] > 8) painted += 1;
                }
              }
            } catch {
              painted = -1;
            }
            return {
              width: canvas.width,
              height: canvas.height,
              painted,
              label: canvas.getAttribute("aria-label"),
            };
          }
        );
        const toolbar =
          document.querySelector(".relative.flex.h-11")?.textContent ?? "";
        const preview = document.querySelector('[aria-label="Preview de la trama de semitonos"]');
        const container = preview?.parentElement?.parentElement?.parentElement;
        const previewRect = preview?.getBoundingClientRect();
        const containerRect = container?.getBoundingClientRect();
        return {
          imgs,
          canvases,
          toolbar,
          viewport: { w: innerWidth, h: innerHeight, dpr: devicePixelRatio },
          previewRect: previewRect && { x: previewRect.x, y: previewRect.y, w: previewRect.width, h: previewRect.height },
          containerRect: containerRect && { x: containerRect.x, y: containerRect.y, w: containerRect.width, h: containerRect.height },
          scrollY,
        };
      });

    const assertPreviewVisible = (state, label) => {
      const visibleImage = state.imgs.some(
        (img) =>
          img.visible &&
          img.cssW > 0 &&
          img.cssH > 0 &&
          img.rect.right > 0 &&
          img.rect.x < state.viewport.w &&
          img.rect.bottom > 0 &&
          img.rect.y < state.viewport.h
      );
      const paintedCanvas = state.canvases.some(
        (canvas) => canvas.painted > 0
      );
      assert.ok(
        visibleImage || paintedCanvas,
        `${label}: la imagen debe verse (img visible o canvas pintado)`
      );
    };

    // 1) Primera carga
    await upload(first);
    await page.waitForFunction(
      () => document.body.innerText.includes("512 × 512 PX"),
      { timeout: 15000 }
    );
    let state = await readState();
    assert.match(state.toolbar, /e2e-512x512\.png/, "nombre del archivo");
    assert.match(state.toolbar, /512 × 512 PX/, "dimensiones reales");
    assertPreviewVisible(state, "primera carga");

    // 2) Segunda carga inmediata (reemplaza la primera)
    await upload(second);
    await page.waitForFunction(
      () => document.body.innerText.includes("300 × 200 PX"),
      { timeout: 15000 }
    );
    state = await readState();
    console.log(`E2E state (${mobile ? "mobile" : "desktop"}):`, JSON.stringify(state));
    assert.match(state.toolbar, /e2e-300x200\.png/, "nombre actualizado");
    assertPreviewVisible(state, "segunda carga");

    const visible = state.imgs.filter((img) => img.visible);
    assert.ok(
      visible.every((img) => img.naturalW === 300 && img.naturalH === 200),
      "el placeholder corresponde a la imagen vigente, no a la anterior"
    );

    assert.deepEqual(pageErrors, [], "sin errores de página");

    console.log("OK — e2e: carga inicial, reemplazo y visibilidad del preview");
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error("FALLO e2e:", error.message);
  process.exit(1);
});
