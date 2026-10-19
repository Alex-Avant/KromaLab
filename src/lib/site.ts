export type ModuleStatus = "operativo" | "calibracion" | "redaccion";

export type Tool = {
  id: string;
  index: string;
  name: string;
  slug: string;
  href?: string;
  spec: string;
  status: ModuleStatus;
  description: string;
  accent: "cyan" | "magenta" | "yellow";
};

export type Guide = {
  id: string;
  index: string;
  title: string;
  slug: string;
  href?: string;
  section: string;
  readTime: string;
  status: ModuleStatus;
};

export const tools: Tool[] = [
  {
    id: "semitonos-dtf",
    index: "01",
    name: "Semitonos DTF",
    slug: "herramientas/semitonos-dtf",
    href: "/herramientas/semitonos-dtf",
    spec: "LPI 10–120 · 4096 px · PNG / TIFF 1-bit",
    status: "operativo",
    description:
      "Síntesis de tramas de semitono calibradas para impresión DTF. Ángulo, forma de punto, curvas y canal de tinta blanca en tiempo real.",
    accent: "cyan",
  },
  {
    id: "separacion-cmyk",
    index: "02",
    name: "Separación CMYK",
    slug: "herramientas/separacion-cmyk",
    spec: "4 canales · ángulos de trama · GCR",
    status: "calibracion",
    description:
      "Separación de cuatro canales con ángulos de trama compensados para reducir moiré. Módulo en calibración.",
    accent: "magenta",
  },
  {
    id: "ajuste-color-dtf",
    index: "03",
    name: "Ajuste de color DTF",
    slug: "herramientas/ajuste-color-dtf",
    spec: "ICC · curvas de transferencia · gamut",
    status: "calibracion",
    description:
      "Corrección de color previa a transferencia: curvas, balance de tinta y simulación de soporte. Módulo en calibración.",
    accent: "yellow",
  },
  {
    id: "mockups",
    index: "04",
    name: "Simulación de prenda",
    slug: "herramientas/simulacion-prenda",
    spec: "Prenda negra / blanca · vista de prueba",
    status: "calibracion",
    description:
      "Previsualización del resultado sobre textura de prenda real, con fondo intercambiable. Módulo en calibración.",
    accent: "cyan",
  },
];

export const guides: Guide[] = [
  {
    id: "semitonos-para-dtf",
    index: "01",
    title: "Semitonos para DTF: valores de referencia",
    slug: "guias/semitonos-para-dtf",
    href: "/guias/semitonos-para-dtf",
    section: "TRAMA",
    readTime: "6 min",
    status: "operativo",
  },
  {
    id: "calibracion-lpi",
    index: "02",
    title: "Calibración de LPI por tipo de prenda",
    slug: "guias/calibracion-lpi",
    section: "LPI",
    readTime: "4 min",
    status: "redaccion",
  },
  {
    id: "errores-comunes",
    index: "03",
    title: "Errores comunes en tramas DTF",
    slug: "guias/errores-comunes",
    section: "DIAGNÓSTICO",
    readTime: "5 min",
    status: "redaccion",
  },
];

export const nav = [
  { label: "Herramientas", href: "/#instrumentos" },
  { label: "Guías", href: "/#guias" },
  { label: "Pro", href: "/pro" },
] as const;

export const statusLabel: Record<ModuleStatus, string> = {
  operativo: "OPERATIVO",
  calibracion: "EN CALIBRACIÓN",
  redaccion: "EN REDACCIÓN",
};

export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
