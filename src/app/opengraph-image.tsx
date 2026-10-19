import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt =
  "KromaLab — Laboratorio de precisión para impresión digital";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const clash = await readFile(
    join(process.cwd(), "src/fonts/clash-display/clash-display-700.ttf")
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0B0D12",
          color: "#F2F4F8",
          padding: 64,
          fontFamily: "Clash Display",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 16,
            border: "1px solid #272D3A",
            borderRadius: 6,
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 44,
            left: 44,
            display: "flex",
          }}
        >
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <circle cx="14" cy="14" r="10" stroke="#F2F4F8" strokeWidth="2" />
            <path
              d="M14 1v6M14 21v6M1 14h6M21 14h6"
              stroke="#22D3EE"
              strokeWidth="2"
            />
            <path
              d="M14 5v18M5 14h18"
              stroke="#F2F4F8"
              strokeWidth="2"
            />
          </svg>
        </div>
        <div
          style={{
            position: "absolute",
            top: 44,
            right: 44,
            display: "flex",
          }}
        >
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <circle cx="14" cy="14" r="10" stroke="#F2F4F8" strokeWidth="2" />
            <path
              d="M14 1v6M14 21v6M1 14h6M21 14h6"
              stroke="#22D3EE"
              strokeWidth="2"
            />
          </svg>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 18,
              fontSize: 24,
              letterSpacing: 6,
            }}
          >
            <span
              style={{
                display: "flex",
                width: 14,
                height: 14,
                background: "#22D3EE",
              }}
            />
            <span>KROMALAB</span>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 92,
              fontWeight: 700,
              letterSpacing: -2,
              lineHeight: 1.02,
            }}
          >
            <span>Laboratorio de precisión</span>
            <span>para impresión digital.</span>
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 26,
              color: "#98A2B3",
              letterSpacing: 1,
            }}
          >
            Semitonos DTF calibrados - 100% en tu navegador - sin subidas
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", gap: 2, width: "100%" }}>
            {["#22D3EE", "#F43FA0", "#FACC15", "#F2F4F8"].map((c) => (
              <div
                key={c}
                style={{
                  flex: 1,
                  height: 10,
                  background: c,
                  borderRadius: 2,
                  display: "flex",
                }}
              />
            ))}
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 20,
              color: "#98A2B3",
              letterSpacing: 4,
            }}
          >
            <span>LPI 10-120 / 4096 PX</span>
            <span>BUILD 0.1.0</span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: "Clash Display",
          data: clash,
          weight: 700,
          style: "normal",
        },
      ],
    }
  );
}
