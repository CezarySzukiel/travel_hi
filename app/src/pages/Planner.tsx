import * as React from "react";
import {
    Box,
    Card,
    CardContent,
    CardActions,
    Stack,
    TextField,
    Button,
    ToggleButtonGroup,
    ToggleButton,
    Typography,
    Alert,
    LinearProgress,
    Chip,
    Divider,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Grid
} from "@mui/material";

import DirectionsTransitIcon from "@mui/icons-material/DirectionsTransit";
import DirectionsWalkIcon from "@mui/icons-material/DirectionsWalk";
import TransferWithinAStationIcon from "@mui/icons-material/TransferWithinAStation";
import ScheduleIcon from "@mui/icons-material/Schedule";

import {DateTimePicker, LocalizationProvider} from "@mui/x-date-pickers";
import {AdapterDateFns} from "@mui/x-date-pickers/AdapterDateFns";
import {pl} from "date-fns/locale";

import {useJsApiLoader, GoogleMap, Autocomplete, DirectionsRenderer} from "@react-google-maps/api";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string;
const DEFAULT_CENTER = {lat: 50.067549, lng: 19.991471};

type Mode = "departure" | "arrival";

type Segment =
    | {
    kind: "transit";
    vehicle: string;
    line: string;
    headsign?: string | null;
    depStop: string;
    arrStop: string;
    depTimeText?: string;
    arrTimeText?: string;
    depTime?: Date | null;
    arrTime?: Date | null;
    numStops?: number | null;
    durationText?: string | null;
}
    | {
    kind: "walk";
    durationText?: string | null;
    distanceText?: string | null;
    instruction?: string | null;
};

