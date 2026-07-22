export interface ThemeConfig {
  id: string;
  name: string;
  colorHex: string;
  className: string;
}

export const THEME_PRESETS: ThemeConfig[] = [
  {
    id: "emerald",
    name: "สยามมรกต (ค่าเริ่มต้น)",
    colorHex: "#10b981",
    className: "theme-emerald",
  },
  {
    id: "wmdev",
    name: "WM Dev Custom",
    colorHex: "#a855f7",
    className: "theme-wmdev",
  },
  {
    id: "cloudflare",
    name: "Cloudflare Orange",
    colorHex: "#f97316",
    className: "theme-cloudflare",
  },
  {
    id: "ocean",
    name: "Ocean Navy",
    colorHex: "#2563eb",
    className: "theme-ocean",
  },
  {
    id: "violet",
    name: "Amethyst Elegant",
    colorHex: "#8b5cf6",
    className: "theme-violet",
  },
  {
    id: "amber",
    name: "Warm Amber",
    colorHex: "#d97706",
    className: "theme-amber",
  },
  {
    id: "slate",
    name: "Slate Neutral",
    colorHex: "#64748b",
    className: "theme-slate",
  },
];

export const getThemeConfig = (id: string): ThemeConfig => {
  return THEME_PRESETS.find((t) => t.id === id) || THEME_PRESETS[0];
};
