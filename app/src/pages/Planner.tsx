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
} from "@mui/material";
import { DateTimePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { pl } from "date-fns/locale";

import {
  GoogleMap,
  LoadScript,
  Autocomplete,
  DirectionsRenderer,
} from "@react-google-maps/api";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string;

const mapContainerStyle = { width: "100%", height: "55vh", borderRadius: 12 };
const DEFAULT_CENTER = { lat: 50.067549, lng: 19.991471 };

type Mode = "departure" | "arrival";

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

  if (!origin || !destination) {
    setError("Podaj punkt początkowy i docelowy.");
    return;
  }
  if (!(window.google && window.google.maps)) {
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
        ...(mode === "departure" ? { departureTime: date } : { arrivalTime: date }),
      },
      provideRouteAlternatives: true,
      // region: "PL",
    };

    const res = await svc.route(req);

    if (!res.routes || res.routes.length === 0) {
      throw new Error("Brak trasy dla podanych parametrów.");
    }

    setDirections(res);
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
      }
    : null;

  return (
    <LoadScript
      googleMapsApiKey={GOOGLE_MAPS_API_KEY}
      libraries={["places"]}
    >
      <Card>
        <CardContent>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            Trasa komunikacją publiczną
          </Typography>

          <Stack spacing={2} sx={{ mb: 2 }}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
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

            <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="center">
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={pl}>
                <DateTimePicker
                  label="Data i godzina"
                  value={date}
                  onChange={(d) => d && setDate(d)}
                  slotProps={{ textField: { fullWidth: true } }}
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

              <Button variant="contained" onClick={handlePlan}>
                Pokaż trasę
              </Button>
            </Stack>
          </Stack>

          {loading && <LinearProgress />}

          {error && (
            <Alert severity="error" sx={{ mt: 1 }}>
              {error}
            </Alert>
          )}

          {summary && (
            <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: "wrap" }}>
              <Chip label={`Czas: ${summary.duration}`} />
              <Chip label={`Dystans: ${summary.distance}`} />
              <Chip label={`Kroki: ${summary.steps}`} />
            </Stack>
          )}

          <Box sx={{ mt: 2 }}>
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
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
          </Box>
        </CardContent>

        <CardActions>
          <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
            Tryb: public transit (BUS, TRAM, TRAIN, SUBWAY). Użyj Odjazd/Przyjazd dla ustawienia czasu.
          </Typography>
        </CardActions>
      </Card>
    </LoadScript>
  );
}