import { useState, useMemo } from "react";
import { GoogleMap, LoadScript, Marker, InfoWindow } from "@react-google-maps/api";
import { Card, CardContent, Typography, Dialog, Slide, IconButton, Box } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import type { Incident } from "../../types/incident";
import IncidentDetails from "../../pages/IncidentDetails";

const containerStyle = {
    width: "100%",
    height: "80vh",
    borderRadius: "12px",
};

const DEFAULT_CENTER = { lat: 50.067549, lng: 19.991471 };

// 🔹 uproszczone dane bez severity
const sampleIncidents: Omit<Incident, "severity">[] = [
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

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string;
const Transition = Slide as any;

export const IncidentsMap: React.FC = () => {
    const [selected, setSelected] = useState<Omit<Incident, "severity"> | null>(null);
    const [showDetails, setShowDetails] = useState(false);

    const center = useMemo(() => DEFAULT_CENTER, []);

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
                            url: "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
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
                                <Typography
                                    variant="body2"
                                    color="primary"
                                    sx={{
                                        mt: 1,
                                        cursor: "pointer",
                                        textDecoration: "underline",
                                    }}
                                    onClick={() => setShowDetails(true)}
                                >
                                    Zobacz szczegóły →
                                </Typography>
                            </CardContent>
                        </Card>
                    </InfoWindow>
                )}

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
                        >
                            <CloseIcon />
                        </IconButton>
                        {selected && <IncidentDetails />}
                    </Box>
                </Dialog>
            </GoogleMap>
        </LoadScript>
    );
};
