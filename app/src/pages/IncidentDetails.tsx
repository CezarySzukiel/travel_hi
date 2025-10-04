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
} from "@mui/material";
import { useParams, useNavigate } from "react-router-dom";
import { ENV } from "../config/env";

interface Incident {
    id: number;
    type: string;
    location: { lat: number; lng: number };
    photo_url?: string;
    created_at?: string;
    description?: string;
    severity?: "low" | "medium" | "high";
    status?: "pending" | "verified" | "resolved";
    helpfulCount?: number;
}

const IncidentDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [incident, setIncident] = useState<Incident | null>(null);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState({
        open: false,
        msg: "",
        severity: "success" as "success" | "error",
    });

    // 🔄 Pobieranie danych z backendu
    useEffect(() => {
        const fetchIncident = async () => {
            try {
                const res = await fetch(`${ENV.API_BASE_URL}/incidents/${id}`);
                if (!res.ok) throw new Error(`Błąd API: ${res.status}`);
                const data = await res.json();

                setIncident({
                    ...data,
                    photo_url:
                        data.photo_url ||
                        (data.type === "accident"
                            ? "https://kolejowyportal.pl/files/su160-009.jpg.webp"
                            : "https://images.unsplash.com/photo-1509395176047-4a66953fd231"),
                    severity: data.severity || "medium",
                    status: data.status || "pending",
                    helpfulCount: data.helpfulCount || 0,
                });
            } catch (err: any) {
                console.error(err);
                // fallback lokalny
                setIncident({
                    id: Number(id),
                    type: "accident",
                    location: { lat: 50.06, lng: 19.94 },
                    photo_url: "https://kolejowyportal.pl/files/su160-009.jpg.webp",
                    created_at: "2025-10-04",
                    description: "Awaria lokomotywy – Kraków Główny. Opóźnienie 40 minut.",
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

    // 👍 Głos “Pomocne”
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

    const severityColor =
        incident.severity === "high"
            ? "error"
            : incident.severity === "medium"
                ? "warning"
                : "success";

    const statusLabel =
        incident.status === "pending"
            ? "Oczekuje na weryfikację"
            : incident.status === "verified"
                ? "Zatwierdzone"
                : "Zamknięte";

    return (
        <Box sx={{ maxWidth: 700, mx: "auto", mt: 4 }}>
            <Card sx={{ boxShadow: 4 }}>
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
                        <Chip label={`Poziom: ${incident.severity}`} color={severityColor} />
                        <Chip label={statusLabel} variant="outlined" />
                    </Stack>

                    <Typography variant="body1" paragraph>
                        {incident.description ||
                            "Brak opisu szczegółowego dla tego zgłoszenia."}
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

                    <Stack direction="row" justifyContent="flex-end" mt={2}>
                        <Button
                            variant="text"
                            onClick={() => navigate("/travel")}
                            sx={{ textTransform: "none" }}
                        >
                            ← Wróć do mapy
                        </Button>
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
