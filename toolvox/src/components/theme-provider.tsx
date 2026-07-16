"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

interface ThemeState {
  dark: boolean;
  fontSize: number;
  fontFamily: string;
  accentColor: string;
}

export interface ThemeContextType extends ThemeState {
  setDark: (dark: boolean) => void;
  setFontSize: (size: number) => void;
  setFontFamily: (family: string) => void;
  setAccentColor: (color: string) => void;
  lastError: string | null;
  clearError: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

const STORAGE_KEY = "toolvox-theme";

const DEFAULTS: ThemeState = {
  dark: true,
  fontSize: 16,
  fontFamily: "",
  accentColor: "",
};

function loadTheme(): ThemeState {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return { ...DEFAULTS, ...JSON.parse(saved) };
  } catch {}
  return DEFAULTS;
}

function saveTheme(state: ThemeState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

function applyThemeToDOM(state: ThemeState) {
  const root = document.documentElement;

  if (state.dark) {
    root.classList.add("dark");
    root.classList.remove("light");
  } else {
    root.classList.remove("dark");
    root.classList.add("light");
  }

  root.style.fontSize = `${state.fontSize}px`;

  if (state.fontFamily) {
    root.style.fontFamily = state.fontFamily;
  }

  if (state.accentColor) {
    root.style.setProperty("--primary", state.accentColor);
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ThemeState>(DEFAULTS);
  const [mounted, setMounted] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    const saved = loadTheme();
    setState(saved);
    applyThemeToDOM(saved);
    setMounted(true);
  }, []);

  const setDark = useCallback((dark: boolean) => {
    setState((prev) => {
      const next = { ...prev, dark };
      saveTheme(next);
      applyThemeToDOM(next);
      return next;
    });
  }, []);

  const setFontSize = useCallback((fontSize: number) => {
    if (fontSize < 10 || fontSize > 32) {
      setLastError(`Tamaño de fuente inválido: ${fontSize}px (mínimo 10, máximo 32)`);
      return;
    }
    setState((prev) => {
      const next = { ...prev, fontSize };
      saveTheme(next);
      applyThemeToDOM(next);
      return next;
    });
  }, []);

  const setFontFamily = useCallback((fontFamily: string) => {
    if (!fontFamily || fontFamily.trim() === "") {
      setLastError("Familia de fuente vacía");
      return;
    }
    setState((prev) => {
      const next = { ...prev, fontFamily };
      saveTheme(next);
      applyThemeToDOM(next);
      return next;
    });
  }, []);

  const setAccentColor = useCallback((accentColor: string) => {
    if (!accentColor || accentColor.trim() === "") {
      setLastError("Color de acento vacío");
      return;
    }
    setState((prev) => {
      const next = { ...prev, accentColor };
      saveTheme(next);
      applyThemeToDOM(next);
      return next;
    });
  }, []);

  const clearError = useCallback(() => setLastError(null), []);

  return (
    <ThemeContext.Provider
      value={{ ...state, setDark, setFontSize, setFontFamily, setAccentColor, lastError, clearError }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

export function useThemeSafe() {
  return useContext(ThemeContext);
}
