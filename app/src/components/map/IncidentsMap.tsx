import * as React from "react";
import { useMemo, useState } from "react";
import { GoogleMap, Marker, InfoWindow } from "@react-google-maps/api";
import {
  Card,
  CardContent,
  Typography,
  Dialog,
  Slide,
  IconButton,
  Box,
  Skeleton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import IncidentDetails from "../../pages/IncidentDetails";
import { useGoogleMaps } from "../../providers/GoogleMapsProvider";

// Minimalny typ na potrzeby mapy (bez severity)
type IncidentLite = {
  id: string;
  title: string;
  description?: string | null;
  lat: number;
  lng: number;
};

const containerStyle: React.CSSProperties = {
  width: "100%",
  height: "80vh",
  borderRadius: "12px",
};

const DEFAULT_CENTER = { lat: 50.067549, lng: 19.991471 };

// przykładowe dane
const sampleIncidents: IncidentLite[] = [
  {
    id: "1",
    title: "Awaria lokomotywy — Kraków Główny",
    description: "Opóźnienie pociągu o 40 minut z powodu awarii.",
    lat: 50.065,
    lng: 19.945,
  },
  {
    id: "2",
    title: "Roboty torowe — Tarnów",
    description: "Prace konserwacyjne torowiska, opóźnienia do 20 minut.",
    lat: 50.013,
    lng: 20.986,
  },
  {
    id: "3",
    title: "Zamknięcie toru — Nowy Sącz",
    description: "Awaria trakcji. Pociągi kursują objazdem.",
    lat: 49.623,
    lng: 20.697,
  },
];

const Transition = Slide;

export const IncidentsMap: React.FC = () => {
  const { isLoaded } = useGoogleMaps();
  const [selected, setSelected] = useState<IncidentLite | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const center = useMemo(() => DEFAULT_CENTER, []);

  // Prosty wektorowy znacznik (bez zewnętrznego URL)
  const markerIcon = useMemo<google.maps.Symbol | undefined>(() => {
    if (!isLoaded || !window.google?.maps) return undefined;
    return {
      path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z",
      fillColor: "#ef4444",
      fillOpacity: 0.95,
      strokeWeight: 0,
      scale: 1.5,
      anchor: new window.google.maps.Point(12, 22),
    };
  }, [isLoaded]);

  // Fallback gdy SDK jeszcze się ładuje (globalnie przez Provider)
  if (!isLoaded) {
    return (
      <Box sx={{ width: "100%", height: "80vh" }}>
        <Skeleton variant="rounded" sx={{ width: "100%", height: "100%", borderRadius: 2 }} />
      </Box>
    );
  }

  return (
    <>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={6}
        options={{
          clickableIcons: false,
          streetViewControl: false,
          fullscreenControl: false,
        }}
      >
        {sampleIncidents.map((incident) => (
          <Marker
            key={incident.id}
            position={{ lat: incident.lat, lng: incident.lng }}
            onClick={() => setSelected(incident)}
            icon={markerIcon}
          />
        ))}

        {selected && (
          <InfoWindow
            position={{ lat: selected.lat, lng: selected.lng }}
            onCloseClick={() => setSelected(null)}
          >
            <Card sx={{ minWidth: 260 }}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700}>
                  {selected.title}
                </Typography>
                {selected.description && (
                  <Typography variant="body2" sx={{ my: 1 }}>
                    {selected.description}
                  </Typography>
                )}
                <Typography
                  variant="body2"
                  color="primary"
                  sx={{ mt: 1, cursor: "pointer", textDecoration: "underline" }}
                  onClick={() => setShowDetails(true)}
                >
                  Zobacz szczegóły →
                </Typography>
              </CardContent>
            </Card>
          </InfoWindow>
        )}
      </GoogleMap>

      {/* Dialog ze szczegółami incydentu */}
      <Dialog
        open={showDetails}
        onClose={() => setShowDetails(false)}
        maxWidth="md"
        fullWidth
        TransitionComponent={Transition}
        PaperProps={{
          sx: {
            borderRadius: "16px",
            backdropFilter: "blur(6px)",
            boxShadow: 10,
            overflow: "hidden",
          },
        }}
      >
        <Box sx={{ position: "relative" }}>
          <IconButton
            onClick={() => setShowDetails(false)}
            sx={{
              position: "absolute",
              top: 8,
              right: 8,
              color: "grey.600",
              zIndex: 1,
            }}
            aria-label="Zamknij szczegóły"
          >
            <CloseIcon />
          </IconButton>

          {/* Przekaż id do strony szczegółów (jeśli wymaga) */}
          {selected && <IncidentDetails incidentId={selected.id} />}
        </Box>
      </Dialog>
    </>
  );
};

export default IncidentsMap;