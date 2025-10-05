import * as React from "react";
import {
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  Chip,
  Divider,
  LinearProgress,
  Box,
  Stack,
  Avatar,
  Paper,
} from "@mui/material";
import { fetchIncidents, type Incident } from "../services/incidents";

// --------- typ i utils ----------
type LiveIncident = {
  user: string;
  message: string;
  lat: number;
  lng: number;
  likes: number;
  timestamp: string;
};

const wsUrl = (path: string) => {
  const proto = window.location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${window.location.host}${path}`;
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("pl-PL", { hour12: false });

const initials = (name: string) =>
  name?.trim()?.split(/\s+/).map(s => s[0]?.toUpperCase()).slice(0, 2).join("") || "U";

// 🔹 Pomocnicza funkcja do rozpakowania `message` JSON
function parseEchoPayload(raw: any): LiveIncident | null {
  if (!raw || raw.type !== "echo" || typeof raw.message !== "string") return null;
  try {
    const inner = JSON.parse(raw.message);
    return {
      user: inner.user || "Anonim",
      message: inner.message || "Brak treści",
      lat: Number(inner.lat) || 0,
      lng: Number(inner.lng) || 0,
      likes: Number(inner.likes) || 0,
      timestamp: inner.timestamp || new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

// ---------- komponent ----------
export default function IncidentFeed() {
  const [data, setData] = React.useState<Incident[]>([]);
  const [live, setLive] = React.useState<LiveIncident[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Historia z REST
  React.useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetchIncidents(20);
        setData(Array.isArray(res) ? res : []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // WebSocket — odbieranie na żywo
  React.useEffect(() => {
    const ws = new WebSocket(wsUrl("/api/v1/ws"));
    ws.onopen = () => console.log("✅ WS connected");

    ws.onmessage = (ev) => {
      try {
        const payload = JSON.parse(ev.data);

        // Pomijamy inne typy
        if (payload.type !== "echo") return;

        const incident = parseEchoPayload(payload);
        if (!incident) return;

        setLive((prev) => [incident, ...prev].slice(0, 50));
      } catch (err) {
        console.error("❌ WS parse error", err, ev.data);
      }
    };

    ws.onclose = () => console.log("🔌 WS closed");
    ws.onerror = (err) => console.error("⚠️ WS error:", err);

    return () => ws.close(1000, "unmount");
  }, []);

  // render jednego live incydentu (ładny MUI layout)
  const renderLiveItem = (it: LiveIncident, idx: number) => (
    <React.Fragment key={`live-${idx}`}>
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
            {initials(it.user)}
          </Avatar>

          <Box flex={1}>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
            >
              <Typography fontWeight={600}>{it.user}</Typography>
              <Typography variant="caption" color="text.secondary">
                {fmtDate(it.timestamp)}
              </Typography>
            </Stack>

            <Typography variant="body2" mt={0.5}>
              {it.message}
            </Typography>

            <Stack direction="row" spacing={1} mt={1} alignItems="center">
              <Chip
                size="small"
                label={`${it.likes} 👍`}
                color="success"
                variant="outlined"
              />
              <Typography variant="caption" color="text.secondary">
                📍 {it.lat.toFixed(4)}, {it.lng.toFixed(4)}
              </Typography>
            </Stack>
          </Box>
        </Stack>
      </Paper>
    </React.Fragment>
  );

  // render incydentów z REST API
  const renderStaticItem = (it: Incident, idx: number) => (
    <React.Fragment key={it.id}>
      <ListItem alignItems="flex-start">
        <ListItemText
          primary={
            <Typography fontWeight={600}>
              {it.title}
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
          secondary={
            it.description && (
              <Typography variant="body2" color="text.secondary">
                {it.description}
              </Typography>
            )
          }
        />
      </ListItem>
      {idx < data.length - 1 && <Divider component="li" />}
    </React.Fragment>
  );

  // render główny
  return (
    <Card sx={{ height: "100%", overflowY: "auto" }}>
      <CardContent>
        <Typography variant="h6" fontWeight={700}>
          Ostatnie incydenty
        </Typography>

        {/* 🔴 Live feed */}
        {live.length > 0 && (
          <Box mt={2}>
            <Typography
              variant="subtitle2"
              color="primary"
              fontWeight={700}
              sx={{ mb: 1 }}
            >
              🔴 Na żywo ({live.length})
            </Typography>
            {live.map(renderLiveItem)}
            <Divider sx={{ my: 2 }} />
          </Box>
        )}

        {loading && <LinearProgress sx={{ mt: 1 }} />}

        {/* Historia */}
        {!loading && (
          <List dense>
            {data.length === 0 ? (
              <Typography color="text.secondary">Brak zgłoszeń.</Typography>
            ) : (
              data.map(renderStaticItem)
            )}
          </List>
        )}
      </CardContent>
    </Card>
  );
}