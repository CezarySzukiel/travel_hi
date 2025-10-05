import { useEffect, useState } from "react";
import {
    Box,
    Card,
    CardContent,
    CardMedia,
    Typography,
    Button,
    Chip,
    Stack,
    CircularProgress,
    Snackbar,
    Alert,
    IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useParams } from "react-router-dom";
import { ENV } from "../config/env";

interface Incident {
    id: number;
    type: string;
    location: { lat: number; lng: number };
    photo_url?: string;
    created_at?: string;
    description?: string;
    status?: "pending" | "verified" | "resolved";
    helpfulCount?: number;
}

interface Props {
    onClose?: () => void;
}

const IncidentDetails: React.FC<Props> = ({ onClose }) => {
    const { id } = useParams<{ id: string }>();
    const [incident, setIncident] = useState<Incident | null>(null);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState({
        open: false,
        msg: "",
        severity: "success" as "success" | "error",
    });

    useEffect(() => {
        const fetchIncident = async () => {
            try {
                const res = await fetch(`${ENV.API_BASE_URL}/incidents/${id}`);
                if (!res.ok) throw new Error(`Błąd API: ${res.status}`);
                const data = await res.json();

                const safeType = data.type || "other";

                setIncident({
                    ...data,
                    type: safeType,
                    photo_url:
                        data.photo_url ||
                        (safeType === "accident"
                            ? "https://kolejowyportal.pl/files/su160-009.jpg.webp"
                            : "https://images.unsplash.com/photo-1509395176047-4a66953fd231"),
                    status: data.status || "pending",
                    description:
                        data.description ||
                        "Brak opisu szczegółowego dla tego zgłoszenia.",
                    helpfulCount: data.helpfulCount || 0,
                });
            } catch (err: any) {
                console.error(err);
                setIncident({
                    id: Number(id),
                    type: "accident",
                    location: { lat: 50.06, lng: 19.94 },
                    photo_url: "https://kolejowyportal.pl/files/su160-009.jpg.webp",
                    created_at: "2025-10-04",
                    description: "Awaria lokomotywy – Kraków Główny. Opóźnienie 40 minut.",
                    status: "pending",
                    helpfulCount: 3,
                });
                setToast({
                    open: true,
                    msg: "Nie udało się połączyć z API, pokazano dane przykładowe.",
                    severity: "error",
                });
            } finally {
                setLoading(false);
            }
        };

        fetchIncident();
    }, [id]);

    const handleVoteHelpful = async () => {
        try {
            const res = await fetch(`${ENV.API_BASE_URL}/incidents/${id}/vote`, {
                method: "POST",
            });
            if (!res.ok) throw new Error("Nie udało się oddać głosu.");
            setIncident((prev) =>
                prev ? { ...prev, helpfulCount: (prev.helpfulCount ?? 0) + 1 } : prev
            );
            setToast({
                open: true,
                msg: "Dziękujemy za Twój głos 👍",
                severity: "success",
            });
        } catch (err: any) {
            setToast({ open: true, msg: err.message, severity: "error" });
        }
    };

    if (loading) {
        return (
            <Stack alignItems="center" justifyContent="center" sx={{ height: "80vh" }}>
                <CircularProgress />
            </Stack>
        );
    }

    if (!incident) {
        return (
            <Typography color="error" align="center" sx={{ mt: 5 }}>
                Nie znaleziono incydentu.
            </Typography>
        );
    }

    const statusLabel =
        incident.status === "pending"
            ? "Oczekuje na weryfikację"
            : incident.status === "verified"
                ? "Zatwierdzone"
                : "Zamknięte";

    return (
        <Box sx={{ position: "relative", maxWidth: 700, mx: "auto", mt: 2, pb: 2 }}>
            {onClose && (
                <IconButton
                    onClick={onClose}
                    sx={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        color: "grey.600",
                        zIndex: 10,
                        bgcolor: "rgba(255,255,255,0.7)",
                        "&:hover": { bgcolor: "rgba(255,255,255,0.9)" },
                    }}
                >
                    <CloseIcon />
                </IconButton>
            )}

            <Card sx={{ boxShadow: 6 }}>
                {incident.photo_url && (
                    <CardMedia
                        component="img"
                        height="300"
                        image={incident.photo_url}
                        alt={incident.type}
                        sx={{ objectFit: "cover" }}
                    />
                )}
                <CardContent>
                    <Typography variant="h5" fontWeight={700} gutterBottom>
                        {incident.type === "accident"
                            ? "Awaria lokomotywy"
                            : "Utrudnienie na trasie"}
                    </Typography>

                    <Stack direction="row" spacing={1} mb={2}>
                        <Chip label={statusLabel} variant="outlined" />
                    </Stack>

                    <Typography variant="body1" paragraph>
                        {incident.description}
                    </Typography>

                    <Typography variant="body2" color="text.secondary">
                        📍 Lokalizacja: {incident.location.lat}, {incident.location.lng}
                    </Typography>

                    <Stack direction="row" spacing={2} alignItems="center" mt={3}>
                        <Button variant="contained" onClick={handleVoteHelpful}>
                            👍 Pomocne
                        </Button>
                        <Typography variant="body2" color="text.secondary">
                            {incident.helpfulCount ?? 0} głosów
                        </Typography>
                    </Stack>
                </CardContent>
            </Card>

            <Snackbar
                open={toast.open}
                autoHideDuration={2500}
                onClose={() => setToast((t) => ({ ...t, open: false }))}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
                <Alert severity={toast.severity}>{toast.msg}</Alert>
            </Snackbar>
        </Box>
    );
};

export default IncidentDetails;
