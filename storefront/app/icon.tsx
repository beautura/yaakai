import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { createElement } from "react";

export const size = { width: 192, height: 192 };
export const contentType = "image/png";

export default async function Icon() {
  const logo = await readFile(join(process.cwd(), "public", "images", "yaakai", "yaakai-logo.png"));
  return new ImageResponse(
    <div style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", background: "#fff8e9" }}>
      {createElement("img", { src: `data:image/png;base64,${logo.toString("base64")}`, width: 176, height: 100, alt: "Yaakai", style: { objectFit: "contain" } })}
    </div>,
    size,
  );
}