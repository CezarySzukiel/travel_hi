import * as React from "react";
import {
  Card,
  CardContent,
  Typography,
  Divider,
  LinearProgress,
  Box,
  Stack,
  Avatar,
  Paper,
  Chip,
} from "@mui/material";
import { ENV } from "../config/env";

// ---------- Typy ----------
type Incident = {
  id: number;
  type: string;
  name?: string | null;
  description?: string | null;
  location: { lat: number; lng: number };
  photo_url?: string | null;
  likes: number;
  confirmations: number;
  denials: number;
  created_at: string;
};

type IncidentListResponse = {
  items: Incident[];
  total: number;
};

// ---------- Utils ----------
/**
 * Buduje poprawny adres WebSocket — bez podwójnych /api/v1
 */
const wsUrl = (path: string = "/api/v1/ws") => {
  const proto = window.location.protocol === "https:" ? "wss" : "wss";
  const cleanBase = ENV.API_BASE_URL.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  // Usuwa duplikaty /api/v1 jeśli występują
  const full = `${proto}://${cleanBase}${path.startsWith("/") ? path : `/${path}`}`.replace(/(\/api\/v1){2,}/, "/api/v1");
  console.log("🔗 WebSocket URL:", full);
  return full;
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("pl-PL", { hour12: false });

// ---------- Komponent ----------
export default function IncidentFeed() {
  const [incidents, setIncidents] = React.useState<Incident[]>([]);
  const [loading, setLoading] = React.useState(true);

  // 1️⃣ Pobierz dane z REST API przy załadowaniu
  React.useEffect(() => {
    const loadIncidents = async () => {
      try {
        setLoading(true);
        const url = `${ENV.API_BASE_URL.replace(/\/$/, "")}/incidents?lat=0&lng=0&radius=500&skip=0&limit=50`;
        console.log("🌍 Fetch incidents from:", url);

        const res = await fetch(url, {
          headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error(`API error: ${res.status}`);

        const data: IncidentListResponse = await res.json();
        setIncidents(data.items || []);
      } catch (err) {
        console.error("❌ Błąd pobierania incydentów:", err);
      } finally {
        setLoading(false);
      }
    };

    loadIncidents();
  }, []);

  // 2️⃣ WebSocket: nasłuchiwanie nowych incydentów
  React.useEffect(() => {
    const socketUrl = wsUrl("/api/v1/ws");
    const ws = new WebSocket(socketUrl);

    ws.onopen = () => console.log("✅ WebSocket connected");
    ws.onmessage = (ev) => {
      try {
        const payload = JSON.parse(ev.data);

        // Backend wysyła obiekty z "type": "new_incident"
        if (payload.type === "new_incident" && payload.data) {
          console.log("📡 Nowy incydent:", payload.data);
          setIncidents((prev) => [payload.data, ...prev].slice(0, 50));
        }
      } catch (err) {
        console.error("❌ WebSocket parse error:", err);
      }
    };

    ws.onerror = (err) => console.error("⚠️ WebSocket error:", err);
    ws.onclose = () => console.log("🔌 WebSocket closed");

    return () => ws.close(1000, "Component unmounted");
  }, []);

  // 3️⃣ Render pojedynczego incydentu
  const renderIncident = (it: Incident, idx: number) => (
    <React.Fragment key={it.id}>
      <Paper
        variant="outlined"
        sx={{
          p: 1.5,
          mb: 1,
          backgroundColor: "background.default",
          borderRadius: 2,
          boxShadow: 1,
        }}
      >
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar sx={{ width: 40, height: 40, bgcolor: "primary.main" }}>
            {it.type[0]?.toUpperCase() || "?"}
          </Avatar>

          <Box flex={1}>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
            >
              <Typography fontWeight={600}>
                {it.name || "Bez nazwy"}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {fmtDate(it.created_at)}
              </Typography>
            </Stack>

            <Typography variant="body2" mt={0.5}>
              {it.description || "Brak opisu"}
            </Typography>

            <Stack direction="row" spacing={1} mt={1} alignItems="center">
              <Chip
                size="small"
                label={`${it.likes} 👍`}
                color="success"
                variant="outlined"
              />
              <Typography variant="caption" color="text.secondary">
                📍 {it.location.lat.toFixed(4)}, {it.location.lng.toFixed(4)}
              </Typography>
            </Stack>
          </Box>
        </Stack>
      </Paper>

      {idx < incidents.length - 1 && <Divider />}
    </React.Fragment>
  );

  // 4️⃣ Render główny
  return (
    <Card sx={{ height: "100%", overflowY: "auto" }}>
      <CardContent>
        <Typography variant="h6" fontWeight={700}>
          Ostatnie incydenty
        </Typography>

        {loading && <LinearProgress sx={{ mt: 1 }} />}

        {!loading && (
          <Box mt={2}>
            {incidents.length === 0 ? (
              <Typography color="text.secondary">
                Brak zgłoszeń.
              </Typography>
            ) : (
              incidents.map(renderIncident)
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
