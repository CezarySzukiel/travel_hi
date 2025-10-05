// src/ThemeContext.tsx
import React, { createContext, useMemo, useState, type ReactNode } from "react";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { createTheme, type Theme } from "@mui/material/styles";
import { lightTheme, darkTheme, contrastTheme } from "./theme";

export type ThemeMode = "light" | "dark" | "contrast";
export type FontSize = "small" | "normal" | "large";

export type ThemeContextType = {
  mode: ThemeMode;
  fontSize: FontSize;
  toggleMode: React.Dispatch<React.SetStateAction<ThemeMode>>;
  cycleFontSize: () => void;
  toggleFontSize: (size: FontSize) => void;
};

export const AppThemeContext = createContext<ThemeContextType>({
  mode: "light",
  fontSize: "normal",
  toggleMode: () => {},           // no-op default
  cycleFontSize: () => {},        // no-op default
  toggleFontSize: () => {},       // no-op default
});

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>("dark");
  const [fontSize, setFontSize] = useState<FontSize>("normal");

  const toggleFontSize = (size: FontSize) => setFontSize(size);

  const cycleFontSize = () => {
    setFontSize((prev) =>
      prev === "small" ? "normal" : prev === "normal" ? "large" : "small"
    );
  };

  const theme: Theme = useMemo(() => {
    const base =
      mode === "dark" ? darkTheme : mode === "light" ? lightTheme : contrastTheme;

    const sizeMap: Record<FontSize, number> = {
      small: 12,
      normal: 14,
      large: 18,
    };

    return createTheme(base, {
      typography: {
        ...base.typography,
        fontSize: sizeMap[fontSize],
      },
    });
  }, [mode, fontSize]);

  return (
    <AppThemeContext.Provider
      value={{
        mode,
        fontSize,
        toggleMode: setMode,
        cycleFontSize,
        toggleFontSize,
      }}
    >
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </AppThemeContext.Provider>
  );
}