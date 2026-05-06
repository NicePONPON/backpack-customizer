"use client";

import { useTranslations } from "next-intl";
import { useTheme } from "@/lib/ThemeContext";

type Props = {
  companyName?: string;
  invert?: boolean;
};

export default function SiteFooter({ companyName, invert }: Props) {
  const t = useTranslations("footer");
  const { theme } = useTheme();
  const company = companyName ?? t("defaultCompany");

  const isLight = invert !== undefined ? invert : theme === "light";

  return (
    <footer
      style={{
        width: "100%",
        maxWidth: 720,
        margin: "0 auto",
        textAlign: "center",
        marginTop: 16,
        color: isLight ? "rgba(0,0,0,0.45)" : "rgba(255,255,255,0.45)",
        fontSize: 12,
        lineHeight: 1.6,
        letterSpacing: 0.3,
        transition: "color 0.5s ease",
      }}
    >
      <div>{t("copyright", { company })}</div>
      <div>{t("tagline")}</div>
    </footer>
  );
}
