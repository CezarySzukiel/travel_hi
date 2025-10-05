import { useEffect, useMemo, useState } from "react";
import { type Resolver, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    Box,
    Button,
    Card,
    CardContent,
    Stack,
    Typography,
    Snackbar,
    Alert,
    Avatar,
    IconButton,
} from "@mui/material";

import TrainIcon from "@mui/icons-material/Train";
import BlockIcon from "@mui/icons-material/Block";
import EngineeringIcon from "@mui/icons-material/Engineering";
import ReportProblemIcon from "@mui/icons-material/ReportProblem";
import TrafficIcon from "@mui/icons-material/Traffic";

import { MapLocationPicker } from "../map/MapLocationPicker";
import { ENV } from "../../config/env";

const MAX_IMAGE_MB = 5;
const DEFAULT_POINT = { lat: 50.067549, lng: 19.991471 };

// ✅ Schemat walidacji
const schema = z.object({
    username: z
        .string()
        .trim()
        .optional()
        .transform((v) => v || null)
        .refine((v) => !v || v.length >= 3, {
            message: "Nazwa użytkownika powinna mieć co najmniej 3 znaki",
        }),
    description: z
        .string()
        .trim()
        .optional()
        .transform((v) => v || null)
        .refine((v) => !v || v.length >= 5, {
            message: "Opis powinien mieć co najmniej 5 znaków",
        }),
    type: z.enum(["accident", "roadwork", "roadblock", "delay", "other"]),
    lat: z.coerce.number().refine(Number.isFinite, "Wymagana lokalizacja"),
    lng: z.coerce.number().refine(Number.isFinite, "Wymagana lokalizacja"),
    photo: z
        .union([z.instanceof(File), z.null()])
        .optional()
        .nullable()
        .superRefine((f, ctx) => {
            if (!f) return;
            if (f.size > MAX_IMAGE_MB * 1024 * 1024) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: `Zdjęcie do ${MAX_IMAGE_MB} MB`,
                });
            }
            if (!f.type.startsWith("image/")) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Dozwolone wyłącznie pliki graficzne",
                });
            }
        }),
});

type FormValues = z.infer<typeof schema>;

