/* ------------------------------------------------------------------ */
/* WGSL del motor de semitonos — compute shader, escrito a mano y      */
/* documentado. Espejo exacto del fragment shader GLSL (glsl.ts):      */
/* una invocación por píxel de salida, trama AM con las cuatro formas  */
/* de punto, curva de tinta y composición de fondo.                    */
/*                                                                     */
/* El resultado se escribe en una texture_storage rgba8unorm y un      */
/* render pass trivial lo presenta en el lienzo (premultiplied alpha). */
/* ------------------------------------------------------------------ */

import { DOT_RADIUS_SCALE } from "@/lib/halftone/types";

export const HALFTONE_COMPUTE_WGSL = /* wgsl */ `
// Uniforms del motor (ver webgpu-renderer.ts para el layout de bytes).
struct Uniforms {
  resolution  : vec2<f32>,   // tamaño del lienzo de salida en px
  tileOrigin  : vec2<f32>,   // origen del tile (0,0 en render completo)
  bgColor     : vec3<f32>,   // color de fondo de la vista de prueba
  dotColor    : vec3<f32>,   // color de la tinta (blanco DTF)
  cellSize    : f32,         // px por célula de trama (DPI / LPI)
  angle       : f32,         // ángulo de trama en radianes
  contrast    : f32,         // contraste [-1, 1]
  gamma       : f32,         // gamma de luminancia
  minThreshold: f32,         // umbral mínimo de tinta [0, 1]
  invert      : u32,         // inversión positivo/negativo
  shape       : u32,         // 0=round 1=ellipse 2=diamond 3=line
  hardEdge    : u32,         // salida 1-bit (canal de tinta separada)
  bgAlpha     : f32,         // 1 = fondo opaco, 0 = transparente
  useSourceColor : u32,      // 1 = el punto conserva el color original
};

@group(0) @binding(0) var img : texture_2d<f32>;
@group(0) @binding(1) var samp : sampler;
@group(0) @binding(2) var output : texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(3) var<uniform> u : Uniforms;

// Luminancia perceptual (Rec. 709).
fn luma(c: vec3<f32>) -> f32 {
  return dot(c, vec3<f32>(0.2126, 0.7152, 0.0722));
}

@compute @workgroup_size(8, 8)
fn halftone(@builtin(global_invocation_id) gid: vec3<u32>) {
  // Coordenadas absolutas: origen del tile + invocación.
  let px = vec2<f32>(gid.xy) + u.tileOrigin;

  // 1) Muestra de la imagen original. En compute no existe textureSample
  //    (requiere derivadas): se usa textureSampleLevel con LOD 0. La
  //    invocación fuera de la resolución se limita a los bordes, sin
  //    return temprano (el flujo debe ser uniforme para la muestra).
  let uv = clamp(px / u.resolution, vec2<f32>(0.0), vec2<f32>(1.0));
  let src = textureSampleLevel(img, samp, uv, 0.0).rgb;
  let lum = luma(src);
  // Color del punto: original (modo color) o tinta uniforme (grises/DTF).
  let inkColor = select(u.dotColor, src, u.useSourceColor != 0u);
  let inside = gid.x < u32(u.resolution.x) && gid.y < u32(u.resolution.y);

  // 2) Curva de tinta: gamma → contraste → rango.
  var ink = pow(clamp(lum, 0.0, 1.0), u.gamma);
  ink = 0.5 + (ink - 0.5) * (1.0 + u.contrast);
  ink = clamp(ink, 0.0, 1.0);
  if (u.invert != 0u) { ink = 1.0 - ink; }

  // Cobertura de tinta blanca: la oscuridad genera punto.
  var coverage = 1.0 - ink;
  // Umbral mínimo: recorta puntos residuales en altas luces.
  coverage = (coverage - u.minThreshold) / max(1.0 - u.minThreshold, 1e-4);
  coverage = clamp(coverage, 0.0, 1.0);

  // 3) Rejilla de células rotada por el ángulo de trama.
  let c = cos(u.angle);
  let s = sin(u.angle);
  let p = vec2<f32>(c * px.x - s * px.y, s * px.x + c * px.y);
  let f = fract(p / u.cellSize) - vec2<f32>(0.5, 0.5);

  // Suavizado de borde: ~1.5 px nominales.
  let edge = 1.5 / max(u.cellSize, 2.0);

  var a: f32;
  if (u.shape == 3u) {
    // LÍNEA: banda horizontal de altura ∝ cobertura.
    let hh = 0.5 * coverage;
    let band = abs(f.y);
    a = 1.0 - smoothstep(hh - edge, hh + edge, band);
    if (u.hardEdge != 0u) { a = select(0.0, 1.0, band <= hh); }
  } else {
    // 4) Distancia normalizada al centro de la célula según la forma.
    // La escala hace que el área del punto siga la cobertura para cada forma.
    var radiusScale = ${DOT_RADIUS_SCALE.round.toFixed(9)};
    if (u.shape == 1u) {
      radiusScale = ${DOT_RADIUS_SCALE.ellipse.toFixed(9)};
    } else if (u.shape == 2u) {
      radiusScale = ${DOT_RADIUS_SCALE.diamond.toFixed(1)};
    }
    let rr = radiusScale * sqrt(coverage);
    var dist: f32;
    if (u.shape == 1u) {
      // ELIPSE: comprimida en Y → punto en cadena.
      dist = length(f * vec2<f32>(2.0, 3.64));
    } else if (u.shape == 2u) {
      // DIAMANTE: distancia L1 escalada.
      dist = (abs(f.x) + abs(f.y)) * 1.414;
    } else {
      // REDONDO.
      dist = length(f * 2.0);
    }
    // 5) Cobertura suave del punto.
    a = 1.0 - smoothstep(rr - edge, rr + edge, dist);
    // Tinta blanca separada: umbral 50% (1-bit).
    if (u.hardEdge != 0u) { a = select(0.0, 1.0, a >= 0.5); }
  }

  var outColor = vec4<f32>(inkColor, a);
  if (u.bgAlpha > 0.5) {
    outColor = vec4<f32>(mix(u.bgColor, inkColor, a), 1.0);
  }
  if (inside) {
    textureStore(output, gid.xy, outColor);
  }
}
`;

export const PRESENT_VERTEX_WGSL = /* wgsl */ `
@vertex
fn vs(@builtin(vertex_index) i: u32) -> @builtin(position) vec4<f32> {
  // Triángulo de pantalla completa sin atributos.
  let pos = array<vec2<f32>, 3>(
    vec2<f32>(-1.0, -1.0),
    vec2<f32>(3.0, -1.0),
    vec2<f32>(-1.0, 3.0)
  );
  return vec4<f32>(pos[i], 0.0, 1.0);
}
`;

export const PRESENT_FRAGMENT_WGSL = /* wgsl */ `
@group(0) @binding(0) var output : texture_2d<f32>;

@fragment
fn fs(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
  // Lectura directa: la fila 0 de la storage texture corresponde a la
  // fila superior del lienzo (origen superior izquierdo de WebGPU).
  let c = textureLoad(output, vec2<i32>(i32(pos.x), i32(pos.y)), 0);
  // El lienzo espera alpha premultiplicado.
  return vec4<f32>(c.rgb * c.a, c.a);
}
`;
