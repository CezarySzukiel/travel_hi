import * as React from "react";
import {
  Box, Button, Card, CardActions, CardContent,
  Stack, Typography, Alert,
} from "@mui/material";

import DetectionResultDialog from "../components/DetectionResultDialog";
import type { DetectResult, TransportMode } from "../types/Transport";
import DetectTransportTile from "../components/DetectTransportTile";

export default function Intro(props: {
  onDetectComplete?: (result: DetectResult) => void; // wywołamy TYLKO, gdy coś faktycznie wykryto
  onManualDefine?: () => void;
  onPlanTrip?: (mode: TransportMode) => void;
}) {
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<DetectResult | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const handleDetectComplete = (res: DetectResult & { nearbyHint?: string | null; alternates?: TransportMode[] }) => {
    setResult(res);
    setDialogOpen(true);
    // callback rodzica gdy coś wykryto
    if (res.mode !== "unknown") {
      props.onDetectComplete?.(res);
    }
  };

  const handlePlanTrip = (mode: TransportMode) => {
    setDialogOpen(false);
    props.onPlanTrip?.(mode); // np. navigate("/planner?mode=train")
  };

  return (
    <>
      <Box display="grid" justifyContent="center" p={3}>
        <Box maxWidth={720}>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Witaj w TravelHI
          </Typography>
          <Typography color="text.secondary" mb={3}>
            Wybierz, czy chcesz <strong>wykryć podróż automatycznie</strong>, czy{" "}
            <strong>zdefiniować ją ręcznie</strong>. W trybie wykrywania pobierzemy lokalizację
            i oszacujemy prędkość, aby określić środek transportu (HI — Hybrid Intelligence).
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            {/* 🔎 Wykrywanie – cała logika w jednym komponencie */}
            <DetectTransportTile
              detectSeconds={12}
              useNearbyHint
              onComplete={handleDetectComplete}
            />

            {/* ✍️ Ręczna definicja */}
            <Card sx={{ flex: 1 }}>
              <CardContent>
                <Typography variant="h6">Zdefiniuj podróż (ręcznie)</Typography>
                <Typography variant="body2" color="text.secondary" mt={1}>
                  Sam określ trasę, czas i środek transportu — idealne, gdy nie chcesz używać GPS.
                </Typography>
              </CardContent>
              <CardActions>
                <Button variant="text" onClick={() => props.onManualDefine?.()}>
                  Przejdź do definiowania
                </Button>
              </CardActions>
            </Card>
          </Stack>
        </Box>
      </Box>

      {/* 🗨️ Dialog z wynikami / alternatywami / planowaniem */}
      <DetectionResultDialog
        open={dialogOpen}
        result={result}
        onClose={() => setDialogOpen(false)}
        onManualDefine={() => props.onManualDefine?.()}
        onPlanTrip={(mode) => handlePlanTrip(mode)}
      />
    </>
  );
}