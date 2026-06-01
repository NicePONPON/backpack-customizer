"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import FrontSVG from "@/components/FrontSVG";
import BackSVG from "@/components/BackSVG";
import PngOverlayLayer from "@/components/PngOverlayLayer";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import SaveDesignModal from "@/components/SaveDesignModal";
import CommunityGallery from "@/components/CommunityGallery";
import ZipperPullControls, { ZIPPER_COLORS } from "@/components/ZipperPullControls";
import {
  FRONT_CALIBRATION,
  BACK_CALIBRATION,
  BACK_SVG_TRANSFORM,
  ZIPPER_CALIBRATION,
} from "@/lib/overlayCalibration";
import { COLOR_GROUPS } from "@/lib/bagReference";
import { decodeDesign, encodeDesign } from "@/lib/invoiceSerialization";
import type { EmbroideryColor, EmbroideryFont, EmbroideryPosition, EmbroideryLineSize } from "@/components/EmbroideryControls";
import BagDimensionGuides from "@/components/BagDimensionGuides";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { designFingerprint } from "@/lib/designFingerprint";
import { useTheme } from "@/lib/ThemeContext";
import ArrowIcon from "@/components/ArrowIcon";
import ScrollNav from "@/components/ScrollNav";

const FRONT_VIEWBOX = { w: 992.13, h: 992.13 };
const BACK_VIEWBOX = { w: 622.13, h: 881.02 };
const BASE_W = 420;
const SIZE_SCALE: Record<"14" | "16", number> = { "14": 14 / 16, "16": 1 };

