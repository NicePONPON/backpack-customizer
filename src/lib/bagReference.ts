export type ColorSwatch = { name: string; value: string };
export type ColorGroup = { title: string; colors: ColorSwatch[] };

export const COLOR_GROUPS: ColorGroup[] = [
  {
    title: "Core Dark",
    colors: [
      { name: "Charcoal Abyss", value: "#14181A" },
      { name: "Midnight Navy", value: "#384355" },
      { name: "Eclipse Blue", value: "#1C264C" },
      { name: "Nocturne Blue", value: "#28345D" },
      { name: "Regal Tide", value: "#3757AA" },
      { name: "Iced Horizon", value: "#9DB5DA" },
    ],
  },
  {
    title: "Nature Greens",
    colors: [
      { name: "Pine Smoke", value: "#3F5759" },
      { name: "Moss Dusk", value: "#436D62" },
      { name: "Tideglass Blues", value: "#6B9DA7" },
      { name: "Aqua Grove", value: "#5AAEAD" },
      { name: "Mint Dust", value: "#BBD8C6" },
      { name: "Glacial Mint", value: "#F1FFF6" },
    ],
  },
  {
    title: "Light Greens & Yellow",
    colors: [
      { name: "Olive Cream", value: "#D6D9AF" },
      { name: "Lemon Fern", value: "#D7E470" },
      { name: "Butter Glow", value: "#F0E196" },
      { name: "Lime Dew", value: "#E9F7A4" },
      { name: "Vanilla Flare", value: "#FEFCC1" },
      { name: "Ivory Dune", value: "#FFF6DF" },
    ],
  },
  {
    title: "Earth & Brown",
    colors: [
      { name: "Cocoa Drift", value: "#846855" },
      { name: "Rust Ember", value: "#A96341" },
      { name: "Honey Clay", value: "#DDB683" },
      { name: "Faded Almond", value: "#C3B39C" },
      { name: "Golden Wheat", value: "#E6CFA6" },
      { name: "Stone Oat", value: "#DED6BF" },
    ],
  },
  {
    title: "Warm / Red",
    colors: [
      { name: "Cinnamon Clay", value: "#95494C" },
      { name: "Wine Ember", value: "#91343D" },
      { name: "Chili Flame", value: "#D84243" },
      { name: "Apricot Dust", value: "#F1AB7F" },
      { name: "Desert Blush", value: "#EF9896" },
      { name: "Bare Petal", value: "#FEE4DD" },
    ],
  },
  {
    title: "Soft / Neutral",
    colors: [
      { name: "Lavender Mist", value: "#C2BAC7" },
      { name: "Winter Azure", value: "#BCCFE3" },
      { name: "Rose Blush", value: "#E7CEC8" },
      { name: "Feather Rose", value: "#EFE0E5" },
      { name: "Biscuit Beige", value: "#E9CCAD" },
      { name: "Sunlit Cotton", value: "#FEFAE5" },
    ],
  },
  {
    title: "Gray Scale",
    colors: [
      { name: "Ash Steel", value: "#727576" },
      { name: "Frost Gray", value: "#F3F6F5" },
      { name: "Blushed Snow", value: "#FFFDFE" },
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
