import * as React from "react";
import {
  Card, CardContent, Typography, List, ListItem,
  ListItemText, Chip, Divider, LinearProgress, Alert, Box, Stack, Avatar
} from "@mui/material";
import { fetchIncidents, type Incident } from "../services/incidents";

// --------- typ i utils ----------
type LiveIncident = {
  user: string;
  message: string;
  lat?: number | null;
  lng?: number | null;
  likes: number;
  timestamp: string; // ISO
};

function wsUrl(path: string) {
  const proto = window.location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${window.location.host}${path}`;
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("pl-PL", { hour12: false });

const fmtCoord = (v?: number | null) =>
  typeof v === "number" && Number.isFinite(v) ? v.toFixed(4) : "–";

const initials = (name: string) =>
  name?.trim()?.split(/\s+/).map(s => s[0]?.toUpperCase()).slice(0, 2).join("") || "U";

// przytnij, ale nie pokazuj gołego JSON-a
const truncate = (s: string, n = 160) =>
  s.length > n ? s.slice(0, n - 1) + "…" : s;

// Spróbuj zparsować string wyglądający na JSON
function tryParseJsonString(maybeJson: unknown): any | null {
  if (typeof maybeJson !== "string") return null;
  const s = maybeJson.trim();
  if (!(s.startsWith("{") || s.startsWith("["))) return null;
  try { return JSON.parse(s); } catch { return null; }
}

// Zamień różne warianty payloadu na LiveIncident
function normalizePayload(raw: any): LiveIncident | null {
  if (!raw) return null;

  // odfiltruj komunikaty serwisowe
  if (raw.type === "welcome" || raw.type === "ping") return null;

  let p = raw;

  // echo/opakowania
  if (p.type === "echo" && p.data != null) p = p.data;
  if (p.echo != null) p = p.echo;

  // jeśli 'p' jest stringiem zawierającym JSON, rozpakuj jeszcze raz
  const parsedInner = tryParseJsonString(p);
  if (parsedInner) p = parsedInner;

  // bywa, że pola same są stringami z JSON-em
  if (typeof p?.message === "string") {
    const m2 = tryParseJsonString(p.message);
    if (m2) p = { ...p, ...m2 }; // scal – preferuj wewnętrzne pola
  }

  const user =
    typeof p?.user === "string" && p.user.trim() ? p.user.trim() : "Anonim";

  // Ustal wiadomość – tylko czytelny tekst (żadnego stringify całego obiektu)
  let message = "";
  if (typeof p?.message === "string" && p.message.trim()) {
    message = p.message.trim();
  } else if (typeof p?.text === "string" && p.text.trim()) {
    message = p.text.trim();
  } else if (typeof p?.title === "string" && p.title.trim()) {
    message = p.title.trim();
  } else {
    message = "Nowe zgłoszenie";
  }

  const nLat = Number(p?.lat);
  const nLng = Number(p?.lng);
  const lat = Number.isFinite(nLat) ? nLat : undefined;
  const lng = Number.isFinite(nLng) ? nLng : undefined;

  const likesNum = Number(p?.likes);
  const likes = Number.isFinite(likesNum) ? likesNum : 0;

  const ts =
    typeof p?.timestamp === "string" && p.timestamp
      ? p.timestamp
      : new Date().toISOString();

  return { user, message, lat, lng, likes, timestamp: ts };
}

// ---------- komponent ----------
export default function IncidentFeed() {
  const [data, setData] = React.useState<Incident[]>([]);
  const [live, setLive] = React.useState<LiveIncident[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Historia z REST
  React.useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetchIncidents(20);
        setData(Array.isArray(res) ? res : []);
      } catch (e: any) {
        setError(e?.message ?? "Błąd pobierania incydentów");
        setData([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Live przez WebSocket
  React.useEffect(() => {
    let stopped = false;
    let retry: number | null = null;
    let ws: WebSocket | null = null;

    const connect = () => {
      if (stopped) return;
      ws = new WebSocket(wsUrl("/api/v1/ws"));

      ws.onopen = () => {
        try { ws!.send(JSON.stringify({ type: "ping", at: Date.now() })); } catch {}
      };

      ws.onmessage = (ev) => {
        // 1) spróbuj normalnego JSON.parse
        let payload: any;
        try {
          payload = JSON.parse(ev.data);
        } catch {
          // 2) jeśli to nie JSON, potraktuj jako plain text
          payload = { user: "Anonim", message: String(ev.data) };
        }

        // 3) normalizacja (rozpakowuje echo i podwójny JSON)
        const inc = normalizePayload(payload);
        if (!inc) return;

        setLive((prev) => {
          const key = `${inc.user}|${inc.message}|${inc.timestamp}`;
          if (prev.some(x => `${x.user}|${x.message}|${x.timestamp}` === key)) return prev;
          return [inc, ...prev].slice(0, 50);
        });
      };

      ws.onerror = (ev) => {
        console.error("WebSocket błąd:", ev);
      };

      ws.onclose = () => {
        if (!stopped) retry = window.setTimeout(connect, 1500);
      };
    };

    connect();
    return () => {
      stopped = true;
      if (retry) window.clearTimeout(retry);
      ws?.close(1000, "unmount");
    };
  }, []);

  // ------- renderery (bez <p> w <p>) -------
  const renderLiveItem = (item: LiveIncident, idx: number) => (
    <React.Fragment key={`live-${idx}`}>
      <ListItem alignItems="flex-start">
        <ListItemText
          primaryTypographyProps={{ component: "div" }}
          secondaryTypographyProps={{ component: "div" }}
          primary={
            <Stack direction="row" alignItems="center" spacing={1}>
              <Avatar sx={{ width: 28, height: 28, fontSize: 12 }}>
                {initials(item.user)}
              </Avatar>
              <Typography component="span" fontWeight={700}>
                {item.user}
              </Typography>
              {item.likes > 0 && (
                <Chip
                  size="small"
                  label={`${item.likes} 👍`}
                  color="success"
                  variant="filled"
                />
              )}
            </Stack>
          }
          secondary={
            <>
              <Typography
                component="span"
                variant="body2"
                color="text.primary"
                display="block"
                title={item.message}
              >
                {truncate(item.message)}
              </Typography>
              <Typography component="span" variant="caption" color="text.secondary" display="block">
                {fmtDate(item.timestamp)} — {fmtCoord(item.lat)}, {fmtCoord(item.lng)}
              </Typography>
            </>
          }
        />
      </ListItem>
      {idx < live.length - 1 && <Divider component="li" />}
    </React.Fragment>
  );

  const renderStaticItem = (it: Incident, idx: number) => (
    <React.Fragment key={it.id}>
      <ListItem alignItems="flex-start">
        <ListItemText
          primaryTypographyProps={{ component: "div" }}
          secondaryTypographyProps={{ component: "div" }}
          primary={
            <Typography component="span" fontWeight={700}>
              {it.title}
              <Chip
                size="small"
                label={it.severity.toUpperCase()}
                color={
                  it.severity === "high" ? "error"
                  : it.severity === "medium" ? "warning" : "default"
                }
                sx={{ ml: 1 }}
              />
            </Typography>
          }
          secondary={
            it.description ? (
              <Typography component="span" variant="body2" color="text.secondary">
                {truncate(it.description, 200)}
              </Typography>
            ) : null
          }
        />
      </ListItem>
      {idx < data.length - 1 && <Divider component="li" />}
    </React.Fragment>
  );

  return (
    <Card sx={{ height: "100%" }}>
      <CardContent>
        <Typography variant="h6" fontWeight={700}>
          Ostatnie incydenty
        </Typography>

        {/* 🔴 Live */}
        {live.length > 0 && (
          <List dense sx={{ mt: 1 }}>
            <Box sx={{ mb: 1 }}>
              <Typography variant="subtitle2" color="primary" fontWeight={700} sx={{ mb: 0.5 }}>
                🔴 Na żywo ({live.length})
              </Typography>
            </Box>
            {live.map(renderLiveItem)}
            <Divider sx={{ my: 1 }} />
          </List>
        )}

        {loading && <LinearProgress sx={{ mt: 1 }} />}
        {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}

        {/* Historia */}
        {!loading && !error && (
          <List dense sx={{ mt: 1 }}>
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