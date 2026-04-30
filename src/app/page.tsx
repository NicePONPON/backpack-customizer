import { useTranslations } from "next-intl";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import HeroBagVisual from "@/components/HeroBagVisual";
import IntroVideo from "@/components/IntroVideo";
import FeatureExpandableCard, {
  type FeatureCardData,
} from "@/components/FeatureExpandableCard";

const pageBg: React.CSSProperties = {
  minHeight: "100vh",
  background: "linear-gradient(#555555, #222222)",
  backgroundAttachment: "fixed",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  padding: "0 24px 48px",
  gap: 48,
  color: "#fff",
};

const sectionStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 960,
};

const sectionHeaderStyle: React.CSSProperties = {
  textAlign: "center",
  fontSize: 22,
  fontWeight: 700,
  letterSpacing: 2,
  margin: "0 0 24px",
  color: "#fff",
};

export default function HomePage() {
  const t = useTranslations("home");

  const FEATURE_CARDS: FeatureCardData[] = [
    {
      title: t("whyThisBag.durability.title"),
      summary: t("whyThisBag.durability.summary"),
      items: [
        {
          videoSrc: "/gif/Reinforce Stitching.mp4",
          title: t("whyThisBag.durability.reinforcedStitching.title"),
          description: t(
            "whyThisBag.durability.reinforcedStitching.description"
          ),
        },
        {
          videoSrc: "/gif/Machine Washable.mp4",
          title: t("whyThisBag.durability.machineWashable.title"),
          description: t("whyThisBag.durability.machineWashable.description"),
        },
      ],
    },
    {
      title: t("whyThisBag.design.title"),
      summary: t("whyThisBag.design.summary"),
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
      title: t("whyThisBag.quality.title"),
      summary: t("whyThisBag.quality.summary"),
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
      <IntroVideo />
      <SiteHeader />

      {/* HERO */}
      <section
        style={{
          ...sectionStyle,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          gap: 8,
          marginTop: -8,
        }}
      >
        <h1
          style={{
            fontSize: 44,
            fontWeight: 700,
            letterSpacing: 0.5,
            lineHeight: 1.1,
            margin: 0,
            background: "linear-gradient(180deg, #ffffff 0%, #c9c9c9 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          {t("hero.tagline")}
        </h1>
        <p
          style={{
            color: "rgba(255,255,255,0.7)",
            fontSize: 16,
            fontWeight: 400,
            letterSpacing: 0.3,
            margin: "8px 0 0",
            maxWidth: 560,
          }}
        >
          {t("hero.subline")}
        </p>

        <div
          style={{
            width: "100%",
            maxWidth: 480,
            aspectRatio: "1 / 1",
            // Generous gap so the floating animation (segments can translate
            // up to ~22px above their resting position) never clips toward
            // the slogan above.
            marginTop: 16,
          }}
        >
          <HeroBagVisual />
        </div>
      </section>

      {/* BRAND STORY */}
      <section
        style={{
          ...sectionStyle,
          maxWidth: 640,
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          gap: 18,
          padding: "8px 0",
        }}
      >
        <p
          style={{
            color: "rgba(255,255,255,0.92)",
            fontSize: 19,
            fontWeight: 500,
            lineHeight: 1.5,
            letterSpacing: 0.2,
            margin: 0,
          }}
        >
          {t("brandStory.lead")}
        </p>
        <p
          style={{
            color: "rgba(255,255,255,0.72)",
            fontSize: 15,
            lineHeight: 1.7,
            letterSpacing: 0.2,
            margin: 0,
          }}
        >
          {t("brandStory.p1")}
        </p>
        <p
          style={{
            color: "rgba(255,255,255,0.72)",
            fontSize: 15,
            lineHeight: 1.7,
            letterSpacing: 0.2,
            margin: 0,
          }}
        >
          {t("brandStory.p2")}
        </p>
        <p
          style={{
            color: "rgba(255,255,255,0.72)",
            fontSize: 15,
            lineHeight: 1.7,
            letterSpacing: 0.2,
            margin: 0,
          }}
        >
          {t("brandStory.p3")}
        </p>
        <p
          style={{
            color: "rgba(255,255,255,0.92)",
            fontSize: 16,
            fontWeight: 500,
            lineHeight: 1.5,
            letterSpacing: 0.4,
            margin: "4px 0 0",
            fontStyle: "italic",
          }}
        >
          {t("brandStory.closer")}
        </p>
      </section>

      {/* VALUE PILLARS */}
      <section style={sectionStyle}>
        <h2 style={sectionHeaderStyle}>{t("whyThisBag.heading")}</h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 16,
            alignItems: "start",
          }}
        >
          {FEATURE_CARDS.map((card) => (
            <FeatureExpandableCard key={card.title} data={card} />
          ))}
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
