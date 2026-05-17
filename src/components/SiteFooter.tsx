"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useTheme } from "@/lib/ThemeContext";

type Props = {
  companyName?: string;
  invert?: boolean;
};

const INSTAGRAM_PROFILE = "https://www.instagram.com/computexsystems.co";

type SharePlatform = {
  key: string;
  label: string;
  color: string;
  icon: React.ReactNode;
  buildUrl: (designUrl: string) => string | null;
};

function InstagramIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function WhatsAppIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.558 4.116 1.535 5.845L.057 23.929l6.224-1.635A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.9a9.9 9.9 0 01-5.031-1.375l-.361-.214-3.741.981.999-3.648-.235-.374A9.86 9.86 0 012.1 12C2.1 6.533 6.533 2.1 12 2.1c5.467 0 9.9 4.433 9.9 9.9 0 5.467-4.433 9.9-9.9 9.9z"/>
    </svg>
  );
}

function FacebookIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}

function XIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  );
}

export default function SiteFooter({ companyName, invert }: Props) {
  const t = useTranslations("footer");
  const { theme } = useTheme();
  const company = companyName ?? t("defaultCompany");
  const isLight = invert !== undefined ? invert : theme === "light";

  const [designShareUrl, setDesignShareUrl] = useState<string | null>(null);
  const [copyToast, setCopyToast] = useState(false);

  // Read saved design from localStorage (set by customize page on every change).
  useEffect(() => {
    try {
      const saved = localStorage.getItem("computex_saved_design");
      if (saved) {
        setDesignShareUrl(
          `${window.location.origin}/customize?d=${encodeURIComponent(saved)}`
        );
      }
    } catch { /* localStorage unavailable */ }
  }, []);

  const textColor = isLight ? "rgba(0,0,0,0.45)" : "rgba(255,255,255,0.45)";
  const iconColor = isLight ? "rgba(0,0,0,0.45)" : "rgba(255,255,255,0.45)";
  const iconHoverColor = isLight ? "rgba(0,0,0,0.9)" : "rgba(255,255,255,0.9)";
  const dividerColor = isLight ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)";

  const SHARE_PLATFORMS: SharePlatform[] = [
    {
      key: "instagram",
      label: "Share on Instagram",
      color: "#E4405F",
      icon: <InstagramIcon size={18} />,
      buildUrl: () => null, // no URL share API — uses Web Share or copy
    },
    {
      key: "whatsapp",
      label: "Share on WhatsApp",
      color: "#25D366",
      icon: <WhatsAppIcon size={18} />,
      buildUrl: (url) =>
        `https://wa.me/?text=${encodeURIComponent(`Check out my custom Computex backpack! ${url}`)}`,
    },
    {
      key: "facebook",
      label: "Share on Facebook",
      color: "#1877F2",
      icon: <FacebookIcon size={18} />,
      buildUrl: (url) =>
        `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    },
    {
      key: "x",
      label: "Share on X",
      color: isLight ? "#111" : "#fff",
      icon: <XIcon size={18} />,
      buildUrl: (url) =>
        `https://twitter.com/intent/tweet?text=${encodeURIComponent("Check out my custom Computex backpack design!")}&url=${encodeURIComponent(url)}`,
    },
  ];

  const handleShare = async (p: SharePlatform) => {
    if (!designShareUrl) return;
    if (p.key === "instagram") {
      const nav = navigator as Navigator & {
        share?: (data: { url?: string; title?: string; text?: string }) => Promise<void>;
      };
      if (nav.share) {
        try {
          await nav.share({
            title: "My Custom Computex Backpack",
            text: "Check out my custom backpack design! @computexsystems.co",
            url: designShareUrl,
          });
          return;
        } catch { /* user cancelled */ }
      }
      // Desktop fallback: copy link
      try {
        await navigator.clipboard.writeText(designShareUrl);
        setCopyToast(true);
        setTimeout(() => setCopyToast(false), 2500);
      } catch { /* clipboard unavailable */ }
      window.open(INSTAGRAM_PROFILE, "_blank", "noopener,noreferrer");
      return;
    }
    const url = p.buildUrl(designShareUrl);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <footer
      style={{
        width: "100%",
        maxWidth: 720,
        margin: "0 auto",
        textAlign: "center",
        marginTop: 16,
        color: textColor,
        fontSize: 12,
        lineHeight: 1.6,
        letterSpacing: 0.3,
        transition: "color 0.5s ease",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 16,
      }}
    >
      {/* Share your design row — only visible after user has customized */}
      {designShareUrl && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <p style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: textColor, margin: 0 }}>
            Share your design
          </p>
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            {SHARE_PLATFORMS.map((p) => (
              <button
                key={p.key}
                onClick={() => handleShare(p)}
                aria-label={p.label}
                title={p.label}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 4,
                  color: iconColor,
                  display: "inline-flex",
                  alignItems: "center",
                  transition: "color 0.2s ease, transform 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = p.color;
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = iconColor;
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                {p.icon}
              </button>
            ))}
          </div>
          {copyToast && (
            <p style={{ fontSize: 11, color: "#E4405F", margin: 0, letterSpacing: 0.3 }}>
              Link copied — paste it in your Instagram post!
            </p>
          )}
        </div>
      )}

      {/* Divider */}
      <div style={{ width: 40, height: 1, background: dividerColor }} />

      {/* Follow us row */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
        <p style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: textColor, margin: 0 }}>
          Follow us
        </p>
        <a
          href={INSTAGRAM_PROFILE}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Follow us on Instagram"
          style={{ color: iconColor, display: "inline-flex", alignItems: "center", transition: "color 0.2s ease, transform 0.2s ease" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "#E4405F";
            e.currentTarget.style.transform = "translateY(-2px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = iconColor;
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          <InstagramIcon size={20} />
        </a>
      </div>

      {/* Divider */}
      <div style={{ width: 40, height: 1, background: dividerColor }} />

      {/* Copyright */}
      <div style={{ color: textColor }}>
        <div>{t("copyright", { company })}</div>
        <div>{t("tagline")}</div>
      </div>
    </footer>
  );
}
