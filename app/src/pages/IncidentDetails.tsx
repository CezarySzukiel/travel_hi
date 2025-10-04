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
import { useParams } from "react-router-dom";
import { ENV } from "../config/env";

interface Incident {
    id: string;
    title: string;
    description: string;
    severity: "low" | "medium" | "high";
    lat: number;
    lng: number;
    photoUrl?: string;
    status?: "pending" | "verified" | "resolved";
    helpfulCount?: number;
    type?: string; // ← dodajemy, żeby wiedzieć jaki to typ
}

const IncidentDetails: React.FC = () => {
    const { id } = useParams();
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
                if (!res.ok) throw new Error("Błąd pobierania danych incydentu");
                const data = await res.json();

                // 🧩 Bezpieczne przypisanie zdjęcia (jeśli brak w API)
                const defaultPhoto =
                    data.type === "accident"
                        ? "https://kolejowyportal.pl/files/su160-009.jpg.webp"
                        : "https://images.unsplash.com/photo-1509395176047-4a66953fd231";

                setIncident({
                    id: data.id,
                    title:
                        data.title ||
                        (data.type === "accident"
                            ? "Awaria lokomotywy – zgłoszenie"
                            : "Zgłoszone utrudnienie"),
                    description:
                        data.description ||
                        "Szczegóły tego zgłoszenia nie zostały jeszcze uzupełnione.",
                    severity: data.severity || "medium",
                    lat: data.location?.lat ?? 0,
                    lng: data.location?.lng ?? 0,
                    photoUrl: data.photo_url || defaultPhoto,
                    status: data.status || "pending",
                    helpfulCount: data.helpfulCount || 0,
                    type: data.type,
                });
            } catch {
                // 🔧 Fallback lokalny (mock)
                setIncident({
                    id: id || "1",
                    title: "Awaria lokomotywy – Kraków Główny",
                    description: "Pociąg opóźniony o 40 minut z powodu awarii lokomotywy.",
                    severity: "medium",
                    lat: 52.2297,
                    lng: 21.0122,
                    photoUrl: "https://kolejowyportal.pl/files/su160-009.jpg.webp",
                    status: "pending",
                    helpfulCount: 3,
                    type: "accident",
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
            setToast({ open: true, msg: "Dziękujemy za Twój głos 👍", severity: "success" });
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
            ? "Oczekuje na rozwiązanie"
            : incident.status === "verified"
                ? "Zatwierdzone"
                : "Zamknięte";

    return (
        <Box sx={{ maxWidth: 700, mx: "auto", mt: 4 }}>
            <Card sx={{ boxShadow: 4 }}>
                {incident.photoUrl && (
                    <CardMedia
                        component="img"
                        height="300"
                        image={incident.photoUrl}
                        alt={incident.title}
                        sx={{ objectFit: "cover" }}
                    />
                )}
                <CardContent>
                    <Typography variant="h5" fontWeight={700} gutterBottom>
                        {incident.title}
                    </Typography>

                    <Stack direction="row" spacing={1} mb={2}>
                        <Chip label={`Poziom: ${incident.severity}`} color={severityColor} />
                        <Chip label={statusLabel} variant="outlined" />
                    </Stack>

                    <Typography variant="body1" paragraph>
                        {incident.description}
                    </Typography>

                    <Stack direction="row" spacing={2} alignItems="center" mt={2}>
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
