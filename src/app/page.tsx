import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import HeroBagVisual from "@/components/HeroBagVisual";
import IntroVideo from "@/components/IntroVideo";
import FeatureExpandableCard, {
  type FeatureCardData,
} from "@/components/FeatureExpandableCard";

const FEATURE_CARDS: FeatureCardData[] = [
  {
    title: "Durability",
    summary:
      "Reinforced seams and weather-resistant fabric, built to outlast your commute.",
    items: [
      {
        videoSrc: "/gif/Reinforce Stitching.mp4",
        title: "Reinforced Stitching",
        description:
          "Bar-tacked stress points and double-row lockstitches anchor every strap and seam to the body, holding the bag intact through years of heavy loads and hard pulls.",
      },
      {
        videoSrc: "/gif/Machine Washable.mp4",
        title: "Machine Washable",
        description:
          "Toss it in the wash. Colorfast dyes, rust-proof hardware, and reinforced edges hold their shape and tone across dozens of cycles — fresh-looking year after year.",
      },
    ],
  },
  {
    title: "Design",
    summary:
      "Considered details, clean silhouettes — a bag that earns its place every day.",
    items: [
      {
        videoSrc: "/gif/Reinforced Laptop Compartment.mp4",
        title: "Reinforced Laptop Compartment",
        description:
          "A purpose-built suspended sleeve cradles your laptop in dense foam, lifted clear of the bag floor so ground impacts dissipate before reaching your device.",
      },
      {
        videoSrc: "/gif/Super Breathable Straps Padding.mp4",
        title: "Super-Breathable Straps & Padding",
        description:
          "Contoured shoulder straps and air-channeled mesh back padding distribute weight evenly and vent body heat, keeping long carries cool, balanced, and effortless.",
      },
    ],
  },
  {
    title: "Quality",
    summary:
      "Tested materials and careful assembly. Every panel held to the same standard.",
    items: [
      {
        videoSrc: "/gif/Shockproof Foam Armor.mp4",
        title: "Shockproof Foam Armor",
        description:
          "Closed-cell foam armor lines the chassis, absorbing impact energy before it reaches your gear — bumps, drops, and jostled commutes leave the contents undisturbed.",
      },
      {
        videoSrc: "/gif/Water-Resistant Material.mp4",
        title: "Water-Resistant Material",
        description:
          "A high-density woven shell with hydrophobic coating beads water on contact, shedding rain and unexpected splashes so the essentials inside stay completely dry.",
      },
    ],
  },
];

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
          Built for the way you carry.
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
          Modern everyday backpacks engineered for durability, designed without
          compromise.
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
          We design for what everyday life actually needs.
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
          This backpack brings together protection, lightness, and simplicity—built
          with a dedicated laptop compartment, a water-repellent exterior, and a
          structure refined through real use.
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
          Not overly technical, not overly minimal. Just balanced.
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
          We believe a backpack should feel natural to carry, effortless to use,
          and ready for the rhythm of daily life—from commuting to movement in
          between.
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
          Designed to be just right.
        </p>
      </section>

      {/* VALUE PILLARS */}
      <section style={sectionStyle}>
        <h2 style={sectionHeaderStyle}>WHY THIS BAG</h2>
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
