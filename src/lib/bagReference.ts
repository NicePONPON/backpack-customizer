export type ColorSwatch = { key: string; name: string; value: string };
export type ColorGroup = { titleKey: string; title: string; colors: ColorSwatch[] };

export const COLOR_GROUPS: ColorGroup[] = [
  {
    titleKey: "coreDark",
    title: "Core Dark",
    colors: [
      { key: "charcoalAbyss", name: "Charcoal Abyss", value: "#14181A" },
      { key: "midnightNavy", name: "Midnight Navy", value: "#384355" },
      { key: "eclipseBlue", name: "Eclipse Blue", value: "#1C264C" },
      { key: "nocturneBlue", name: "Nocturne Blue", value: "#28345D" },
      { key: "regalTide", name: "Regal Tide", value: "#3757AA" },
      { key: "icedHorizon", name: "Iced Horizon", value: "#9DB5DA" },
    ],
  },
  {
    titleKey: "natureGreens",
    title: "Nature Greens",
    colors: [
      { key: "pineSmoke", name: "Pine Smoke", value: "#3F5759" },
      { key: "mossDusk", name: "Moss Dusk", value: "#436D62" },
      { key: "tideglassBlues", name: "Tideglass Blues", value: "#6B9DA7" },
      { key: "aquaGrove", name: "Aqua Grove", value: "#5AAEAD" },
      { key: "mintDust", name: "Mint Dust", value: "#BBD8C6" },
      { key: "glacialMint", name: "Glacial Mint", value: "#F1FFF6" },
    ],
  },
  {
    titleKey: "lightGreensYellow",
    title: "Light Greens & Yellow",
    colors: [
      { key: "oliveCream", name: "Olive Cream", value: "#D6D9AF" },
      { key: "lemonFern", name: "Lemon Fern", value: "#D7E470" },
      { key: "butterGlow", name: "Butter Glow", value: "#F0E196" },
      { key: "limeDew", name: "Lime Dew", value: "#E9F7A4" },
      { key: "vanillaFlare", name: "Vanilla Flare", value: "#FEFCC1" },
      { key: "ivoryDune", name: "Ivory Dune", value: "#FFF6DF" },
    ],
  },
  {
    titleKey: "earthBrown",
    title: "Earth & Brown",
    colors: [
      { key: "cocoaDrift", name: "Cocoa Drift", value: "#846855" },
      { key: "rustEmber", name: "Rust Ember", value: "#A96341" },
      { key: "honeyClay", name: "Honey Clay", value: "#DDB683" },
      { key: "fadedAlmond", name: "Faded Almond", value: "#C3B39C" },
      { key: "goldenWheat", name: "Golden Wheat", value: "#E6CFA6" },
      { key: "stoneOat", name: "Stone Oat", value: "#DED6BF" },
    ],
  },
  {
    titleKey: "warmRed",
    title: "Warm / Red",
    colors: [
      { key: "cinnamonClay", name: "Cinnamon Clay", value: "#95494C" },
      { key: "wineEmber", name: "Wine Ember", value: "#91343D" },
      { key: "chiliFlame", name: "Chili Flame", value: "#D84243" },
      { key: "apricotDust", name: "Apricot Dust", value: "#F1AB7F" },
      { key: "desertBlush", name: "Desert Blush", value: "#EF9896" },
      { key: "barePetal", name: "Bare Petal", value: "#FEE4DD" },
    ],
  },
  {
    titleKey: "softNeutral",
    title: "Soft / Neutral",
    colors: [
      { key: "lavenderMist", name: "Lavender Mist", value: "#C2BAC7" },
      { key: "winterAzure", name: "Winter Azure", value: "#BCCFE3" },
      { key: "roseBlush", name: "Rose Blush", value: "#E7CEC8" },
      { key: "featherRose", name: "Feather Rose", value: "#EFE0E5" },
      { key: "biscuitBeige", name: "Biscuit Beige", value: "#E9CCAD" },
      { key: "sunlitCotton", name: "Sunlit Cotton", value: "#FEFAE5" },
    ],
  },
  {
    titleKey: "grayScale",
    title: "Gray Scale",
    colors: [
      { key: "ashSteel", name: "Ash Steel", value: "#727576" },
      { key: "frostGray", name: "Frost Gray", value: "#F3F6F5" },
      { key: "blushedSnow", name: "Blushed Snow", value: "#FFFDFE" },
    ],
  },
];

export function getDisplayName(part: string | null): string {
  if (!part) return "None";
  if (part === "FRONT_BACK_SIDE") return "Side Part";
  if (part.startsWith("Back_Main")) return "Back Central Part";
  if (part.startsWith("Back_Strap")) return "Strap";
  if (part.startsWith("Band")) return "Band";
  if (part.startsWith("Back_Side")) return "Back Side Part";
  if (part.startsWith("Bottom")) return "Bottom";
  if (part.startsWith("SidePanel")) return "Side Panel";
  if (part.startsWith("Side_")) return "Side Part";
  if (part.startsWith("Front_Main_Bottom")) return "Front Bottom Part";
  if (part.startsWith("Front_Main_Top")) return "Front Top Part";
  if (part.startsWith("Front_Side")) return "Front Side Part";
  return part;
}

export function getColorName(hex: string): string {
  for (const group of COLOR_GROUPS) {
    const found = group.colors.find((c) => c.value === hex);
    if (found) return found.name;
  }
  return hex;
}
