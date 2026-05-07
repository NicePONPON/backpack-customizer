"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { encodeDesign } from "@/lib/invoiceSerialization";
import type { DesignState } from "@/lib/invoiceSerialization";
import MiniBackpack from "@/components/MiniBackpack";
import PreorderModal from "@/components/PreorderModal";
import SaveDesignModal from "@/components/SaveDesignModal";
import ArrowIcon from "@/components/ArrowIcon";

type TopDesign = {
  design_json: DesignState;
  count: number;
};

type LaunchedDesign = {
  design_json: DesignState;
  season_name: string;
  count: number;
};

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
  const t = useTranslations("gallery.community");
  const [showPreorder, setShowPreorder] = useState(false);
  const [showVoteModal, setShowVoteModal] = useState(false);

  return (
    <>
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
            {t("launchedBadge")}
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

        <MiniBackpack design={design} size={140} />

        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.55)", letterSpacing: 0.2 }}>
            {design.size}" · {design.zipperUpgrade ? t("paracordZipper") : t("standardZipper")}
          </p>
          <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.35)", letterSpacing: 0.2 }}>
            {t("voteCount", { count })}
          </p>
        </div>

        {launched ? (
          <button
            onClick={() => setShowPreorder(true)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              width: "100%",
              padding: "9px 18px",
              borderRadius: 999,
              border: "1px solid rgba(255,215,100,0.5)",
              background: "rgba(255,215,100,0.12)",
              color: "rgba(255,215,100,0.95)",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: 0.5,
              cursor: "pointer",
            }}
          >
            {t("preorderCta")}
            <ArrowIcon size={12} />
          </button>
        ) : (
          <button
            onClick={() => setShowVoteModal(true)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              width: "100%",
              padding: "9px 16px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.28)",
              background: "rgba(255,255,255,0.07)",
              color: "#fff",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: 0.5,
              cursor: "pointer",
            }}
          >
            {t("voteCta")}
            <ArrowIcon size={12} />
          </button>
        )}
      </div>

      {showPreorder && <PreorderModal onClose={() => setShowPreorder(false)} />}
      {showVoteModal && (
        <SaveDesignModal
          design={design}
          onClose={() => setShowVoteModal(false)}
          nextPath="/studio"
        />
      )}
    </>
  );
}

// ─── main component ─────────────────────────────────────────────────────────

export default function CommunityGallery({ topStylesOnly = false }: { topStylesOnly?: boolean }) {
  const t = useTranslations("gallery.community");
  const [topDesigns, setTopDesigns] = useState<TopDesign[]>([]);
  const [launched, setLaunched] = useState<LaunchedDesign | null>(null);
  const [seasonName, setSeasonName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      const { data: season } = await supabase
        .from("seasons")
        .select("id, name")
        .eq("is_active", true)
        .single();

      if (season) {
        setSeasonName(season.name);
        const { data: top } = await supabase.rpc("get_top_designs", {
          p_season_id: season.id,
          p_limit: 3,
        });
        if (top) setTopDesigns(top as TopDesign[]);
      }

      const { data: prev } = await supabase.rpc("get_launched_design");
      if (prev && prev.length > 0) setLaunched(prev[0] as LaunchedDesign);

      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 13, padding: "32px 0" }}>
        {t("loading")}
      </div>
    );
  }

  const hasContent = topStylesOnly ? topDesigns.length > 0 : (launched || topDesigns.length > 0);
  if (!hasContent) return null;

  return (
    <div style={{ width: "100%", maxWidth: 960, display: "flex", flexDirection: "column", gap: 48 }}>

      {!topStylesOnly && launched && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ textAlign: "center" }}>
            <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 600, letterSpacing: 3, textTransform: "uppercase", color: "rgba(255,215,100,0.7)" }}>
              {launched.season_name}
            </p>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: 1, color: "#fff" }}>
              {t("launchedHeading")}
            </h2>
          </div>
          <div style={{ maxWidth: 280, alignSelf: "center", width: "100%" }}>
            <DesignCard design={launched.design_json} rank={1} count={launched.count} launched />
          </div>
        </div>
      )}

      {topDesigns.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ textAlign: "center" }}>
            <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 600, letterSpacing: 3, textTransform: "uppercase", color: "rgba(255,255,255,0.4)" }}>
              {seasonName}
            </p>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: 1, color: "#fff" }}>
              {t("topStylesHeading")}
            </h2>
            <p style={{ margin: "8px 0 0", fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
              {t("topStylesDesc")}
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: 12,
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
