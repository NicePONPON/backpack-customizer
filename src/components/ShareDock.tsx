"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import {
  WHATSAPP_ICON_PATH,
  FACEBOOK_ICON_PATH,
  X_ICON_PATH,
  REDDIT_ICON_PATH,
  INSTAGRAM_ICON_PATH,
  TIKTOK_ICON_PATH,
} from "./ShareDockIcons";

const SMOOTH_EASE: [number, number, number, number] = [0.4, 0, 0.2, 1];

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

// Universal "share / upload" glyph for the collapsed trigger — neutral so
// it doesn't pre-pick a brand color when closed.
const SHARE_TRIGGER_PATH = "M12 4l-7 7h4v6h6v-6h4l-7-7zM5 19h14v2H5z";

export default function ShareDock() {
  const t = useTranslations("share");
  const pathname = usePathname();
  // The invoice page already has a fixed share/download bar at the bottom;
  // a second floating element would crowd it on mobile.
  const hidden = pathname?.startsWith("/invoice");

  // Soft entrance ~600ms after first paint so the trigger doesn't fight
  // the hero animation on the home page.
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const PLATFORMS: ReadonlyArray<Platform> = [
    {
      key: "whatsapp",
      label: t("platformWhatsapp"),
      color: "#25D366",
      iconPath: WHATSAPP_ICON_PATH,
      iconViewBox: "0 0 32 32",
      shareUrl: (url) =>
        `https://wa.me/?text=${encodeURIComponent(`${t("shareTagline")} ${url}`)}`,
    },
    {
      key: "facebook",
      label: t("platformFacebook"),
      color: "#1877F2",
      iconPath: FACEBOOK_ICON_PATH,
      iconViewBox: "0 0 24 24",
      shareUrl: (url) =>
        `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    },
    {
      key: "x",
      label: t("platformX"),
      color: "#000000",
      iconPath: X_ICON_PATH,
      iconViewBox: "0 0 24 24",
      shareUrl: (url) =>
        `https://twitter.com/intent/tweet?text=${encodeURIComponent(t("shareTagline"))}&url=${encodeURIComponent(url)}`,
    },
    {
      key: "reddit",
      label: t("platformReddit"),
      color: "#FF4500",
      iconPath: REDDIT_ICON_PATH,
      iconViewBox: "0 0 24 24",
      shareUrl: (url) =>
        `https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(t("shareTagline"))}`,
    },
    {
      key: "instagram",
      label: t("platformInstagram"),
      color: "#E4405F",
      iconPath: INSTAGRAM_ICON_PATH,
      iconViewBox: "0 0 24 24",
      shareUrl: null,
      fallbackUrl: "https://www.instagram.com/",
    },
    {
      key: "tiktok",
      label: t("platformTiktok"),
      color: "#000000",
      iconPath: TIKTOK_ICON_PATH,
      iconViewBox: "0 0 24 24",
      shareUrl: null,
      fallbackUrl: "https://www.tiktok.com/",
    },
  ];

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
    const timer = window.setTimeout(() => setToast(null), 2400);
    return () => window.clearTimeout(timer);
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
        const platformName =
          p.key === "instagram" ? t("platformInstagramName") : t("platformTiktokName");
        setToast(t("toastCopiedTo", { platform: platformName }));
      } catch {
        setToast(t("toastCopyFailed"));
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
        aria-label={open ? t("triggerClose") : t("triggerOpen")}
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
