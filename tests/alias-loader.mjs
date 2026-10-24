/* Loader ESM para tests: resuelve el alias "@/..." → src/... y añade
   extensiones .ts cuando el import no la incluye. */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = path.resolve(import.meta.dirname, "..");
const src = path.join(root, "src");

function firstFile(candidates) {
  for (const candidate of candidates) {
    try {
      if (fs.statSync(candidate).isFile()) return candidate;
    } catch {
      // sigue probando
    }
  }
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const target = path.join(src, specifier.slice(2));
    const file = firstFile([
      target,
      `${target}.ts`,
      `${target}.tsx`,
      path.join(target, "index.ts"),
    ]);
    if (file) {
      return { url: pathToFileURL(file).href, shortCircuit: true };
    }
  }
  return nextResolve(specifier, context);
}
