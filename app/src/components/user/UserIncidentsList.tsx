import { useEffect, useState } from "react";
import { Card, CardContent, Typography, Button, Stack, Divider } from "@mui/material";
import { getUserIncidents, type Incident } from "../../services/user";

const UserIncidentsList: React.FC = () => {
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const limit = 5;

    useEffect(() => {
        getUserIncidents(page, limit)
            .then(({ data, total }) => {
                setIncidents(data);
                setTotal(total);
            })
            .catch(console.error);
    }, [page]);

    const totalPages = Math.ceil(total / limit);

    return (
        <Card sx={{ boxShadow: 3, borderRadius: 2 }}>
            <CardContent>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                    Historia zgłoszeń
                </Typography>
                <Divider sx={{ mb: 2 }} />

                {incidents.length === 0 ? (
                    <Typography color="text.secondary">Brak zgłoszeń.</Typography>
                ) : (
                    <Stack spacing={2}>
                        {incidents.map((incident) => (
                            <Card key={incident.id} variant="outlined">
                                <CardContent>
                                    <Typography fontWeight={600}>{incident.title}</Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {new Date(incident.created_at).toLocaleDateString()} — {incident.status}
                                    </Typography>
                                </CardContent>
                            </Card>
                        ))}
                    </Stack>
                )}

                <Stack direction="row" justifyContent="flex-start" mt={3} spacing={2}>
                    <Button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                        ← Poprzednia
                    </Button>
                    <Button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                        Następna →
                    </Button>
                    <Typography variant="body2" color="text.secondary" ml={2}>
                        Strona {page} z {totalPages || 1}
                    </Typography>
                </Stack>
            </CardContent>
        </Card>
    );
};

export default UserIncidentsList;
