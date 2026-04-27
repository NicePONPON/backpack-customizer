"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

// International form, no leading 0, no spaces, no plus.
// Source: +886 0933 857 545 → strip leading 0 of national prefix.
const WA_NUMBER = "886933857545";
const WA_PREFILL = "Hi — I'd like to ask about the backpack.";

export default function WhatsAppButton() {
  const pathname = usePathname();
  // The invoice page already has a fixed share/download bar at the bottom;
  // a second floating element would crowd it on mobile.
  const hidden = pathname?.startsWith("/invoice");

  // Soft entrance ~600ms after first paint so the button doesn't fight the
  // hero animation on the home page.
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setVisible(true), 600);
    return () => window.clearTimeout(t);
  }, []);

  if (hidden) return null;

  const href = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(
    WA_PREFILL,
  )}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      style={{
        position: "fixed",
        right: "max(20px, env(safe-area-inset-right))",
        bottom: "max(20px, env(safe-area-inset-bottom))",
        width: 56,
        height: 56,
        borderRadius: "50%",
        background: "#25D366",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow:
          "0 8px 24px rgba(0,0,0,0.35), 0 2px 6px rgba(37,211,102,0.4)",
        zIndex: 60,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(8px)",
        transition:
          "opacity 0.6s cubic-bezier(0.4,0,0.2,1), transform 0.6s cubic-bezier(0.4,0,0.2,1)",
        cursor: "pointer",
      }}
    >
      <svg
        viewBox="0 0 32 32"
        width="30"
        height="30"
        aria-hidden
        style={{ display: "block" }}
      >
        <path
          fill="#fff"
          d="M16.001 3C9.373 3 4 8.373 4 15c0 2.39.69 4.62 1.88 6.504L4 29l7.668-1.84A11.93 11.93 0 0 0 16.001 27C22.628 27 28 21.627 28 15S22.628 3 16.001 3zm0 21.6c-1.86 0-3.6-.516-5.084-1.41l-.364-.216-4.55 1.092 1.116-4.428-.236-.376A9.555 9.555 0 0 1 6.4 15c0-5.293 4.308-9.6 9.6-9.6 5.293 0 9.6 4.307 9.6 9.6 0 5.292-4.307 9.6-9.6 9.6zm5.51-7.184c-.302-.151-1.787-.882-2.064-.983-.276-.101-.477-.151-.678.151-.201.301-.778.983-.953 1.184-.176.201-.352.227-.654.075-.302-.151-1.275-.47-2.43-1.499-.898-.8-1.504-1.789-1.68-2.09-.176-.302-.019-.464.132-.615.135-.135.302-.352.452-.527.151-.176.201-.302.302-.503.101-.201.05-.377-.025-.527-.075-.151-.678-1.633-.928-2.236-.244-.587-.493-.508-.678-.517-.176-.008-.377-.01-.578-.01a1.11 1.11 0 0 0-.804.377c-.276.301-1.054 1.03-1.054 2.512 0 1.483 1.08 2.916 1.23 3.117.151.201 2.124 3.244 5.146 4.55.72.31 1.281.495 1.719.633.722.23 1.379.198 1.898.12.579-.087 1.787-.73 2.04-1.435.252-.705.252-1.31.176-1.435-.075-.126-.276-.201-.578-.352z"
        />
      </svg>
    </a>
  );
}