function useWindowWidth() {
  const [w, setW] = useState(375);
  useEffect(() => {
    setW(window.innerWidth);
    const handler = () => setW(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return w;
}

const ALL_GROUPS = [
  "FRONT_BACK_SIDE", "FRONT_MAIN_BOTTOM", "FRONT_MAIN_TOP",
  "BACK_MAIN", "BACK_STRAP", "BAND", "BOTTOM", "SIDE_PANEL", "SIDE",
] as const;

export default function StudioPage() {
  const [selectedPart, setSelectedPart] = useState<string | null>(null);
  const [colors, setColors] = useState<Record<string, string>>({});
  const [size, setSize] = useState<"14" | "16">("14");
  const [zipperUpgrade, setZipperUpgrade] = useState(false);
  const [zipperColor, setZipperColor] = useState<string>(ZIPPER_COLORS[0].value);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [isGiftOpen, setIsGiftOpen] = useState(false);
  const vw = useWindowWidth();
  const isMobile = vw < 540;
  const isWide = vw >= 880;
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const t = useTranslations("studio");
  const tColors = useTranslations("colors");
  const [savedToast, setSavedToast] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  // Embroidery state kept minimal for studio (no UI controls exposed)
  const embroideryLines: [string, string] = ["", ""];
  const embroideryLineCount: 1 | 2 = 1;
  const embroideryColor: EmbroideryColor = "#444444";
  const embroideryPosition: EmbroideryPosition = "top";
  const embroideryFont: EmbroideryFont = "sans-serif";
  const embroideryLineSizes: [EmbroideryLineSize, EmbroideryLineSize] = ["medium", "medium"];

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.get("saved") === "1") {
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 4000);
      window.history.replaceState({}, "", "/studio");
    }

    const incoming = decodeDesign(params.get("d"));
    if (incoming) {
      setSize(incoming.size);
      setColors(incoming.colors);
      setZipperUpgrade(incoming.zipperUpgrade);
      setZipperColor(incoming.zipperColor);
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleColorClick = (color: string) => {
    if (!selectedPart) {
      setColors(() => {
        const next: Record<string, string> = {};
        for (const g of ALL_GROUPS) next[g] = color;
        return next;
      });
      return;
    }
    setColors((prev) => ({ ...prev, [selectedPart]: color }));
  };

  const design = {
    size, colors,
    embroideryLines, embroideryLineCount, embroideryColor, embroideryPosition, embroideryFont, embroideryLineSizes,
    zipperUpgrade, zipperColor,
  };

  const saveVoteDirectly = async () => {
    if (!user) return;
    const supabase = createClient();
    const { data: season } = await supabase
      .from("seasons").select("id").eq("is_active", true).single();
    if (!season) return;
    await supabase.from("design_submissions").upsert(
      {
        user_id: user.id,
        season_id: season.id,
        design_json: design,
        fingerprint: designFingerprint(design),
        submitted_at: new Date().toISOString(),
      },
      { onConflict: "user_id,season_id" }
    );
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 4000);
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundImage: isDark ? "linear-gradient(#555555, #222222)" : "linear-gradient(#ffffff, #FDFAF3)",
        backgroundAttachment: "fixed",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: isMobile ? "0 16px 64px" : "0 24px 64px",
        gap: isMobile ? 28 : 40,
      }}
    >
      <SiteHeader />

      {/* HERO */}
      <div style={{ width: "100%", maxWidth: 680, textAlign: "center", marginTop: -8 }}>
        <p style={{ margin: "0 0 10px", fontSize: "var(--fs-sm)", fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", color: isDark ? "rgba(255,255,255,0.38)" : "rgba(0,0,0,0.35)", transition: "color 0.5s ease" }}>
          {t("label")}
        </p>
        <h1
          style={{
            margin: 0,
            fontSize: "var(--fs-lg)",
            fontWeight: 700,
            letterSpacing: 0.5,
            lineHeight: 1.15,
            ...(isDark
              ? {
                  background: "linear-gradient(180deg, #ffffff 0%, #c9c9c9 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }
              : { color: "#222222", WebkitTextFillColor: "#222222" }),
          }}
        >
          {t("heading")}
        </h1>
        <p style={{ margin: "12px 0 0", fontSize: "var(--fs-md)", color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)", lineHeight: 1.7, maxWidth: 500, marginInline: "auto", transition: "color 0.5s ease" }}>
          {t("subheading")}
        </p>
      </div>

      {/* PRIZE BANNER */}
      <div
        style={{
          width: "100%",
          maxWidth: 560,
          background: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.65)",
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
          border: isDark ? "1px solid rgba(255,255,255,0.09)" : "1px solid rgba(255,255,255,0.85)",
          borderRadius: 28,
          padding: "32px 28px 28px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 10,
          textAlign: "center",
          transition: "background 0.5s ease, border-color 0.5s ease",
        }}
      >
        {/* Gift icon — tappable, lid opens on click.
            The lid lives in its own <div> so CSS transition works on all mobile
            browsers — iOS Safari doesn't reliably animate SVG <g> transforms. */}
        <div
          onClick={() => setIsGiftOpen(v => !v)}
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: "linear-gradient(145deg, rgba(255,215,100,0.22) 0%, rgba(255,175,40,0.12) 100%)",
            border: "1px solid rgba(255,215,100,0.22)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 2,
            cursor: "pointer",
            userSelect: "none",
            position: "relative",
            overflow: "visible",
          }}
        >
          {/* Box body — static */}
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <rect x="4" y="16" width="20" height="10" rx="3" fill="rgba(255,215,100,0.18)" stroke="rgba(255,215,100,0.6)" strokeWidth="1"/>
            <rect x="12.5" y="16" width="3" height="10" rx="1" fill="rgba(255,215,100,0.85)"/>
          </svg>

          {/* Lid — separate div so CSS transform+transition is reliable on iOS */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transform: isGiftOpen ? "translateY(-13px) rotate(-38deg)" : "translateY(0) rotate(0deg)",
              transformOrigin: "50% 54%",
              transition: "transform 0.45s cubic-bezier(0.34,1.56,0.64,1)",
              pointerEvents: "none",
            }}
          >
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" style={{ overflow: "visible" }}>
              <path d="M14 10 C11 5 4 5 6 9 C7 11 12 10 14 10Z" fill="rgba(255,215,100,0.9)"/>
              <path d="M14 10 C17 5 24 5 22 9 C21 11 16 10 14 10Z" fill="rgba(255,215,100,0.9)"/>
              <rect x="3" y="10" width="22" height="6" rx="3" fill="rgba(255,215,100,0.55)" stroke="rgba(255,215,100,0.7)" strokeWidth="1"/>
              <rect x="3" y="13" width="22" height="3" rx="1" fill="rgba(255,215,100,0.55)"/>
              <rect x="12.5" y="10" width="3" height="6" rx="1" fill="rgba(255,215,100,0.85)"/>
            </svg>
          </div>
        </div>

        <h2 style={{ margin: 0, fontSize: "var(--fs-md)", fontWeight: 700, color: isDark ? "#fff" : "#222222", letterSpacing: -0.2, lineHeight: 1.25, transition: "color 0.5s ease" }}>
          {t("prizeHeading")}
        </h2>
        <p style={{ margin: 0, fontSize: "var(--fs-sm)", color: isDark ? "rgba(255,255,255,0.48)" : "rgba(0,0,0,0.5)", lineHeight: 1.75, maxWidth: 360, transition: "color 0.5s ease" }}>
          {t("prizeDesc")}
        </p>

        {/* Instagram CTA */}
        <a
          href="https://www.instagram.com/computexsystems.co/"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            marginTop: 10,
            display: "inline-flex",
            alignItems: "center",
            gap: 9,
            padding: "10px 20px 10px 12px",
            borderRadius: 999,
            background: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)",
            border: isDark ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(0,0,0,0.1)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            color: isDark ? "#fff" : "#222222",
            fontSize: "var(--fs-sm)",
            fontWeight: 600,
            letterSpacing: 0.1,
            textDecoration: "none",
            transition: "color 0.5s ease, background 0.5s ease",
          }}
        >
          {/* IG gradient icon badge */}
          <span
            style={{
              width: 26,
              height: 26,
              borderRadius: 8,
              background: "linear-gradient(135deg, #f9a825 0%, #e8453c 45%, #b33aab 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
            </svg>
          </span>
          {t("followInstagram")}
        </a>
      </div>

      {/* THIS SEASON'S TOP STYLES */}
      <div style={{ width: "100%", maxWidth: 960 }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <p style={{ margin: "0 0 6px", fontSize: "var(--fs-sm)", fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", color: isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)", transition: "color 0.5s ease" }}>
            {t("standingsLabel")}
          </p>
          <h2 style={{ margin: 0, fontSize: "var(--fs-md)", fontWeight: 700, letterSpacing: 1, color: isDark ? "#fff" : "#222222", transition: "color 0.5s ease" }}>
            {t("topStylesHeading")}
          </h2>
          <p style={{ margin: "8px 0 0", fontSize: "var(--fs-sm)", color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.45)", transition: "color 0.5s ease" }}>
            {t("topStylesDesc")}
          </p>
        </div>
        <CommunityGallery topStylesOnly />
      </div>

      {/* DIVIDER */}
      <div style={{ width: "100%", maxWidth: 680, display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ flex: 1, height: 1, background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)", transition: "background 0.5s ease" }} />
        <span style={{ fontSize: "var(--fs-sm)", fontWeight: 600, letterSpacing: 2, color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.35)", textTransform: "uppercase", whiteSpace: "nowrap", transition: "color 0.5s ease" }}>
          {t("divider")}
        </span>
        <div style={{ flex: 1, height: 1, background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)", transition: "background 0.5s ease" }} />
      </div>

      {/* SIZE */}
      <div style={{ display: "flex", gap: 10 }}>
        {(["14", "16"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSize(s)}
            style={{
              padding: "6px 18px",
              borderRadius: 999,
              background: size === s ? (isDark ? "#fff" : "#222222") : "transparent",
              color: size === s ? (isDark ? "#222222" : "#fff") : (isDark ? "#fff" : "#222222"),
              fontWeight: 600,
              border: isDark ? "1px solid #fff" : "1px solid #111",
              cursor: "pointer",
              fontSize: "var(--fs-md)",
              transition: "background 0.3s ease, color 0.3s ease",
            }}
          >
            {t("sizeLaptop", { size: s })}
          </button>
        ))}
      </div>

      {/* BAG */}
      <div
        style={{
          display: "flex",
          gap: isWide ? 24 : 12,
          alignItems: "flex-start",
          flexWrap: "wrap",
          justifyContent: "center",
          width: "100%",
        }}
      >
        {/* Front — fixed 420px container, content scales inside */}
        <div
          style={{
            position: "relative",
            width: isWide ? BASE_W : "100%",
            maxWidth: BASE_W,
            aspectRatio: `${FRONT_VIEWBOX.w} / ${FRONT_VIEWBOX.h}`,
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              transform: `scale(${SIZE_SCALE[size]})`,
              transformOrigin: "center center",
            }}
          >
            <FrontSVG
              colors={colors}
              setSelectedPart={setSelectedPart}
              embroideryLines={embroideryLines}
              embroideryLineCount={embroideryLineCount}
              embroideryColor={embroideryColor}
              embroideryPosition={embroideryPosition}
              embroideryFont={embroideryFont}
              embroideryLineSizes={embroideryLineSizes}
              zipperUpgrade={zipperUpgrade}
              zipperColor={zipperColor}
              zipperCalibration={ZIPPER_CALIBRATION}
            />
            <PngOverlayLayer
              viewBoxW={FRONT_VIEWBOX.w}
              viewBoxH={FRONT_VIEWBOX.h}
              pngSrc="/texture/Front-Overlay.png"
              calibration={FRONT_CALIBRATION}
            />
            <BagDimensionGuides size={size} />
          </div>
        </div>

        {/* Back — fixed 420px container, content scales inside */}
        <div
          style={{
            position: "relative",
            width: isWide ? BASE_W : "100%",
            maxWidth: BASE_W,
            aspectRatio: `${BACK_VIEWBOX.w} / 606`,
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              transform: `scale(${SIZE_SCALE[size]})`,
              transformOrigin: "center center",
            }}
          >
            <BackSVG
              colors={colors}
              setSelectedPart={setSelectedPart}
              svgTransform={BACK_SVG_TRANSFORM}
            />
            <PngOverlayLayer
              viewBoxW={BACK_VIEWBOX.w}
              viewBoxH={BACK_VIEWBOX.h}
              pngSrc="/texture/Back-Overlay.png"
              calibration={BACK_CALIBRATION}
              preserveAspectRatio="xMidYMin slice"
            />
          </div>
        </div>
      </div>

      <p style={{ margin: "-28px 0 0", fontSize: "var(--fs-sm)", color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.4)", letterSpacing: 0.3, textAlign: "center", transition: "color 0.5s ease" }}>
        {t("tapHint")}
      </p>

      {/* COLOR PALETTE */}
      <div style={{ width: "100%", maxWidth: 680 }}>
        <h2 style={{ color: isDark ? "#fff" : "#222222", textAlign: "center", fontSize: "var(--fs-md)", fontWeight: 700, letterSpacing: 2, margin: "0 0 16px", transition: "color 0.5s ease" }}>
          {t("colorsHeading")}
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {COLOR_GROUPS.map((group) => (
            <div
              key={group.titleKey}
              style={{
                background: isDark
                  ? "linear-gradient(135deg, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0.15) 100%)"
                  : "rgba(255,255,255,0.65)",
                backdropFilter: isDark ? undefined : "blur(20px) saturate(180%)",
                WebkitBackdropFilter: isDark ? undefined : "blur(20px) saturate(180%)",
                border: isDark ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(255,255,255,0.85)",
                borderRadius: 18,
                padding: "14px 18px 18px",
                transition: "background 0.5s ease, border-color 0.5s ease",
              }}
            >
              <div style={{ color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)", textAlign: "center", marginBottom: 10, fontWeight: 600, fontSize: "var(--fs-sm)", letterSpacing: 1, transition: "color 0.5s ease" }}>
                {tColors(`groups.${group.titleKey}`)}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(4, 1fr)" : "repeat(6, 1fr)", gap: isMobile ? 8 : 10 }}>
                {group.colors.map((color) => (
                  <div
                    key={color.value}
                    onClick={() => handleColorClick(color.value)}
                    style={{ textAlign: "center", cursor: "pointer", minWidth: 0 }}
                  >
                    <div
                      style={{
                        width: isMobile ? 38 : 34,
                        height: isMobile ? 38 : 34,
                        borderRadius: "50%",
                        background: color.value,
                        margin: "0 auto",
                        border: "1.5px solid rgba(255,255,255,0.15)",
                      }}
                    />
                    <div
                      style={{
                        fontSize: isMobile ? 9 : 10,
                        lineHeight: 1.25,
                        color: isDark ? "#ccc" : "rgba(0,0,0,0.55)",
                        marginTop: 5,
                        wordBreak: "break-word",
                        overflowWrap: "anywhere",
                        transition: "color 0.5s ease",
                      }}
                    >
                      {tColors(`swatches.${color.key}`)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ZIPPER */}
      <ZipperPullControls
        enabled={zipperUpgrade}
        color={zipperColor}
        onEnabledChange={setZipperUpgrade}
        onColorChange={setZipperColor}
      />

      {/* SUBMIT CTA */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
        <button
          onClick={() => user ? saveVoteDirectly() : setShowSaveModal(true)}
          style={{
            padding: "16px 40px",
            borderRadius: 999,
            background: isDark ? "#fff" : "#222222",
            color: isDark ? "#222222" : "#fff",
            fontWeight: 700,
            fontSize: "var(--fs-md)",
            letterSpacing: 0.5,
            border: "none",
            cursor: "pointer",
            boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "center",
            gap: 8,
            transition: "background 0.5s ease, color 0.5s ease",
          }}
        >
          {t("submitVote")}
          <ArrowIcon size={16} />
        </button>
        <p style={{ margin: 0, fontSize: "var(--fs-sm)", color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.4)", textAlign: "center", transition: "color 0.5s ease" }}>
          {t("voteHelpText")}
        </p>
        {user ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "var(--fs-sm)", color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.45)", transition: "color 0.5s ease" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#a8e6a3", flexShrink: 0 }} />
            {user.email}
            <button
              onClick={async () => { await createClient().auth.signOut(); setUser(null); }}
              style={{ background: "none", border: "none", color: isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.35)", fontSize: "var(--fs-sm)", cursor: "pointer", padding: 0, textDecoration: "underline" }}
            >
              {t("signOut")}
            </button>
          </div>
        ) : (
          <div style={{ fontSize: "var(--fs-sm)", color: isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.35)", transition: "color 0.5s ease" }}>
            {t("signInHint")}
          </div>
        )}
      </div>

      {/* PREVIOUS SEASON */}
      <div style={{ width: "100%", maxWidth: 960 }}>
        <CommunityGallery />
      </div>

      <SiteFooter />

      {showSaveModal && (
        <SaveDesignModal
          design={design}
          onClose={() => setShowSaveModal(false)}
          nextPath="/studio"
        />
      )}

      {savedToast && (
        <div
          style={{
            position: "fixed", bottom: 28, left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(30,30,30,0.96)",
            border: "1px solid rgba(168,230,163,0.4)",
            borderRadius: 999,
            padding: "12px 24px",
            color: "#a8e6a3",
            fontSize: "var(--fs-md)",
            fontWeight: 600,
            zIndex: 400,
            whiteSpace: "nowrap",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          }}
        >
          {t("savedToast")}
        </div>
      )}
      <ScrollNav />
    </main>
  );
}
