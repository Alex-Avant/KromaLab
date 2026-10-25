# KromaLab

Editor de tramas de semitono (halftone) para impresión DTF — todo en tu navegador, sin servidores, sin subir nada.

KromaLab es un laboratorio de **tramas de semitono (halftone)** diseñado para impresión **DTF (Direct to Film)** y otras aplicaciones de impresión. Permite generar tramas de alta calidad calibradas por LPI, ángulo, forma de punto y contraste, y exportarlas como PNG o TIFF 1-bit listas para imprimir.

## Características

- **Editor de tramas en tiempo real:** ajusta LPI, ángulo, forma de punto, contraste, gamma y umbral; ve el resultado al instante.
- **100% en el navegador:** el motor de trama funciona localmente (WebGPU con fallback a WebGL2). Tu imagen nunca sale de tu dispositivo.
- **Exportación a resolución escalable:** exporta a resolución completa en PNG o TIFF 1-bit (bits), con soporte de escala para impresoras de alta resolución.
- **Divisor ORIGINAL / TRAMA:** compara la imagen original con el resultado de la trama en tiempo real.
- **Lupa y zoom:** inspecciona los detalles de la trama con zoom y lupa.
- **Tema oscuro** tipo instrumento de medida, diseñado para entornos de trabajo profesional.
- **Tecnología:** Next.js, React 19, Zustand, WebGPU/WebGL2, shaders WGSL/GLSL.

## Inicio rápido

### Requisitos

- Node.js 20+
- Un navegador moderno con soporte para **WebGPU** o **WebGL2** (Chrome, Edge, Safari)

### Desarrollo local

```bash
git clone https://github.com/anomalyco/KromaLab.git
cd KromaLab
npm install
npm run dev
```

Abre `http://localhost:3000` en tu navegador.

### Scripts disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo en `http://localhost:3001` |
| `npm run build` | Construcción de producción para producción |
| `npm start` | Servidor de producción (requiere `npm run build` previo) |
| `npm run lint` | Ejecuta ESLint |
| `npm test` | Ejecuta la suite de pruebas unitarias |
| `npm run test:e2e` | Ejecuta pruebas de extremo a extremo en Playwright |

## Cómo funciona

### Editor de semitonos

1. **Carga una imagen** en el editor (PNG, JPG o WEBP, hasta 4096 px).
2. **Ajusta la trama:** frecuencia (LPI), ángulo, forma de punto, contraste, gamma y umbral mínimo.
3. **Vista previa en tiempo real:** la trama se actualiza a medida que arrastras los sliders.
4. **Divisor original / trama:** compara la imagen original con el resultado lado a lado.
5. **Lupa:** mantén `Alt` presionado para ver un zoom de la zona bajo el cursor.
6. **Exporta** (`⌘E`) en PNG (con transparencia) o TIFF 1-bit a resolución completa (hasta 8192 px).

### Motores de renderizado

KromaLab utiliza el mejor renderizador disponible en tu navegador:

- **WebGPU** (preferido): compute shader WGSL, máximo rendimiento.
- **WebGL2:** fallback automático si WebGPU no está disponible.

Si el navegador no soporta ninguna de las dos, la exportación no estará disponible.

### Modos de procesamiento

- **Luminancia (default):** la trama se genera a partir del brillo percibido de la imagen. Es el modo estándar para DTF.
- **Blanco:** utiliza la luminancia para generar una trama de canal de tinta blanca separada (útil para impresión en prendas oscuras).
- **Color original vs escala de grises:** el modo de color preserva los colores originales de la imagen en los puntos de la trama; el modo escala de grises convierte a escala de grises primero.

## Estructura del proyecto

```
kromalab/
├── src/
│   ├── app/                 # Rutas de Next.js (App Router)
│   │   ├── herramientas/semitonos-dtf/  # Editor principal
│   │   ├── guias/              # Guías de uso
│   │   └── pro/                # Página Pro
│   ├── components/
│   │   ├── editor/             # Componentes del editor (canvas, controles, sliders)
│   │   ├── editor/controls/    # Controles individuales (LPI, ángulo, forma, etc.)
│   │   └── site/               # Componentes del sitio (header, footer, CMYK)
│   ├── lib/
│   │   └── halftone/           # Motor de semitonos (core)
│   │       ├── engine-core.ts  # Núcleo WebGL2
+│   │       ├── webgpu-renderer.ts # Renderizador WebGPU
│   │       ├── renderer.ts     # Fábrica de renderizadores
│   │       ├── wgsl.ts         # Shader compute (WebGPU)
│   │       ├── glsl.ts         # Shader GLSL (WebGL2)
│   │       ├── worker-client.ts, worker.ts
│   │       ├── worker-client.ts # Cliente del motor (worker / inline)
│   │       ├── load-image.ts   # Carga y decodificación de imágenes
│   │       ├── types.ts        # Tipos y constantes
│   │       ├── types.ts        # Tipos y constantes
│   │       ├── engine-core.ts  # Núcleo WebGL2
│   │       ├── webgpu-renderer.ts # Renderizador WebGPU
│   │       ├── renderer.ts     # Fábrica de renderizadores
│   │       ├── wgsl.ts         # Shader compute (WebGPU)
│   │       ├── glsl.ts         # Shader GLSL (WebGL2)
│   │       ├── worker-client.ts # Cliente del motor (worker / inline)
│   │       ├── worker.ts       # Lógica del worker
│   │       ├── load-image.ts   # Carga y decodificación de imágenes
│   │       ├── types.ts        # Tipos y constantes
│   │       ├── histogram.ts    # Cálculo de histograma
│   │       ├── export-render.ts # Exportación por tiles
│   │       ├── export-render.ts # Exportación por tiles
│   │       └── tiff.ts         # Escritor TIFF 1-bit
│   ├── store/                  # Zustand store del estado del editor
│   └── app/                    # App Router de Next.js
├── public/
│   └── ...
└── ...
```

## Decisiones de diseño

- **Sin servidor:** todo el procesamiento ocurre en el navegador del usuario. Las imágenes nunca salen de tu dispositivo.
- **Worker dedicados:** el motor de trama corre en un Web Worker para no bloquear la interfaz durante el render.
- **Fallback automático:** si tu navegador no soporta WebGPU, se usa WebGL2 automáticamente.
- **Exportación por tiles:** las exportaciones de alta resolución se procesan por tiles para evitar límites de memoria en GPUs antiguas.

## Roadmap / Estado

Este es un proyecto en desarrollo activo. Las funcionalidades principales (editor, exportación PNG/TIFF, fórmulas) ya están funcionales. Las áreas de mejora incluyen más formatos de exportación, más formas de punto y mejoras en la interfaz.

## Licencia

MIT.

## Créditos

Construido con Next.js, React, Zustand, Tailwind CSS y las librerías WebGPU/WebGL2 nativas del navegador.

---

¿Tienes preguntas o sugerencias? Abre un issue en este repositorio o contáctanos a través de GitHub Issues.