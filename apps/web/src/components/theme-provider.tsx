import { createContext, useContext, useEffect, useState } from "react";
import { THEME_PRESETS, getThemeConfig } from "../lib/theme-config.ts";

export type ThemeMode = "light" | "dark" | "system";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultPreset?: string;
  defaultMode?: ThemeMode;
  defaultTheme?: ThemeMode; // Compatibility prop
  presetKey?: string;
  modeKey?: string;
  storageKey?: string; // Compatibility prop
};

type ThemeProviderState = {
  preset: string;
  mode: ThemeMode;
  theme: ThemeMode; // Compatibility alias
  setPreset: (preset: string) => void;
  setMode: (mode: ThemeMode) => void;
  setTheme: (mode: ThemeMode) => void; // Compatibility alias
};

const initialState: ThemeProviderState = {
  preset: "emerald",
  mode: "system",
  theme: "system",
  setPreset: () => null,
  setMode: () => null,
  setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultPreset = "emerald",
  defaultMode = "system",
  defaultTheme,
  presetKey = "vite-ui-theme-preset",
  modeKey = "vite-ui-theme-mode",
  storageKey,
  ...props
}: ThemeProviderProps) {
  const effectiveModeKey = storageKey || modeKey;
  const effectiveDefaultMode = defaultTheme || defaultMode;

  const [preset, setPresetState] = useState<string>(
    () => localStorage.getItem(presetKey) || defaultPreset
  );
  const [mode, setModeState] = useState<ThemeMode>(
    () => (localStorage.getItem(effectiveModeKey) as ThemeMode) || effectiveDefaultMode
  );

  useEffect(() => {
    const root = window.document.documentElement;

    // 1. Reset all mode classes
    root.classList.remove("light", "dark");

    // 2. Apply Theme Mode (light / dark)
    let activeMode = mode;
    if (mode === "system") {
      activeMode = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    root.classList.add(activeMode);

    // 3. Reset all registered theme preset classes dynamically
    THEME_PRESETS.forEach((t) => {
      if (t.className) {
        root.classList.remove(t.className);
      }
    });

    // 4. Apply selected theme preset class
    const activeConfig = getThemeConfig(preset);
    if (activeConfig && activeConfig.className) {
      root.classList.add(activeConfig.className);
    }
  }, [preset, mode]);

  const value = {
    preset,
    mode,
    theme: mode, // Compatibility alias
    setPreset: (newPreset: string) => {
      localStorage.setItem(presetKey, newPreset);
      setPresetState(newPreset);
    },
    setMode: (newMode: ThemeMode) => {
      localStorage.setItem(effectiveModeKey, newMode);
      setModeState(newMode);
    },
    setTheme: (newMode: ThemeMode) => {
      localStorage.setItem(effectiveModeKey, newMode);
      setModeState(newMode);
    },
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");
  return context;
};
