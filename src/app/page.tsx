"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import HeroBagVisual from "@/components/HeroBagVisual";
import FeatureEditorialSection from "@/components/FeatureEditorialSection";
import BrandStory from "@/components/BrandStory";
import ArrowIcon from "@/components/ArrowIcon";
import { useTheme } from "@/lib/ThemeContext";

const sectionStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 960,
};

export default function HomePage() {
  const t = useTranslations("home");
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const pageBg: React.CSSProperties = {
    minHeight: "100vh",
    backgroundImage: isDark
      ? "linear-gradient(#555555, #222222)"
      : "linear-gradient(#ffffff, #FDFAF3)",
    backgroundAttachment: "fixed",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "0 0 48px",
    gap: 48,
    color: isDark ? "#fff" : "#333",
    transition: "color 0.5s ease",
  };

  const sectionHeaderStyle: React.CSSProperties = {
    textAlign: "center",
    fontSize: 22,
    fontWeight: 700,
    letterSpacing: 2,
    margin: "0 0 24px",
    color: isDark ? "#fff" : "#333",
    transition: "color 0.5s ease",
  };

  // Hero text always light — it sits over the video + dark scrim
  const eyebrowColor = "rgba(255,255,255,0.55)";
  const titleColor = "#fff";
  const subColor = "rgba(255,255,255,0.7)";

  const FEATURE_PILLARS = [
    {
      pillar: t("whyThisBag.durability.title"),
      items: [
        {
          videoSrc: "/gif/Reinforce Stitching.mp4",
          title: t("whyThisBag.durability.reinforcedStitching.title"),
          description: t("whyThisBag.durability.reinforcedStitching.description"),
        },
        {
          videoSrc: "/gif/Machine Washable.mp4",
          title: t("whyThisBag.durability.machineWashable.title"),
          description: t("whyThisBag.durability.machineWashable.description"),
        },
      ],
    },
    {
      pillar: t("whyThisBag.design.title"),
      items: [
        {
          videoSrc: "/gif/Reinforced Laptop Compartment.mp4",
          title: t("whyThisBag.design.laptopCompartment.title"),
          description: t("whyThisBag.design.laptopCompartment.description"),
        },
        {
          videoSrc: "/gif/Super Breathable Straps Padding.mp4",
          title: t("whyThisBag.design.breathableStraps.title"),
          description: t("whyThisBag.design.breathableStraps.description"),
        },
      ],
    },
    {
      pillar: t("whyThisBag.quality.title"),
      items: [
        {
          videoSrc: "/gif/Shockproof Foam Armor.mp4",
          title: t("whyThisBag.quality.shockproofFoam.title"),
          description: t("whyThisBag.quality.shockproofFoam.description"),
        },
        {
          videoSrc: "/gif/Water-Resistant Material.mp4",
          title: t("whyThisBag.quality.waterResistant.title"),
          description: t("whyThisBag.quality.waterResistant.description"),
        },
      ],
    },
  ];

  return (
    <main style={pageBg}>
      <SiteHeader />

      {/* HERO — animation IS the background, fills full first-page viewport */}
      <section
        style={{
          position: "relative",
          width: "100%",
          height: "100svh",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginTop: -48,
        }}
      >
        {/* Video fills the entire viewport as background */}
        <video
          autoPlay
          muted
          loop
          playsInline
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        >
          <source src="/gif/plan.mp4" type="video/mp4" />
        </video>

        {/* Dark scrim so text stays readable over the video */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: isDark
              ? "rgba(0,0,0,0.45)"
              : "rgba(0,0,0,0.25)",
          }}
        />

        {/* Floating content — no card or frame */}
        <div
          style={{
            position: "relative",
            zIndex: 2,
            textAlign: "center",
            padding: "0 32px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <p
            style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: 3,
              color: eyebrowColor,
              textTransform: "uppercase",
              marginBottom: 18,
              margin: "0 0 18px",
            }}
          >
            Designed in Taiwan
          </p>
          <h1
            style={{
              fontSize: 38,
              fontWeight: 800,
              lineHeight: 1.06,
              color: titleColor,
              letterSpacing: -1.5,
              margin: "0 0 16px",
              transition: "color 0.5s ease",
            }}
          >
            {t("hero.tagline")}
          </h1>
          <p
            style={{
              fontSize: 13,
              color: subColor,
              lineHeight: 1.65,
              maxWidth: 260,
              margin: "0 0 36px",
              transition: "color 0.5s ease",
            }}
          >
            {t("hero.subline")}
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <Link
              href="/shop"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "14px 28px",
                background: "#fff",
                color: "#333",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 1.5,
                textTransform: "uppercase",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                textDecoration: "none",
                transition: "background 0.3s ease, color 0.3s ease",
                whiteSpace: "nowrap",
              }}
            >
              {t("hero.shopNow")}
              <ArrowIcon size={14} />
            </Link>
            <a
              href="#brand-story"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "14px 28px",
                background: "transparent",
                color: "rgba(255,255,255,0.9)",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 1.5,
                textTransform: "uppercase",
                border: "1.5px solid rgba(255,255,255,0.5)",
                borderRadius: 6,
                cursor: "pointer",
                textDecoration: "none",
                transition: "color 0.3s ease, border-color 0.3s ease",
                whiteSpace: "nowrap",
              }}
            >
              {t("hero.learnMore")}
            </a>
          </div>
        </div>
      </section>

      {/* COLORWAY EXPLORER — segregated colorful backpack, just below the video */}
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          aspectRatio: "1 / 1",
          padding: "0 24px",
          alignSelf: "center",
        }}
      >
        <HeroBagVisual />
      </div>

      {/* BRAND STORY — centered narrative, anchor for "Learn More" */}
      <div
        id="brand-story"
        style={{
          width: "100%",
          maxWidth: 720,
          padding: "0 24px",
          textAlign: "center",
          alignSelf: "center",
        }}
      >
        <BrandStory />
      </div>

      {/* VALUE PILLARS — editorial alternating layout */}
      <section style={{ ...sectionStyle, padding: "0 24px" }}>
        <h2 style={{ ...sectionHeaderStyle, marginBottom: 32 }}>{t("whyThisBag.heading")}</h2>
        <FeatureEditorialSection pillars={FEATURE_PILLARS} />
      </section>

      <SiteFooter />
    </main>
  );
}
