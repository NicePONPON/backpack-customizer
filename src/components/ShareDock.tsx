"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

const SMOOTH_EASE: [number, number, number, number] = [0.4, 0, 0.2, 1];
const SHARE_TEXT = "Built for the way you carry. — Computex Systems";

// Visual sizing — keeping these as named constants makes the fan-out math
// (each icon's vertical offset) read clearly.
const TRIGGER_SIZE = 56;
const ITEM_SIZE = 48;
const ITEM_GAP = 12;

type Platform = {
  key: string;
  label: string;
  color: string;
  // iconPath is rendered inside an <svg viewBox=iconViewBox> as a single
  // <path>. Brand glyphs that need multiple paths get pre-merged.
  iconPath: string;
  iconViewBox: string;
  // Either build a real share-URL (Facebook, X, Reddit, WhatsApp) or null
  // for "copy current page URL + open the platform" (Instagram, TikTok —
  // neither offers a public share endpoint).
  shareUrl: ((url: string) => string) | null;
  fallbackUrl?: string;
};

const PLATFORMS: ReadonlyArray<Platform> = [
  {
    key: "whatsapp",
    label: "Share on WhatsApp",
    color: "#25D366",
    iconPath:
      "M16.001 3C9.373 3 4 8.373 4 15c0 2.39.69 4.62 1.88 6.504L4 29l7.668-1.84A11.93 11.93 0 0 0 16.001 27C22.628 27 28 21.627 28 15S22.628 3 16.001 3zm0 21.6c-1.86 0-3.6-.516-5.084-1.41l-.364-.216-4.55 1.092 1.116-4.428-.236-.376A9.555 9.555 0 0 1 6.4 15c0-5.293 4.308-9.6 9.6-9.6 5.293 0 9.6 4.307 9.6 9.6 0 5.292-4.307 9.6-9.6 9.6zm5.51-7.184c-.302-.151-1.787-.882-2.064-.983-.276-.101-.477-.151-.678.151-.201.301-.778.983-.953 1.184-.176.201-.352.227-.654.075-.302-.151-1.275-.47-2.43-1.499-.898-.8-1.504-1.789-1.68-2.09-.176-.302-.019-.464.132-.615.135-.135.302-.352.452-.527.151-.176.201-.302.302-.503.101-.201.05-.377-.025-.527-.075-.151-.678-1.633-.928-2.236-.244-.587-.493-.508-.678-.517-.176-.008-.377-.01-.578-.01a1.11 1.11 0 0 0-.804.377c-.276.301-1.054 1.03-1.054 2.512 0 1.483 1.08 2.916 1.23 3.117.151.201 2.124 3.244 5.146 4.55.72.31 1.281.495 1.719.633.722.23 1.379.198 1.898.12.579-.087 1.787-.73 2.04-1.435.252-.705.252-1.31.176-1.435-.075-.126-.276-.201-.578-.352z",
    iconViewBox: "0 0 32 32",
    shareUrl: (url) =>
      `https://wa.me/?text=${encodeURIComponent(`${SHARE_TEXT} ${url}`)}`,
  },
  {
    key: "facebook",
    label: "Share on Facebook",
    color: "#1877F2",
    iconPath:
      "M22.675 0H1.325C.593 0 0 .593 0 1.325v21.351C0 23.407.593 24 1.325 24H12.82v-9.294H9.692v-3.622h3.128V8.413c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12V24h6.116c.73 0 1.323-.593 1.323-1.325V1.325C24 .593 23.407 0 22.675 0z",
    iconViewBox: "0 0 24 24",
    shareUrl: (url) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  {
    key: "x",
    label: "Share on X",
    color: "#000000",
    iconPath:
      "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zM17.083 19.77h1.83L7.092 4.126H5.117z",
    iconViewBox: "0 0 24 24",
    shareUrl: (url) =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(SHARE_TEXT)}&url=${encodeURIComponent(url)}`,
  },
  {
    key: "reddit",
    label: "Share on Reddit",
    color: "#FF4500",
    iconPath:
      "M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z",
    iconViewBox: "0 0 24 24",
    shareUrl: (url) =>
      `https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(SHARE_TEXT)}`,
  },
  {
    key: "instagram",
    label: "Copy link for Instagram",
    color: "#E4405F",
    iconPath:
      "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12s.014 3.668.072 4.948c.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z",
    iconViewBox: "0 0 24 24",
    shareUrl: null,
    fallbackUrl: "https://www.instagram.com/",
  },
  {
    key: "tiktok",
    label: "Copy link for TikTok",
    color: "#000000",
    iconPath:
      "M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z",
    iconViewBox: "0 0 24 24",
    shareUrl: null,
    fallbackUrl: "https://www.tiktok.com/",
  },
];

// Universal "share / upload" glyph for the collapsed trigger — neutral so
// it doesn't pre-pick a brand color when closed.
const SHARE_TRIGGER_PATH = "M12 4l-7 7h4v6h6v-6h4l-7-7zM5 19h14v2H5z";

export default function ShareDock() {
  const pathname = usePathname();
  // The invoice page already has a fixed share/download bar at the bottom;
  // a second floating element would crowd it on mobile.
  const hidden = pathname?.startsWith("/invoice");

  // Soft entrance ~600ms after first paint so the trigger doesn't fight
  // the hero animation on the home page.
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setMounted(true), 600);
    return () => window.clearTimeout(t);
  }, []);

  // Close on outside click / Escape. Listening on document with a
  // closest() check keeps the menu open when the user clicks anywhere
  // inside the dock (trigger or any platform button).
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && !target.closest("[data-share-dock]")) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Auto-dismiss toast.
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2400);
    return () => window.clearTimeout(t);
  }, [toast]);

  if (hidden) return null;

  const handlePlatformClick = async (p: Platform) => {
    const currentUrl =
      typeof window !== "undefined" ? window.location.href : "";
    if (p.shareUrl) {
      window.open(
        p.shareUrl(currentUrl),
        "_blank",
        "noopener,noreferrer",
      );
    } else {
      // Copy + open fallback for platforms without a public share URL.
      try {
        await navigator.clipboard.writeText(currentUrl);
        const platformName = p.key === "instagram" ? "Instagram" : "TikTok";
        setToast(`Link copied — paste into ${platformName}.`);
      } catch {
        setToast("Couldn't copy automatically. Long-press the URL bar.");
      }
      if (p.fallbackUrl) {
        window.open(p.fallbackUrl, "_blank", "noopener,noreferrer");
      }
    }
    setOpen(false);
  };

  return (
    <div
      data-share-dock
      style={{
        position: "fixed",
        right: "max(20px, env(safe-area-inset-right))",
        bottom: "max(20px, env(safe-area-inset-bottom))",
        width: TRIGGER_SIZE,
        height: TRIGGER_SIZE,
        zIndex: 60,
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateY(0)" : "translateY(8px)",
        transition:
          "opacity 0.6s cubic-bezier(0.4,0,0.2,1), transform 0.6s cubic-bezier(0.4,0,0.2,1)",
      }}
    >
      {/* Fan-out items. Each anchored at the trigger origin and translated
          up by (i+1) * (ITEM_SIZE + ITEM_GAP). The macOS Dock-stack feel
          comes from the staggered scale+opacity rise. */}
      <AnimatePresence>
        {open &&
          PLATFORMS.map((p, i) => {
            const offset = (i + 1) * (ITEM_SIZE + ITEM_GAP);
            return (
              <motion.button
                key={p.key}
                type="button"
                aria-label={p.label}
                onClick={() => handlePlatformClick(p)}
                initial={{ y: 0, scale: 0.4, opacity: 0 }}
                animate={{ y: -offset, scale: 1, opacity: 1 }}
                exit={{ y: 0, scale: 0.4, opacity: 0 }}
                transition={{
                  duration: 0.32,
                  ease: SMOOTH_EASE,
                  delay: i * 0.045,
                }}
                style={{
                  position: "absolute",
                  // Center the smaller item under the wider trigger.
                  left: (TRIGGER_SIZE - ITEM_SIZE) / 2,
                  top: (TRIGGER_SIZE - ITEM_SIZE) / 2,
                  width: ITEM_SIZE,
                  height: ITEM_SIZE,
                  borderRadius: "50%",
                  background: p.color,
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  boxShadow:
                    "0 6px 18px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.18)",
                  padding: 0,
                }}
              >
                <svg
                  viewBox={p.iconViewBox}
                  width={22}
                  height={22}
                  aria-hidden
                  style={{ display: "block" }}
                >
                  <path fill="#fff" d={p.iconPath} />
                </svg>
              </motion.button>
            );
          })}
      </AnimatePresence>

      {/* Trigger */}
      <button
        type="button"
        aria-label={open ? "Close share menu" : "Share this page"}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        style={{
          position: "absolute",
          inset: 0,
          width: TRIGGER_SIZE,
          height: TRIGGER_SIZE,
          borderRadius: "50%",
          background: "rgba(20,20,20,0.85)",
          backdropFilter: "blur(12px) saturate(160%)",
          WebkitBackdropFilter: "blur(12px) saturate(160%)",
          border: "1px solid rgba(255,255,255,0.18)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow:
            "0 8px 24px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.18)",
          cursor: "pointer",
          padding: 0,
          transition: "transform 240ms cubic-bezier(0.4,0,0.2,1)",
          transform: open ? "rotate(45deg)" : "rotate(0deg)",
        }}
      >
        <svg
          viewBox="0 0 24 24"
          width={26}
          height={26}
          aria-hidden
          style={{ display: "block" }}
        >
          <path fill="#fff" d={SHARE_TRIGGER_PATH} />
        </svg>
      </button>

      {/* Toast — sits to the LEFT of the dock so it can't overflow off the
          right edge on narrow phones. */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            transition={{ duration: 0.28, ease: SMOOTH_EASE }}
            role="status"
            style={{
              position: "absolute",
              right: TRIGGER_SIZE + 12,
              bottom: 6,
              whiteSpace: "nowrap",
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: 0.4,
              color: "#fff",
              background: "rgba(20,20,20,0.92)",
              border: "1px solid rgba(255,255,255,0.16)",
              borderRadius: 999,
              padding: "10px 14px",
              boxShadow: "0 6px 18px rgba(0,0,0,0.35)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
            }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