export default function TransitRoutePlanner() {
    const [origin, setOrigin] = React.useState<string>("");
    const [destination, setDestination] = React.useState<string>("");
    const [date, setDate] = React.useState<Date>(new Date());
    const [mode, setMode] = React.useState<Mode>("departure");

    const originAC = React.useRef<google.maps.places.Autocomplete | null>(null);
    const destAC = React.useRef<google.maps.places.Autocomplete | null>(null);

    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [directions, setDirections] = React.useState<google.maps.DirectionsResult | null>(null);
    const [segments, setSegments] = React.useState<Segment[]>([]);

    // ✅ Ładujemy SDK tylko raz, hookiem
    const {isLoaded, loadError} = useJsApiLoader({
        id: "gmaps-sdk",
        googleMapsApiKey: GOOGLE_MAPS_API_KEY || "",
        libraries: ["places"],
    });

    const apiKeyMissing = !GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY.trim().length === 0;

    const onLoadOrigin = (ac: google.maps.places.Autocomplete) => (originAC.current = ac);
    const onLoadDest = (ac: google.maps.places.Autocomplete) => (destAC.current = ac);

    const onOriginPlaceChanged = () => {
        const place = originAC.current?.getPlace();
        if (place?.formatted_address) setOrigin(place.formatted_address);
        else if (place?.name) setOrigin(place.name);
    };

    const onDestPlaceChanged = () => {
        const place = destAC.current?.getPlace();
        if (place?.formatted_address) setDestination(place.formatted_address);
        else if (place?.name) setDestination(place.name);
    };

    const handlePlan = async () => {
        setError(null);
        setDirections(null);
        setSegments([]);

        if (!origin || !destination) {
            setError("Podaj punkt początkowy i docelowy.");
            return;
        }
        if (!isLoaded || !(window.google && window.google.maps)) {
            setError("Google Maps SDK nie jest jeszcze gotowy.");
            return;
        }

        setLoading(true);
        try {
            const svc = new google.maps.DirectionsService();

            const req: google.maps.DirectionsRequest = {
                origin,
                destination,
                travelMode: google.maps.TravelMode.TRANSIT,
                transitOptions: {
                    modes: [
                        google.maps.TransitMode.BUS,
                        google.maps.TransitMode.RAIL,
                        google.maps.TransitMode.SUBWAY,
                        google.maps.TransitMode.TRAM,
                        google.maps.TransitMode.TRAIN,
                    ],
                    routingPreference: google.maps.TransitRoutePreference.FEWER_TRANSFERS,
                    ...(mode === "departure" ? {departureTime: date} : {arrivalTime: date}),
                },
                provideRouteAlternatives: true,
            };

            const res = await svc.route(req);
            if (!res.routes?.length) throw new Error("Brak trasy dla podanych parametrów.");
            setDirections(res);

            const leg = res.routes[0]?.legs?.[0];
            const steps = leg?.steps ?? [];

            const parsed: Segment[] = steps.map((step) => {
                if (step.travel_mode === google.maps.TravelMode.TRANSIT && step.transit) {
                    const td = step.transit!;
                    const vehType = td.line?.vehicle?.type;
                    const vehicle = td.line?.vehicle?.name || td.line?.vehicle?.type || "TRANSIT";
                    return {
                        kind: "transit",
                        vehicle: String(vehType ?? vehicle).toUpperCase(),
                        line: td.line?.short_name || td.line?.name || "—",
                        headsign: td.headsign ?? null,
                        depStop: td.departure_stop?.name ?? "—",
                        arrStop: td.arrival_stop?.name ?? "—",
                        depTimeText: (td.departure_time as any)?.text ?? undefined,
                        arrTimeText: (td.arrival_time as any)?.text ?? undefined,
                        depTime: ((td.departure_time as any)?.value as Date) ?? null,
                        arrTime: ((td.arrival_time as any)?.value as Date) ?? null,
                        numStops: td.num_stops ?? null,
                        durationText: step.duration?.text ?? null,
                    };
                }
                return {
                    kind: "walk",
                    durationText: step.duration?.text ?? null,
                    distanceText: step.distance?.text ?? null,
                    instruction: (step.instructions as unknown as string) ?? null,
                };
            });

            // scal piesze odcinki
            const merged: Segment[] = [];
            for (const s of parsed) {
                const last = merged[merged.length - 1];
                if (last && last.kind === "walk" && s.kind === "walk") {
                    merged[merged.length - 1] = {
                        kind: "walk",
                        durationText: [last.durationText, s.durationText].filter(Boolean).join(" + "),
                        distanceText: [last.distanceText, s.distanceText].filter(Boolean).join(" + "),
                        instruction: last.instruction || s.instruction || "Przejście pieszo",
                    };
                } else {
                    merged.push(s);
                }
            }
            setSegments(merged);
        } catch (e: any) {
            setError(e?.message ?? "Nie udało się pobrać trasy.");
        } finally {
            setLoading(false);
        }
    };

    const primaryLeg = directions?.routes?.[0]?.legs?.[0];
    const summary = primaryLeg
        ? {
            duration: primaryLeg.duration?.text,
            distance: primaryLeg.distance?.text,
            steps: primaryLeg.steps?.length ?? 0,
            dep: (primaryLeg.departure_time as any)?.text as string | undefined,
            arr: (primaryLeg.arrival_time as any)?.text as string | undefined,
        }
        : null;

    return (
        <Card>
            <CardContent>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                    Trasa komunikacją publiczną
                </Typography>

                {/* Formularz */}
                <Stack spacing={2} sx={{mb: 2}}>
                    <Stack direction={{xs: "column", md: "row"}} spacing={2}>
                        <Autocomplete onLoad={onLoadOrigin} onPlaceChanged={onOriginPlaceChanged}>
                            <TextField
                                fullWidth
                                label="Skąd"
                                placeholder="np. Kraków Główny"
                                value={origin}
                                onChange={(e) => setOrigin(e.target.value)}
                            />
                        </Autocomplete>
                        <Autocomplete onLoad={onLoadDest} onPlaceChanged={onDestPlaceChanged}>
                            <TextField
                                fullWidth
                                label="Dokąd"
                                placeholder="np. Wieliczka Rynek-Kopalnia"
                                value={destination}
                                onChange={(e) => setDestination(e.target.value)}
                            />
                        </Autocomplete>
                    </Stack>

                    <Stack direction={{xs: "column", md: "row"}} spacing={2} alignItems="center">
                        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={pl}>
                            <DateTimePicker
                                label="Data i godzina"
                                value={date}
                                onChange={(d) => d && setDate(d)}
                                slotProps={{textField: {fullWidth: true}}}
                            />
                        </LocalizationProvider>

                        <ToggleButtonGroup
                            value={mode}
                            exclusive
                            onChange={(_, v) => v && setMode(v)}
                            size="small"
                        >
                            <ToggleButton value="departure">Odjazd</ToggleButton>
                            <ToggleButton value="arrival">Przyjazd</ToggleButton>
                        </ToggleButtonGroup>

                        <Button variant="contained" onClick={handlePlan} disabled={!isLoaded}>
                            Pokaż trasę
                        </Button>
                    </Stack>
                </Stack>

                {loading && <LinearProgress/>}
                {error && <Alert severity="error" sx={{mt: 1}}>{error}</Alert>}
                {summary && (
                    <Stack direction="row" spacing={1} sx={{mt: 1, flexWrap: "wrap"}}>
                        {summary.dep && <Chip icon={<ScheduleIcon/>} label={`Odjazd: ${summary.dep}`}/>}
                        {summary.arr && <Chip icon={<ScheduleIcon/>} label={`Przyjazd: ${summary.arr}`}/>}
                        <Chip label={`Czas: ${summary.duration}`}/>
                        <Chip label={`Dystans: ${summary.distance}`}/>
                        <Chip label={`Odcinki: ${summary.steps}`}/>
                    </Stack>
                )}

                {apiKeyMissing && (
                    <Alert severity="warning" sx={{mt: 2}}>
                        Brakuje klucza <code>VITE_GOOGLE_MAPS_API_KEY</code>. Dodaj go do <code>.env</code> i zrestartuj
                        serwer.
                    </Alert>
                )}
                {loadError && (
                    <Alert severity="error" sx={{mt: 2}}>
                        Błąd ładowania Google Maps SDK.
                    </Alert>
                )}

                {/* Layout: mapa po lewej, szczegóły po prawej */}
                <Grid container spacing={2} sx={{mt: 2}}>
                    <Grid size={{xs: 12, md: 7}}>
                        <Box sx={{height: "52vh"}}>
                            {!isLoaded ? (
                                <Box
                                    sx={{
                                        height: "100%",
                                        borderRadius: 2,
                                        bgcolor: "action.hover",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                    }}
                                >
                                    <Typography variant="body2" color="text.secondary">
                                        Ładowanie mapy…
                                    </Typography>
                                </Box>
                            ) : (
                                <GoogleMap
                                    mapContainerStyle={{width: "100%", height: "100%", borderRadius: 12}}
                                    center={DEFAULT_CENTER}
                                    zoom={12}
                                    options={{
                                        streetViewControl: false,
                                        fullscreenControl: false,
                                        mapTypeControl: false,
                                    }}
                                >
                                    {directions && (
                                        <DirectionsRenderer
                                            directions={directions}
                                            options={{
                                                suppressMarkers: false,
                                                preserveViewport: false,
                                                polylineOptions: {
                                                    strokeColor: "#34d399",
                                                    strokeOpacity: 0.9,
                                                    strokeWeight: 5,
                                                },
                                            }}
                                        />
                                    )}
                                </GoogleMap>
                            )}
                        </Box>
                    </Grid>

                    <Grid size={{xs: 12, md: 5}}>
                        {segments.length > 0 && (
                            <Card
                                variant="outlined"
                                sx={{
                                    position: {md: "sticky"},
                                    top: {md: 88},
                                    maxHeight: {md: "calc(100vh - 120px)"},
                                    overflow: "auto",
                                }}
                            >
                                <CardContent>
                                    <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                                        Szczegóły połączenia
                                    </Typography>

                                    <List dense>
                                        {segments.map((s, idx) => (
                                            <React.Fragment key={idx}>
                                                <ListItem alignItems="flex-start">
                                                    <ListItemIcon sx={{minWidth: 36}}>
                                                        {s.kind === "transit" ? <DirectionsTransitIcon/> :
                                                            <DirectionsWalkIcon/>}
                                                    </ListItemIcon>

                                                    {s.kind === "transit" ? (
                                                        <ListItemText
                                                            primaryTypographyProps={{component: "div"}}
                                                            secondaryTypographyProps={{component: "div"}}
                                                            primary={
                                                                <Stack direction="row" spacing={1} alignItems="center"
                                                                       flexWrap="wrap">
                                                                    <Chip size="small" color="primary"
                                                                          label={s.vehicle}/>
                                                                    <Chip size="small" variant="outlined"
                                                                          label={`Linia: ${s.line}`}/>
                                                                    {s.headsign && (
                                                                        <Chip size="small" variant="outlined"
                                                                              label={`Kierunek: ${s.headsign}`}/>
                                                                    )}
                                                                </Stack>
                                                            }
                                                            secondary={
                                                                <Box sx={{mt: 0.5}}>
                                                                    <Typography component="div" variant="body2">
                                                                        <strong>{s.depStop}</strong>
                                                                        {s.depTimeText ? ` — ${s.depTimeText}` : ""} →{" "}
                                                                        <strong>{s.arrStop}</strong>
                                                                        {s.arrTimeText ? ` — ${s.arrTimeText}` : ""}
                                                                    </Typography>
                                                                    <Typography component="div" variant="caption"
                                                                                color="text.secondary">
                                                                        {s.numStops != null ? `Przystanków: ${s.numStops}. ` : ""}
                                                                        {s.durationText ? `Czas odcinka: ${s.durationText}` : ""}
                                                                    </Typography>
                                                                </Box>
                                                            }
                                                        />
                                                    ) : (
                                                        <ListItemText
                                                            primaryTypographyProps={{component: "div"}}
                                                            secondaryTypographyProps={{component: "div"}}
                                                            primary={
                                                                <Stack direction="row" spacing={1} alignItems="center"
                                                                       flexWrap="wrap">
                                                                    <TransferWithinAStationIcon fontSize="small"/>
                                                                    <Typography component="span" fontWeight={600}>
                                                                        Przejście pieszo / Transfer
                                                                    </Typography>
                                                                </Stack>
                                                            }
                                                            secondary={
                                                                <Typography component="div" variant="body2"
                                                                            color="text.secondary">
                                                                    {(s.instruction && s.instruction.replace(/<[^>]+>/g, "")) ||
                                                                        "Przejście do następnego odcinka."}{" "}
                                                                    {s.distanceText ? `(${s.distanceText})` : ""}{" "}
                                                                    {s.durationText ? `— ${s.durationText}` : ""}
                                                                </Typography>
                                                            }
                                                        />
                                                    )}
                                                </ListItem>
                                                {idx < segments.length - 1 && <Divider component="li"/>}
                                            </React.Fragment>
                                        ))}
                                    </List>
                                </CardContent>
                            </Card>
                        )}
                    </Grid>
                </Grid>
            </CardContent>

            <CardActions>
                <Typography variant="caption" color="text.secondary" sx={{ml: 1}}>
                    Tryb: public transit (BUS, TRAM, TRAIN, SUBWAY). Użyj Odjazd/Przyjazd dla ustawienia czasu.
                </Typography>
            </CardActions>
        </Card>
    );
}