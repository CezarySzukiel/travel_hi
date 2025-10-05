import * as React from "react";
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, Chip, Stack, Typography, Alert, MenuItem, TextField,
    Divider, Box, LinearProgress
} from "@mui/material";
import type {DetectResult, TransportMode} from "../types/Transport";

const MODE_LABEL: Record<TransportMode, string> = {
    walk: "Pieszo",
    bike: "Rower/Hulajnoga",
    car: "Auto/Bus",
    train: "Pociąg",
    tram: "Tramwaj",
    unknown: "Nieustalono",
};

type PlanArgs = { mode: TransportMode; when: Date; vehicleId?: string };

type Props = {
    open: boolean;
    result: DetectResult | null;
    onClose: () => void;
    onPlanTrip: (args: PlanArgs) => void;
    onManualDefine: () => void;
};

export default function DetectionResultDialog({
                                                  open, result, onClose, onPlanTrip,
                                              }: Props) {
    const safe = result ?? {
        mode: "unknown" as TransportMode,
        speedKmh: 0,
        samples: [],
        nearbyHint: null,
        alternates: ["walk", "bike", "car", "train", "tram"],
    };

    const [chosen, setChosen] = React.useState<TransportMode>(safe.mode);
    const [vehicleId, setVehicleId] = React.useState("");
    const [vehicleError, setVehicleError] = React.useState<string | null>(null);

    const [searching, setSearching] = React.useState(false);   // trwa „szukanie”
    const [searched, setSearched] = React.useState(false);     // wykonano próbę szukania
    const [notFound, setNotFound] = React.useState(false);     // wynik: nie znaleziono
    const timerRef = React.useRef<number | null>(null);

    React.useEffect(() => {
        setChosen((result?.mode ?? "unknown") as TransportMode);
        setVehicleId("");
        setVehicleError(null);
        setSearching(false);
        setSearched(false);
        setNotFound(false);
        return () => {
            if (timerRef.current) window.clearTimeout(timerRef.current);
        };
    }, [result, open]);

    const noMovement = !isFinite(safe.speedKmh) || safe.speedKmh < 0.8;
    const needsVehicleId = chosen === "train" || chosen === "tram";

    const handleSearch = () => {
        if (needsVehicleId && !vehicleId.trim()) {
            setVehicleError("Podaj numer (ten sam co w aplikacjach biletowych).");
            return;
        }
        setVehicleError(null);
        setSearching(true);
        setSearched(false);
        setNotFound(false);

        timerRef.current = window.setTimeout(() => {
            setSearching(false);
            setSearched(true);
            setNotFound(true);
        }, 5000);
    };

    const handlePlan = () => {
        onPlanTrip({mode: chosen, when: new Date(), vehicleId});
    };

    return (
        <Dialog open={open} onClose={searching ? undefined : onClose} fullWidth maxWidth="sm">
            <DialogTitle>Wynik wykrywania</DialogTitle>

            <DialogContent dividers>
                {safe.mode === "unknown" || noMovement ? (
                    <Alert severity="info" sx={{mb: 2}}>
                        Nie udało się jednoznacznie ustalić środka transportu
                        {noMovement ? " (brak ruchu)" : ""}. Wybierz ręcznie lub zaplanuj podróż.
                    </Alert>
                ) : (
                    <Alert severity="success" sx={{mb: 2}}>
                        Wykryto: <strong>{MODE_LABEL[safe.mode]}</strong> — ~{safe.speedKmh.toFixed(1)} km/h
                    </Alert>
                )}

                {safe.nearbyHint && (
                    <Alert severity="info" sx={{mb: 2}}>
                        Podpowiedź z otoczenia: {safe.nearbyHint}
                    </Alert>
                )}

                {!!safe.alternates?.length && (
                    <Box sx={{mb: 2}}>
                        <Typography variant="subtitle2" gutterBottom>Możliwe alternatywy:</Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                            {safe.alternates.map((m) => (
                                <Chip key={m} label={MODE_LABEL[m]} size="small"/>
                            ))}
                        </Stack>
                    </Box>
                )}

                <Divider sx={{my: 2}}/>

                <Typography variant="subtitle2" gutterBottom>Wybierz tryb:</Typography>
                <TextField
                    select
                    fullWidth
                    value={chosen}
                    onChange={(e) => {
                        setChosen(e.target.value as TransportMode);
                        // reset sekcji numeru
                        setVehicleId("");
                        setVehicleError(null);
                        setSearching(false);
                        setSearched(false);
                        setNotFound(false);
                    }}
                    size="small"
                    disabled={searching}
                >
                    {(["walk", "bike", "car", "train", "tram", "unknown"] as TransportMode[]).map(m => (
                        <MenuItem key={m} value={m}>{MODE_LABEL[m]}</MenuItem>
                    ))}
                </TextField>

                {needsVehicleId && (
                    <Box sx={{mt: 2}}>
                        <TextField
                            fullWidth
                            label={chosen === "train" ? "Numer pociągu" : "Numer tramwaju"}
                            placeholder={chosen === "train" ? "Np. IC 3510 / EIP 5300 / R 22314" : "Np. 8 / 24 / 52"}
                            helperText={vehicleError ?? "Podaj numer używany w aplikacjach do biletów — ułatwia dopasowanie kursu."}
                            error={Boolean(vehicleError)}
                            value={vehicleId}
                            onChange={(e) => setVehicleId(e.target.value)}
                            disabled={searching}
                        />

                        <Stack direction="row" spacing={1} sx={{mt: 1}}>
                            <Button variant="outlined" onClick={handleSearch} disabled={searching}>
                                Szukaj
                            </Button>
                        </Stack>

                        {searching && (
                            <Box sx={{mt: 2}}>
                                <LinearProgress/>
                                <Typography variant="body2" sx={{mt: 1}}>
                                    Szukam w bazie…
                                </Typography>
                            </Box>
                        )}

                        {searched && notFound && !searching && (
                            <Alert severity="warning" sx={{mt: 2}}>
                                Nie znaleziono kursu po tym numerze w Twojej lokalizacji. Spróbuj innego numeru lub
                                przejdź do planowania podróży.
                            </Alert>
                        )}
                    </Box>
                )}
            </DialogContent>

            <DialogActions>
                <Button variant="contained" onClick={handlePlan}
                        disabled={searching || (needsVehicleId && !vehicleId.trim())}>
                    Zaplanuj podróż
                </Button>
                <Button onClick={onClose} disabled={searching}>Zamknij</Button>
            </DialogActions>
        </Dialog>
    );
}