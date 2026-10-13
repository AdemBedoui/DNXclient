import { ImageResponse } from "next/og"

export const size = { width: 180, height: 180 }
export const contentType = "image/png"

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0b0e18" }}>
        <svg width="132" height="132" viewBox="0 0 32 32">
          <path d="M16 3.5 27 9.8v12.4L16 28.5 5 22.2V9.8Z" fill="none" stroke="#5ee6f0" strokeWidth="1.4" opacity=".55" />
          <path d="M16 8.5 22.6 12.3v7.4L16 23.5 9.4 19.7v-7.4Z" fill="rgba(94,230,240,.15)" stroke="#5ee6f0" strokeWidth="1.4" />
          <circle cx="16" cy="16" r="2.6" fill="#5ee6f0" />
        </svg>
      </div>
    ),
    size,
  )
}
