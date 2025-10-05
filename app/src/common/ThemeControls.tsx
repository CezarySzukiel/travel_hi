// src/common/ThemeControls.tsx
import { useContext } from "react";
import { AppThemeContext, type ThemeMode } from "../ThemeContext";
import { IconButton, Tooltip, Box } from "@mui/material";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import InvertColorsIcon from "@mui/icons-material/InvertColors";
import TextIncreaseIcon from "@mui/icons-material/TextIncrease";

export default function ThemeControls() {
  const { mode, fontSize, toggleMode, cycleFontSize } = useContext(AppThemeContext);

  const contrastColor = "#FFD600";
  const iconColorSx = mode === "contrast" ? { color: contrastColor } : undefined;

  const fontSizeLabel =
    fontSize === "small"
      ? "Mała czcionka"
      : fontSize === "normal"
      ? "Normalna czcionka"
      : "Duża czcionka";

  const isSelected = (m: ThemeMode) => mode === m;

  return (
    <Box display="flex" gap={1}>
      <Tooltip title="Light mode">
        <IconButton
          color={isSelected("light") ? "primary" : "default"}
          onClick={() => toggleMode("light")}
          sx={iconColorSx}
        >
          <LightModeIcon />
        </IconButton>
      </Tooltip>

      <Tooltip title="Dark mode">
        <IconButton
          color={isSelected("dark") ? "primary" : "default"}
          onClick={() => toggleMode("dark")}
          sx={iconColorSx}
        >
          <DarkModeIcon />
        </IconButton>
      </Tooltip>

      <Tooltip title="High contrast">
        <IconButton
          color={isSelected("contrast") ? "primary" : "default"}
          onClick={() => toggleMode("contrast")}
          sx={iconColorSx}
        >
          <InvertColorsIcon />
        </IconButton>
      </Tooltip>

      <Tooltip title={fontSizeLabel}>
        <IconButton onClick={cycleFontSize} sx={iconColorSx}>
          <TextIncreaseIcon />
        </IconButton>
      </Tooltip>
    </Box>
  );
}