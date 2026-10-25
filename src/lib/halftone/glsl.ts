/* ------------------------------------------------------------------ */
/* GLSL del motor de semitonos — escrito a mano y documentado.         */
/*                                                                     */
/* Pipeline: por cada fragmento se muestrea la imagen original, se     */
/* aplica la curva de tinta (gamma → contraste → umbral → inversión),  */
/* se rota el espacio a la rejilla de trama (ángulo) y se evalúa la    */
/* forma de punto dentro de su célula. La salida es tinta blanca con   */
/* canal alfa (lista para composición sobre prenda o película DTF).    */
/*                                                                     */
/* Trama AM (modulación de amplitud): el radio del punto es           */
/* proporcional a la raíz de la cobertura — área ∝ tinta.              */
/* ------------------------------------------------------------------ */

import { DOT_RADIUS_SCALE } from "@/lib/halftone/types";

export const VERTEX_SOURCE = /* glsl */ `#version 300 es
// Triángulo de pantalla completa sin atributos (gl_VertexID).
// Cubre el viewport en un solo draw call.
void main() {
  vec2 pos = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(pos * 2.0 - 1.0, 0.0, 1.0);
}
`;

export const FRAGMENT_SOURCE = /* glsl */ `#version 300 es
precision highp float;

// --- Uniforms ---------------------------------------------------------
uniform sampler2D uImage;      // imagen original (textura sin filtro de trama)
uniform vec2      uResolution; // tamaño del lienzo de SALIDA en px
uniform vec2      uTileOrigin; // origen del tile en px (0,0 en render completo)
uniform float     uCellSize;   // px por célula de trama (DPI / LPI)
uniform float     uAngle;      // ángulo de trama en radianes
uniform float     uContrast;   // contraste de la curva de tinta [-1, 1]
uniform float     uGamma;      // gamma de luminancia
uniform float     uMinThreshold; // umbral mínimo de tinta [0, 1]
uniform bool      uInvert;     // inversión positivo/negativo
uniform int       uShape;      // 0=round 1=ellipse 2=diamond 3=line
uniform bool      uHardEdge;   // salida 1-bit (canal de tinta separada)
uniform vec3      uBgColor;    // color de fondo de la vista de prueba
uniform float     uBgAlpha;    // 1 = fondo opaco, 0 = transparente
uniform vec3      uDotColor;   // color de la tinta (blanco DTF)

out vec4 fragColor;

// Luminancia perceptual (Rec. 709).
float luma(vec3 c) {
  return dot(c, vec3(0.2126, 0.7152, 0.0722));
}

void main() {
  // Coordenadas absolutas: suma del origen del tile + posición del fragmento.
  vec2 px = gl_FragCoord.xy + uTileOrigin;

  // 1) Muestra de la imagen original.
  vec3 src = texture(uImage, px / uResolution).rgb;
  float lum = luma(src);

  // 2) Curva de tinta.
  float ink = pow(clamp(lum, 0.0, 1.0), uGamma);
  ink = 0.5 + (ink - 0.5) * (1.0 + uContrast);
  ink = clamp(ink, 0.0, 1.0);
  if (uInvert) ink = 1.0 - ink;

  // Cobertura de tinta blanca: la oscuridad de la imagen genera punto.
  float coverage = 1.0 - ink;
  // Umbral mínimo: recorta puntos residuales en altas luces (ruido).
  coverage = (coverage - uMinThreshold) / max(1.0 - uMinThreshold, 1e-4);
  coverage = clamp(coverage, 0.0, 1.0);

  // 3) Rejilla de células rotada por el ángulo de trama.
  float c = cos(uAngle);
  float s = sin(uAngle);
  vec2 p = mat2(c, -s, s, c) * px;
  vec2 f = fract(p / uCellSize) - 0.5; // [-0.5, 0.5] dentro de la célula

  // Suavizado de borde: ~1.5 px nominales, normalizado a la célula.
  float edge = 1.5 / max(uCellSize, 2.0);

  if (uShape == 3) {
    // LÍNEA: banda horizontal de altura ∝ cobertura.
    float hh = 0.5 * coverage;
    float band = abs(f.y);
    float a = 1.0 - smoothstep(hh - edge, hh + edge, band);
    if (uHardEdge) a = (band <= hh) ? 1.0 : 0.0;
    fragColor = vec4(uDotColor, a);
    if (uBgAlpha > 0.5) {
      fragColor.rgb = mix(uBgColor, uDotColor, a);
      fragColor.a = 1.0;
    }
    return;
  }

  // Área del punto ∝ cobertura, compensada por la geometría.
  float radiusScale = ${DOT_RADIUS_SCALE.round.toFixed(9)};
  if (uShape == 1) radiusScale = ${DOT_RADIUS_SCALE.ellipse.toFixed(9)};
  else if (uShape == 2) radiusScale = ${DOT_RADIUS_SCALE.diamond.toFixed(1)};
  float rr = radiusScale * sqrt(coverage);

  // 4) Distancia normalizada al centro de la célula según la forma.
  float dist;
  if (uShape == 1) {
    // ELIPSE: comprimida en Y → punto en cadena a lo largo del ángulo.
    dist = length(f * vec2(2.0, 3.64));
  } else if (uShape == 2) {
    // DIAMANTE: distancia L1, escalada para equiparar área al redondo.
    dist = (abs(f.x) + abs(f.y)) * 1.414;
  } else {
    // REDONDO.
    dist = length(f * 2.0);
  }

  // 5) Cobertura suave del punto.
  float a = 1.0 - smoothstep(rr - edge, rr + edge, dist);

  // Tinta blanca separada: umbral 50% sobre la trama continua (1-bit).
  if (uHardEdge) a = (a >= 0.5) ? 1.0 : 0.0;

  fragColor = vec4(uDotColor, a);
  if (uBgAlpha > 0.5) {
    fragColor.rgb = mix(uBgColor, uDotColor, a);
    fragColor.a = 1.0;
  }
}
`;