export const ReportIncidentForm: React.FC = () => {
    const [toast, setToast] = useState({
        open: false,
        msg: "",
        severity: "success" as "success" | "error",
    });
    const [preview, setPreview] = useState<string | null>(null);

    const {
        handleSubmit,
        setValue,
        watch,
        formState: { errors, isSubmitting },
        reset,
    } = useForm<FormValues>({
        resolver: zodResolver(schema) as Resolver<FormValues>,
        defaultValues: {
            username: "",
            description: "",
            type: "other",
            lat: DEFAULT_POINT.lat,
            lng: DEFAULT_POINT.lng,
            photo: null,
        },
        mode: "onBlur",
    });

    const lat = watch("lat");
    const lng = watch("lng");
    const type = watch("type");
    const photoWatch = watch("photo");

    useEffect(() => {
        if (!photoWatch) setPreview(null);
    }, [photoWatch]);

    useEffect(() => {
        return () => {
            if (preview) URL.revokeObjectURL(preview);
        };
    }, [preview]);

    const incidentTypes = [
        { value: "accident" as const, label: "Wypadek", icon: <TrainIcon />, color: "#d32f2f" },
        { value: "roadwork" as const, label: "Wzmożony ruch", icon: <TrafficIcon />, color: "#f57c00" },
        { value: "roadblock" as const, label: "Zamknięcie drogi", icon: <BlockIcon />, color: "#616161" },
        { value: "delay" as const, label: "Opóźnienie", icon: <EngineeringIcon />, color: "#1976d2" },
        { value: "other" as const, label: "Inne", icon: <ReportProblemIcon />, color: "#757575" },
    ];

    const handleUseMyLocation = () => {
        if (!navigator.geolocation) {
            setToast({
                open: true,
                msg: "Twoja przeglądarka nie obsługuje geolokalizacji.",
                severity: "error",
            });
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setValue("lat", pos.coords.latitude, { shouldValidate: true });
                setValue("lng", pos.coords.longitude, { shouldValidate: true });
                setToast({
                    open: true,
                    msg: "Lokalizacja ustawiona ✅",
                    severity: "success",
                });
            },
            (err) => {
                console.error(err);
                setValue("lat", DEFAULT_POINT.lat, { shouldValidate: true });
                setValue("lng", DEFAULT_POINT.lng, { shouldValidate: true });
                setToast({
                    open: true,
                    msg: `Nie udało się pobrać lokalizacji (${err.message}).`,
                    severity: "error",
                });
            }
        );
    };

    const onPickLocation = (p: { lat: number; lng: number }) => {
        setValue("lat", p.lat, { shouldValidate: true });
        setValue("lng", p.lng, { shouldValidate: true });
    };

    const photoInputProps = useMemo(
        () => ({
            accept: "image/*",
            onClick: (e: React.MouseEvent<HTMLInputElement>) => {
                (e.currentTarget as HTMLInputElement).value = "";
            },
            onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                const file = e.target.files?.[0] ?? null;
                setValue("photo", file, { shouldValidate: true });
                if (file) {
                    const url = URL.createObjectURL(file);
                    setPreview((prev) => {
                        if (prev) URL.revokeObjectURL(prev);
                        return url;
                    });
                } else {
                    setPreview(null);
                }
            },
        }),
        [setValue]
    );

    const onSubmit = async (values: FormValues) => {
        try {
            const fd = new FormData();
            fd.append("username", values.username);
            fd.append("description", values.description);
            fd.append("type", values.type);
            fd.append("lat", String(values.lat));
            fd.append("lng", String(values.lng));
            const file = values.photo ?? null;
            if (file) fd.append("photo", file);
            const res = await fetch(`${ENV.API_BASE_URL}/incidents`, {
                method: "POST",
                body: fd,
            });
            if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);

            setToast({ open: true, msg: "Zgłoszono ✅", severity: "success" });
            reset({
                username: "",
                description: "",
                type: "other",
                ...DEFAULT_POINT,
                photo: null,
            });
            setPreview(null);
        } catch (e: any) {
            setToast({
                open: true,
                msg: e?.message ?? "Nie udało się wysłać zgłoszenia.",
                severity: "error",
            });
        }
    };

    return (
        <Card>
            <CardContent>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
                    Zgłoś utrudnienie kolejowe 🚆
                </Typography>

                <Box component="form" onSubmit={handleSubmit(onSubmit)}>
                    <Stack spacing={3}>
                        {/* 👤 Nazwa użytkownika */}
                        <Box>
                            <Typography variant="subtitle1" sx={{ mb: 1 }}>
                                Twoja nazwa użytkownika:
                            </Typography>
                            <input
                                type="text"
                                value={watch("username")}
                                onChange={(e) =>
                                    setValue("username", e.target.value, { shouldValidate: true })
                                }
                                placeholder="np. rafal123"
                                style={{
                                    width: "100%",
                                    padding: "10px",
                                    borderRadius: "6px",
                                    border: "1px solid #ccc",
                                    fontSize: "1rem",
                                }}
                            />
                            {errors.username && (
                                <Typography variant="caption" color="error">
                                    {String(errors.username.message)}
                                </Typography>
                            )}
                        </Box>

                        {/* 📝 Opis zdarzenia */}
                        <Box>
                            <Typography variant="subtitle1" sx={{ mb: 1 }}>
                                Krótki opis zdarzenia:
                            </Typography>
                            <textarea
                                value={watch("description")}
                                onChange={(e) =>
                                    setValue("description", e.target.value, { shouldValidate: true })
                                }
                                placeholder="Opisz krótko co się stało..."
                                rows={3}
                                style={{
                                    width: "100%",
                                    padding: "10px",
                                    borderRadius: "6px",
                                    border: "1px solid #ccc",
                                    fontSize: "1rem",
                                }}
                            />
                            {errors.description && (
                                <Typography variant="caption" color="error">
                                    {String(errors.description.message)}
                                </Typography>
                            )}
                        </Box>

                        {/* 🔹 Typ zdarzenia */}
                        <Box>
                            <Typography variant="subtitle1" sx={{ mb: 1 }}>
                                Wybierz typ zdarzenia:
                            </Typography>
                            <Stack
                                direction="row"
                                spacing={3}
                                justifyContent="center"
                                flexWrap="wrap"
                                sx={{ rowGap: 2 }}
                            >
                                {incidentTypes.map((item) => (
                                    <Box key={item.value} textAlign="center" sx={{ width: 90 }}>
                                        <IconButton
                                            aria-label={item.label}
                                            aria-pressed={type === item.value}
                                            onClick={() =>
                                                setValue("type", item.value, { shouldValidate: true })
                                            }
                                            sx={{
                                                backgroundColor:
                                                    type === item.value ? item.color : "#f5f5f5",
                                                color: type === item.value ? "white" : "black",
                                                width: 70,
                                                height: 70,
                                                borderRadius: "50%",
                                                transition: "transform 0.2s ease",
                                                "&:hover": {
                                                    transform: "scale(1.05)",
                                                    backgroundColor:
                                                        type === item.value ? item.color : "#e0e0e0",
                                                },
                                            }}
                                        >
                                            {item.icon}
                                        </IconButton>
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                display: "block",
                                                mt: 0.5,
                                                fontWeight: type === item.value ? 600 : 400,
                                                color:
                                                    type === item.value
                                                        ? item.color
                                                        : "text.secondary",
                                            }}
                                        >
                                            {item.label}
                                        </Typography>
                                    </Box>
                                ))}
                            </Stack>
                            {errors.type && (
                                <Typography variant="caption" color="error" textAlign="center">
                                    {String(errors.type.message)}
                                </Typography>
                            )}
                        </Box>

                        {/* 📍 Lokalizacja */}
                        <Box>
                            <Stack
                                direction="row"
                                justifyContent="space-between"
                                alignItems="center"
                                sx={{ mb: 1 }}
                            >
                                <Typography variant="subtitle1">Wybierz lokalizację:</Typography>
                                <Button
                                    variant="outlined"
                                    size="small"
                                    onClick={handleUseMyLocation}
                                    sx={{ textTransform: "none" }}
                                >
                                    📍 Użyj mojej lokalizacji
                                </Button>
                            </Stack>

                            <MapLocationPicker
                                value={
                                    Number.isFinite(lat) && Number.isFinite(lng)
                                        ? { lat, lng }
                                        : null
                                }
                                onChange={onPickLocation}
                                height={300}
                            />
                            {(errors.lat || errors.lng) && (
                                <Typography variant="caption" color="error">
                                    Wybierz lokalizację na mapie lub użyj GPS.
                                </Typography>
                            )}
                        </Box>

                        {/* 📸 Zdjęcie */}
                        <Stack direction="row" spacing={2} alignItems="center">
                            <Button variant="outlined" component="label">
                                Dodaj zdjęcie (opcjonalnie)
                                <input type="file" hidden {...photoInputProps} />
                            </Button>
                            {preview && (
                                <Avatar variant="rounded" src={preview} sx={{ width: 64, height: 64 }} />
                            )}
                        </Stack>
                        {errors.photo && (
                            <Typography variant="caption" color="error">
                                {String(errors.photo.message)}
                            </Typography>
                        )}

                        {/* ✅ Submit */}
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <Button type="submit" variant="contained" disabled={isSubmitting}>
                                {isSubmitting ? "Wysyłanie..." : "Zgłoś utrudnienie"}
                            </Button>
                        </Stack>
                    </Stack>
                </Box>
            </CardContent>

            {/* 🔔 Toast */}
            <Snackbar
                open={toast.open}
                autoHideDuration={2500}
                onClose={() => setToast((t) => ({ ...t, open: false }))}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
                <Alert
                    severity={toast.severity}
                    onClose={() => setToast((t) => ({ ...t, open: false }))}
                >
                    {toast.msg}
                </Alert>
            </Snackbar>
        </Card>
    );
};
