// src/components/IncidentFeed.tsx
import * as React from "react";
import {
  Card, CardContent, Typography, List, ListItem,
  ListItemText, Chip, Divider, LinearProgress, Alert
} from "@mui/material";
import { fetchIncidents, type Incident } from "../services/incidents";

export default function IncidentFeed() {
  const [data, setData] = React.useState<Incident[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetchIncidents(20);

        // 🛡️ Walidacja: jeśli nie jest tablicą → zrób pustą
        if (!Array.isArray(res)) {
          console.error("API nie zwróciło tablicy:", res);
          setData([]);
        } else {
          setData(res);
        }
      } catch (e: any) {
        setError(e?.message ?? "Błąd pobierania");
        setData([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <Card sx={{ height: "100%" }}>
      <CardContent>
        <Typography variant="h6" fontWeight={700}>Ostatnie incydenty</Typography>

        {loading && <LinearProgress sx={{ mt: 1 }} />}
        {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}

        {!loading && !error && (
          <>
            {data.length === 0 ? (
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                Brak zgłoszeń.
              </Typography>
            ) : (
              <List dense>
                {data.map((it, idx) => (
                  <React.Fragment key={it.id}>
                    <ListItem alignItems="flex-start">
                      <ListItemText
                        primary={
                          <Typography fontWeight={600}>
                            {it.title}{" "}
                            <Chip
                              size="small"
                              label={it.severity.toUpperCase()}
                              color={
                                it.severity === "high"
                                  ? "error"
                                  : it.severity === "medium"
                                  ? "warning"
                                  : "default"
                              }
                              sx={{ ml: 1 }}
                            />
                          </Typography>
                        }
                        secondary={it.description}
                      />
                    </ListItem>
                    {idx < data.length - 1 && <Divider component="li" />}
                  </React.Fragment>
                ))}
              </List>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}