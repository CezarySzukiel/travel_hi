import { useState, useMemo } from "react";
import { GoogleMap, LoadScript, Marker, InfoWindow } from "@react-google-maps/api";
import { Card, CardContent, Typography, Chip } from "@mui/material";
import { useNavigate } from "react-router-dom";
import type { Incident } from "../../types/incident";

const containerStyle = {
    width: "100%",
    height: "80vh",
    borderRadius: "12px",
};

const DEFAULT_CENTER = { lat: 50.067549, lng: 19.991471 };

const sampleIncidents: Incident[] = [
    {
        id: "1",
        title: "Awaria lokomotywy — Kraków Główny",
        description: "Opóźnienie pociągu o 40 minut z powodu awarii.",
        severity: "high",
        lat: 50.065,
        lng: 19.945,
    },
    {
        id: "2",
        title: "Roboty na torach — Katowice",
        description: "Utrudnienia w ruchu pociągów, prace potrwają do 18:00.",
        severity: "medium",
        lat: 50.25,
        lng: 19.02,
    },
    {
        id: "3",
        title: "Zamknięcie toru — Warszawa Zachodnia",
        description: "Ruch jednotorowy do odwołania.",
        severity: "low",
        lat: 52.225,
        lng: 21.005,
    },
];

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string;

export const IncidentsMap: React.FC = () => {
    const [selected, setSelected] = useState<Incident | null>(null);
    const navigate = useNavigate();

    const center = useMemo(() => DEFAULT_CENTER, []);

    const colorFor = (severity: Incident["severity"]) =>
        severity === "high" ? "red" : severity === "medium" ? "orange" : "yellow";

    return (
        <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY}>
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
                        icon={{
                            url: `http://maps.google.com/mapfiles/ms/icons/${colorFor(
                                incident.severity
                            )}-dot.png`,
                        }}
                    />
                ))}

                {selected && (
                    <InfoWindow
                        position={{ lat: selected.lat, lng: selected.lng }}
                        onCloseClick={() => setSelected(null)}
                    >
                        <Card sx={{ minWidth: 250 }}>
                            <CardContent>
                                <Typography variant="subtitle1" fontWeight={700}>
                                    {selected.title}
                                </Typography>
                                <Typography variant="body2" sx={{ my: 1 }}>
                                    {selected.description}
                                </Typography>
                                <Chip
                                    label={`Poziom: ${selected.severity}`}
                                    color={
                                        selected.severity === "high"
                                            ? "error"
                                            : selected.severity === "medium"
                                                ? "warning"
                                                : "default"
                                    }
                                    size="small"
                                    sx={{ mb: 1 }}
                                />
                                {/* 🔽 przycisk przenoszący do szczegółów */}
                                <Typography
                                    variant="body2"
                                    color="primary"
                                    sx={{
                                        mt: 1,
                                        cursor: "pointer",
                                        textDecoration: "underline",
                                    }}
                                    onClick={() => navigate(`/travel/${selected.id}`)}
                                >
                                    Zobacz szczegóły →
                                </Typography>
                            </CardContent>
                        </Card>
                    </InfoWindow>
                )}
            </GoogleMap>
        </LoadScript>
    );
};
