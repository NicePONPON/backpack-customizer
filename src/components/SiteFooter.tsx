"use client";

import { useTranslations } from "next-intl";

type Props = {
  companyName?: string;
  invert?: boolean;
};

export default function SiteFooter({ companyName, invert = false }: Props) {
  const t = useTranslations("footer");
  const company = companyName ?? t("defaultCompany");

  return (
    <footer
      style={{
        width: "100%",
        maxWidth: 720,
        margin: "0 auto",
        textAlign: "center",
        marginTop: 16,
        color: invert ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.45)",
        fontSize: 12,
        lineHeight: 1.6,
        letterSpacing: 0.3,
      }}
    >
      <div>{t("copyright", { company })}</div>
      <div>{t("tagline")}</div>
    </footer>
  );
}
