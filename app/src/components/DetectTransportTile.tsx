import * as React from "react";
import {
  Card, CardContent, CardActions, Button, Typography, Stack, CircularProgress, Alert, Chip,
} from "@mui/material";
import type { DetectResult, Sample, TransportMode } from "../types/Transport";
import { estimateSpeedKmh, classifyMode, makeUnknownResult } from "../helpers/transport";

type Props = {
  detectSeconds?: number;
  useNearbyHint?: boolean;               // jeśli true, spróbujemy Places API
  onComplete?: (res: DetectResult & {
    nearbyHint?: string | null;
    alternates?: TransportMode[];
  }) => void;
};

// tylko tutaj – by nie dublować w innych plikach
function alternatesFor(speedKmh: number): TransportMode[] {
  const out: TransportMode[] = [];
  if (speedKmh >= 2 && speedKmh < 10) out.push("walk", "bike");
  else if (speedKmh >= 10 && speedKmh < 40) out.push("bike", "car");
  else if (speedKmh >= 40 && speedKmh < 120) out.push("car", "train");
  else if (speedKmh >= 120) out.push("train", "car");
  return Array.from(new Set(out));
}

async function findTransitHint(sample: Sample): Promise<string | null> {
  const g = (window as any).google;
  if (!g?.maps?.places) return null;
  const loc = new g.maps.LatLng(sample.lat, sample.lng);
  const svc = new g.maps.places.PlacesService(document.createElement("div"));
  return new Promise((resolve) => {
    svc.nearbySearch(
      {
        location: loc,
        radius: 250,
        type: [
          "transit_station",
          "train_station",
          "bus_station",
          "subway_station",
          "light_rail_station",
        ],
      } as any,
      (results: any[], status: any) => {
        if (status === g.maps.places.PlacesServiceStatus.OK && results?.length) {
          resolve(`W pobliżu: ${results[0]?.name ?? "przystanek/stacja"}`);
        } else {
          resolve(null);
        }
      }
    );
  });
}

export default function DetectTransportTile({
  detectSeconds = 12,
  useNearbyHint = true,
  onComplete,
}: Props) {
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
        if (acc != null && acc > 50) return; // odfiltruj mocno niepewne
        samplesRef.current.push({
          ts: Date.now(),
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          // @ts-ignore (jeśli Sample nie ma accuracy w typie, usuń tę linię lub dodaj w typach)
          accuracy: acc,
          speedFromAPI: Number.isFinite(pos.coords.speed) ? pos.coords.speed : null,
        });
      },
      (err) => {
        setError(`Błąd lokalizacji: ${err.message}`);
        stopAll();
        const fallback = makeUnknownResult();
        setResult(fallback);
        onComplete?.({ ...fallback, alternates: ["walk", "bike", "car", "train"] });
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

  const stopAndEstimate = async () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }

    try {
      const samples = samplesRef.current;
      if (samples.length < 2) {
        const fallback = makeUnknownResult();
        setResult(fallback);
        onComplete?.({ ...fallback, alternates: ["walk", "bike", "car", "train"] });
        return;
      }

      const speedKmh = estimateSpeedKmh(samples);
      const mode = classifyMode(speedKmh);

      let nearbyHint: string | null = null;
      if (useNearbyHint) {
        try {
          const last = samples.at(-1)!;
          nearbyHint = await findTransitHint(last);
        } catch {
          /* opcjonalne */
        }
      }

      const res: DetectResult = { mode, speedKmh, samples };
      setResult(res);
      onComplete?.({
        ...res,
        nearbyHint,
        alternates: alternatesFor(speedKmh).filter((m) => m !== mode),
      });
    } finally {
      setDetecting(false);
    }
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