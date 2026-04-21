import type {
  EmbroideryColor,
  EmbroideryFont,
  EmbroideryLineSize,
  EmbroideryPosition,
} from "@/components/EmbroideryControls";

export type DesignState = {
  size: "14" | "16";
  colors: Record<string, string>;
  embroideryLines: [string, string];
  embroideryLineCount: 1 | 2;
  embroideryColor: EmbroideryColor;
  embroideryPosition: EmbroideryPosition;
  embroideryFont: EmbroideryFont;
  embroideryLineSizes: [EmbroideryLineSize, EmbroideryLineSize];
  zipperUpgrade: boolean;
  zipperColor: string;
};

// URL-safe base64 so the param survives WhatsApp / email link handling.
function toBase64Url(s: string): string {
  const b64 = typeof window === "undefined"
    ? Buffer.from(s, "utf8").toString("base64")
    : window.btoa(unescape(encodeURIComponent(s)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string): string {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  return typeof window === "undefined"
    ? Buffer.from(b64, "base64").toString("utf8")
    : decodeURIComponent(escape(window.atob(b64)));
}

export function encodeDesign(state: DesignState): string {
  return toBase64Url(JSON.stringify(state));
}

export function decodeDesign(param: string | null | undefined): DesignState | null {
  if (!param) return null;
  try {
    const parsed = JSON.parse(fromBase64Url(param));
    if (
      parsed &&
      (parsed.size === "14" || parsed.size === "16") &&
      parsed.colors && typeof parsed.colors === "object"
    ) {
      return parsed as DesignState;
    }
    return null;
  } catch {
    return null;
  }
}
