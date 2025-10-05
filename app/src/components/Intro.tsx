import * as React from "react";
import {
    Box, Button, Card, CardActions, CardContent,
    CircularProgress, Stack, Typography, Alert,
} from "@mui/material";

import DetectionResultDialog, {
    type DetectResult,
    type Sample,
    type TransportMode,
} from "../components/DetectionResultDialog";
import {makeUnknownResult} from "../helpers/transport.ts";

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

export default function Intro(props: {
    onDetectComplete?: (result: DetectResult) => void;   // wywołamy TYLKO, gdy coś faktycznie wykryto
    onManualDefine?: () => void;
    detectSeconds?: number;
    onPlanTrip?: (mode: TransportMode) => void;
}) {
    const detectSec = props.detectSeconds ?? 12;

    const [detecting, setDetecting] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [progress, setProgress] = React.useState(0);
    const [result, setResult] = React.useState<DetectResult | null>(null);
    const [dialogOpen, setDialogOpen] = React.useState(false);

    const samplesRef = React.useRef<Sample[]>([]);
    const watchIdRef = React.useRef<number | null>(null);
    const timerRef = React.useRef<number | null>(null);

    React.useEffect(() => {
        return () => {
            if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
            if (timerRef.current !== null) window.clearInterval(timerRef.current);
        };
    }, []);

    const startDetect = () => {
        setError(null);
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
            setProgress(Math.min(100, Math.round((elapsed / detectSec) * 100)));
            if (elapsed >= detectSec) {
                stopAndEstimate();
            }
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
                const res = makeUnknownResult();
                setResult(res);
                setDialogOpen(true);
                stopAll();
            },
            {enableHighAccuracy: true, maximumAge: 0, timeout: 10000}
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

        const samples = samplesRef.current;
        if (samples.length < 2) {
            setError("Zbyt mało próbek — wybierz ręcznie lub zaplanuj podróż.");
            const res = makeUnknownResult();
            setResult(res);
            setDialogOpen(true);
            setDetecting(false);
            return;
        }

        const speedKmh = estimateSpeedKmh(samples);
        const mode = classifyMode(speedKmh);

        let nearbyHint: string | null = null;
        try {
            const last = samples.at(-1)!;
            nearbyHint = await findTransitHint(last);
        } catch {
        }

        const res: DetectResult = {
            mode,
            speedKmh,
            samples,
            nearbyHint,
            alternates: alternatesFor(speedKmh).filter((m) => m !== mode),
        };

        setResult(res);
        setDialogOpen(true);
        setDetecting(false);

        if (mode !== "unknown") {
            props.onDetectComplete?.(res);
        }
    };

    const handlePlanTrip = (mode: TransportMode) => {
        setDialogOpen(false);
        props.onPlanTrip?.(mode); // np. navigate("/planner?mode=train")
    };

    return (
        <>
            <Box display="grid" justifyContent="center" p={3}>
                <Box maxWidth={720}>
                    <Typography variant="h4" fontWeight={700} gutterBottom>
                        Witaj w TravelHI
                    </Typography>
                    <Typography color="text.secondary" mb={3}>
                        Wybierz, czy chcesz <strong>wykryć podróż automatycznie</strong>, czy{" "}
                        <strong>zdefiniować ją ręcznie</strong>. W trybie wykrywania pobierzemy lokalizację
                        i oszacujemy prędkość, aby określić środek transportu (HI — Hybrid Intelligence).
                    </Typography>

                    {error && (
                        <Alert severity="error" sx={{mb: 2}}>
                            {error}
                        </Alert>
                    )}

                    <Stack direction={{xs: "column", md: "row"}} spacing={2}>
                        {/* Wykrywanie */}
                        <Card sx={{flex: 1}}>
                            <CardContent>
                                <Typography variant="h6">Wykryj podróż (automatycznie)</Typography>
                                <Typography variant="body2" color="text.secondary" mt={1}>
                                    Uruchomimy geolokalizację i zbadamy prędkość ruchu, aby określić:
                                    pieszo / rower / auto / pociąg.
                                </Typography>

                                {detecting ? (
                                    <Box mt={3} display="flex" alignItems="center" gap={2} aria-live="polite">
                                        <CircularProgress/>
                                        <Box>
                                            <Typography>Wykrywanie w toku…</Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Postęp: {progress}%
                                            </Typography>
                                        </Box>
                                    </Box>
                                ) : (
                                    <Typography variant="caption" color="text.secondary" display="block" mt={2}>
                                        Uwaga: potrzebna zgoda na lokalizację. Dane są używane tylko do estymacji trybu.
                                    </Typography>
                                )}
                            </CardContent>
                            <CardActions>
                                {!detecting ? (
                                    <Button variant="contained" onClick={startDetect}>
                                        Wykryj podróż
                                    </Button>
                                ) : (
                                    <Button variant="outlined" onClick={stopAll}>
                                        Przerwij
                                    </Button>
                                )}
                            </CardActions>
                        </Card>

                        {/* Ręczna definicja */}
                        <Card sx={{flex: 1}}>
                            <CardContent>
                                <Typography variant="h6">Zdefiniuj podróż (ręcznie)</Typography>
                                <Typography variant="body2" color="text.secondary" mt={1}>
                                    Sam określ trasę, czas i środek transportu — idealne, gdy nie chcesz używać GPS.
                                </Typography>
                            </CardContent>
                            <CardActions>
                                <Button variant="text" onClick={() => props.onManualDefine?.()}>
                                    Przejdź do definiowania
                                </Button>
                            </CardActions>
                        </Card>
                    </Stack>
                </Box>
            </Box>

            <DetectionResultDialog
                open={dialogOpen}
                result={result}
                onClose={() => setDialogOpen(false)}
                onManualDefine={() => props.onManualDefine?.()}
                onPlanTrip={(mode) => handlePlanTrip(mode)}
            />
        </>
    );
}