"use client";

import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import HeroBagVisual from "@/components/HeroBagVisual";
import IntroVideo from "@/components/IntroVideo";
import Gallery from "@/components/Gallery";
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

const cardBaseStyle: React.CSSProperties = {
  background:
    "linear-gradient(135deg, rgba(0,0,0,0.32) 0%, rgba(0,0,0,0.18) 100%)",
  border: "1px solid rgba(255,255,255,0.14)",
  borderRadius: 20,
  backdropFilter: "blur(20px) saturate(180%)",
  WebkitBackdropFilter: "blur(20px) saturate(180%)",
  boxShadow:
    "0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.18)",
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

      {/* GALLERY */}
      <section style={sectionStyle}>
        <h2 style={sectionHeaderStyle}>GALLERY</h2>
        <Gallery />
      </section>

      {/* WHO ARE YOU? */}
      <section style={sectionStyle}>
        <h2 style={sectionHeaderStyle}>WHO ARE YOU?</h2>
        <p
          style={{
            textAlign: "center",
            color: "rgba(255,255,255,0.65)",
            fontSize: 15,
            margin: "-12px 0 24px",
          }}
        >
          Pick the path that fits — we&rsquo;ll route you to the right place.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 16,
          }}
        >
          <SegmenterCard
            href="/customize"
            label="Business / school / organization"
            title="Bulk customization & quotation"
            description="Configure colors, embroidery, and zipper hardware. Generate a printable quotation for orders of 200+ units."
            cta="Customize in bulk →"
          />
          <SegmenterCard
            href="/shop"
            label="Individual customer"
            title="Find your local store"
            description="Pick your region and we&rsquo;ll route you to the local distributor or retail platform that ships to you."
            cta="Shop your region →"
          />
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}

function SegmenterCard({
  href,
  label,
  title,
  description,
  cta,
}: {
  href: string;
  label: string;
  title: string;
  description: string;
  cta: string;
}) {
  return (
    <Link
      href={href}
      style={{
        ...cardBaseStyle,
        padding: "24px 26px 26px",
        textDecoration: "none",
        color: "inherit",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        minHeight: 220,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 1.5,
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.55)",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: "#fff",
          letterSpacing: 0.3,
          lineHeight: 1.2,
        }}
      >
        {title}
      </div>
      <div
        style={{
          color: "rgba(255,255,255,0.7)",
          fontSize: 14,
          lineHeight: 1.55,
          flex: 1,
        }}
      >
        {description}
      </div>
      <div
        style={{
          marginTop: 8,
          fontWeight: 700,
          color: "#fff",
          letterSpacing: 0.3,
        }}
      >
        {cta}
      </div>
    </Link>
  );
}
