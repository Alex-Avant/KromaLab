import type { Metadata } from "next";

import { EditorShell } from "@/components/editor/editor-shell";

export const metadata: Metadata = {
  title: "Editor de semitonos DTF",
  description:
    "Síntesis de tramas de semitono calibradas para impresión DTF: LPI, ángulo, forma de punto y canal de tinta blanca en tiempo real. 100% en tu navegador.",
};

export default function SemitonosDtfPage() {
  return <EditorShell />;
}
