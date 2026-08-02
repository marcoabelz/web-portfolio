import { ImageResponse } from "next/og";

import {
  SHARED_SOCIAL_IMAGE,
  SOCIAL_IMAGE_IDENTITY,
} from "@/lib/social-image";

export const alt = SHARED_SOCIAL_IMAGE.alt;
export const size = {
  width: SHARED_SOCIAL_IMAGE.width,
  height: SHARED_SOCIAL_IMAGE.height,
};
export const contentType = SHARED_SOCIAL_IMAGE.type;

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#f7f7f4",
          color: "#0f172a",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            width: 88,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "56px 0",
            background: "#0f172a",
            color: "#f7f7f4",
          }}
        >
          <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: "0.18em" }}>
            {SOCIAL_IMAGE_IDENTITY.mark}
          </span>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "0.12em",
            }}
          >
            <span>{SOCIAL_IMAGE_IDENTITY.category}</span>
            <div style={{ width: 1, height: 34, display: "flex", background: "#64748b" }} />
            <span>{SOCIAL_IMAGE_IDENTITY.year}</span>
          </div>
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "62px 72px 56px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div style={{ width: 54, height: 5, display: "flex", background: "#2563eb" }} />
            <span
              style={{
                color: "#475569",
                fontSize: 18,
                fontWeight: 700,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
              }}
            >
              {SOCIAL_IMAGE_IDENTITY.eyebrow}
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", maxWidth: 920 }}>
            <div style={{ fontSize: 76, fontWeight: 750, letterSpacing: "-0.055em", lineHeight: 1.02 }}>
              {SOCIAL_IMAGE_IDENTITY.name}
            </div>
            <div
              style={{
                marginTop: 24,
                color: "#2563eb",
                fontSize: 34,
                fontWeight: 700,
                letterSpacing: "-0.025em",
              }}
            >
              {SOCIAL_IMAGE_IDENTITY.role}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              borderTop: "2px solid #cbd5e1",
              paddingTop: 26,
            }}
          >
            <div
              style={{
                maxWidth: 760,
                color: "#334155",
                fontSize: 24,
                lineHeight: 1.35,
              }}
            >
              {SOCIAL_IMAGE_IDENTITY.description}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                color: "#475569",
                fontSize: 16,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              <span>{SOCIAL_IMAGE_IDENTITY.location}</span>
              <div
                style={{
                  width: 7,
                  height: 7,
                  display: "flex",
                  borderRadius: 999,
                  background: "#2563eb",
                }}
              />
              <span>{SOCIAL_IMAGE_IDENTITY.country}</span>
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
