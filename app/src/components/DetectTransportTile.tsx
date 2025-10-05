import * as React from "react";
import {
  Card, CardContent, CardActions, Button, Typography, Stack, CircularProgress, Alert, Chip,
} from "@mui/material";
import type { DetectResult, Sample } from "../types/Transport";
import { estimateSpeedKmh, classifyMode } from "../helpers/transport";

type Props = {
  detectSeconds?: number;
  onComplete?: (res: DetectResult) => void;
};

export default function DetectTransportTile({ detectSeconds = 12, onComplete }: Props) {
  const [detecting, setDetecting] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<DetectResult | null>(null);

  const samplesRef = React.useRef<Sample[]>([]);
  const watchIdRef = React.useRef<number | null>(null);
  const timerRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
    };
  }, []);

  const start = () => {
    setError(null);
    setResult(null);
    setDetecting(true);
    setProgress(0);
    samplesRef.current = [];

    if (!("geolocation" in navigator)) {
      setError("Twoja przeglądarka nie obsługuje geolokalizacji.");
      setDetecting(false);
      return;
    }

    let elapsed = 0;
    timerRef.current = window.setInterval(() => {
      elapsed += 0.5;
      setProgress(Math.min(100, Math.round((elapsed / detectSeconds) * 100)));
      if (elapsed >= detectSeconds) stopAndEstimate();
    }, 500);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const acc = Number.isFinite(pos.coords.accuracy) ? pos.coords.accuracy : null;
        if (acc != null && acc > 50) return;
        samplesRef.current.push({
          ts: Date.now(),
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: acc,
          speedFromAPI: Number.isFinite(pos.coords.speed) ? pos.coords.speed : null,
        });
      },
      (err) => {
        setError(`Błąd lokalizacji: ${err.message}`);
        stopAll();
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    );
  };

  const stopAll = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setDetecting(false);
    setProgress(0);
  };

  const stopAndEstimate = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const samples = samplesRef.current;
    if (samples.length < 2) {
      setError("Zbyt mało próbek, spróbuj ponownie.");
      setDetecting(false);
      onComplete?.({ mode: "unknown", speedKmh: 0, samples });
      return;
    }

    const speedKmh = estimateSpeedKmh(samples);
    const mode = classifyMode(speedKmh);
    const res: DetectResult = { mode, speedKmh, samples };
    setResult(res);
    setDetecting(false);
    onComplete?.(res);
  };

  return (
    <Card sx={{ height: "100%" }}>
      <CardContent>
        <Typography variant="h6" fontWeight={700}>Wykryj transport</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Uruchom wykrywanie – oszacujemy prędkość i podpowiemy środek transportu.
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {detecting && (
          <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 1 }}>
            <CircularProgress size={24} />
            <Typography>Postęp: {progress}%</Typography>
          </Stack>
        )}

        {result && (
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="body2">
              Szacowana prędkość: <strong>{result.speedKmh.toFixed(1)} km/h</strong>
            </Typography>
            <Chip
              label={
                result.mode === "walk" ? "Pieszo"
                  : result.mode === "bike" ? "Rower/Hulajnoga"
                  : result.mode === "car" ? "Auto/Bus"
                  : result.mode === "train" ? "Pociąg" : "Nieznany"
              }
              color={
                result.mode === "train" ? "success"
                  : result.mode === "car" ? "primary"
                  : result.mode === "bike" ? "warning"
                  : result.mode === "walk" ? "default" : "info"
              }
              size="small"
            />
          </Stack>
        )}
      </CardContent>

      <CardActions>
        {!detecting ? (
          <Button variant="contained" onClick={start}>Start</Button>
        ) : (
          <Button variant="outlined" onClick={stopAll}>Przerwij</Button>
        )}
      </CardActions>
    </Card>
  );
}