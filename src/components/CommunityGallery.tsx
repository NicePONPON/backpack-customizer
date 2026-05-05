"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { encodeDesign } from "@/lib/invoiceSerialization";
import type { DesignState } from "@/lib/invoiceSerialization";

type TopDesign = {
  design_json: DesignState;
  count: number;
};

type LaunchedDesign = {
  design_json: DesignState;
  season_name: string;
  count: number;
};

// ─── colour chip row ────────────────────────────────────────────────────────

function ColorChips({ colors }: { colors: Record<string, string> }) {
  const unique = [...new Set(Object.values(colors))].slice(0, 8);
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 5, justifyContent: "center" }}>
      {unique.map((hex) => (
        <span
          key={hex}
          title={hex}
          style={{
            display: "block",
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: hex,
            border: "1.5px solid rgba(255,255,255,0.18)",
            flexShrink: 0,
          }}
        />
      ))}
    </div>
  );
}

// ─── single design card ─────────────────────────────────────────────────────

function DesignCard({
  design,
  rank,
  count,
  launched,
}: {
  design: DesignState;
  rank: number;
  count: number;
  launched?: boolean;
}) {
  const href = `/customize?d=${encodeURIComponent(encodeDesign(design))}`;

  return (
    <div
      style={{
        background: launched
          ? "linear-gradient(135deg, rgba(255,215,100,0.1) 0%, rgba(255,200,50,0.05) 100%)"
          : "linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.03) 100%)",
        border: launched
          ? "1px solid rgba(255,215,100,0.35)"
          : "1px solid rgba(255,255,255,0.12)",
        borderRadius: 18,
        padding: "20px 16px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        alignItems: "center",
        textAlign: "center",
      }}
    >
      {launched && (
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 2.5,
            textTransform: "uppercase",
            color: "rgba(255,215,100,0.9)",
            padding: "3px 10px",
            border: "1px solid rgba(255,215,100,0.4)",
            borderRadius: 999,
          }}
        >
          Launched
        </div>
      )}

      {!launched && (
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: 1.5,
            color: "rgba(255,255,255,0.38)",
            textTransform: "uppercase",
          }}
        >
          #{rank}
        </div>
      )}

      <ColorChips colors={design.colors} />

      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.55)", letterSpacing: 0.3 }}>
          {design.size}" · {design.zipperUpgrade ? "Paracord zipper" : "Standard zipper"}
        </p>
        <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,0.3)", letterSpacing: 0.3 }}>
          {count.toLocaleString()} {count === 1 ? "person" : "people"} chose this
        </p>
      </div>

      <a
        href={href}
        style={{
          display: "block",
          padding: "8px 16px",
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.22)",
          background: "transparent",
          color: "rgba(255,255,255,0.75)",
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: 0.5,
          textDecoration: "none",
          transition: "background 200ms, color 200ms",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.12)";
          (e.currentTarget as HTMLAnchorElement).style.color = "#fff";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
          (e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,0.75)";
        }}
      >
        Customize this style →
      </a>
    </div>
  );
}

// ─── main component ─────────────────────────────────────────────────────────

export default function CommunityGallery() {
  const [topDesigns, setTopDesigns] = useState<TopDesign[]>([]);
  const [launched, setLaunched] = useState<LaunchedDesign | null>(null);
  const [seasonName, setSeasonName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      // Get active season
      const { data: season } = await supabase
        .from("seasons")
        .select("id, name")
        .eq("is_active", true)
        .single();

      if (season) {
        setSeasonName(season.name);

        // Top 3 from current season
        const { data: top } = await supabase.rpc("get_top_designs", {
          p_season_id: season.id,
          p_limit: 3,
        });
        if (top) setTopDesigns(top as TopDesign[]);
      }

      // Launched design from previous season
      const { data: prev } = await supabase.rpc("get_launched_design");
      if (prev && prev.length > 0) setLaunched(prev[0] as LaunchedDesign);

      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 13, padding: "32px 0" }}>
        Loading community styles…
      </div>
    );
  }

  const hasContent = launched || topDesigns.length > 0;
  if (!hasContent) return null;

  return (
    <div style={{ width: "100%", maxWidth: 960, display: "flex", flexDirection: "column", gap: 48 }}>

      {/* ── Launched style ─────────────────────────────────────────────── */}
      {launched && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ textAlign: "center" }}>
            <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 600, letterSpacing: 3, textTransform: "uppercase", color: "rgba(255,215,100,0.7)" }}>
              {launched.season_name}
            </p>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: 1, color: "#fff" }}>
              THE STYLE WE LAUNCHED
            </h2>
          </div>
          <div style={{ maxWidth: 280, alignSelf: "center", width: "100%" }}>
            <DesignCard design={launched.design_json} rank={1} count={launched.count} launched />
          </div>
        </div>
      )}

      {/* ── Current season top 3 ───────────────────────────────────────── */}
      {topDesigns.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ textAlign: "center" }}>
            <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 600, letterSpacing: 3, textTransform: "uppercase", color: "rgba(255,255,255,0.4)" }}>
              {seasonName}
            </p>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: 1, color: "#fff" }}>
              THIS SEASON'S TOP STYLES
            </h2>
            <p style={{ margin: "8px 0 0", fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
              The #1 style at season close will be our next launch.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 14,
            }}
          >
            {topDesigns.map((d, i) => (
              <DesignCard key={i} design={d.design_json} rank={i + 1} count={d.count} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
