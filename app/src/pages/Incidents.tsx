
import { Container, Stack, Typography } from "@mui/material";
import { ReportIncidentForm } from "../components/incidents/ReportIncidentForm";
import { IncidentsMap } from "../components/map/IncidentsMap";

export default function Incidents() {
  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      <Stack spacing={2}>
        <Typography variant="h5" fontWeight={700}>
          TravelHI — Incydenty
        </Typography>

        <ReportIncidentForm />

        <IncidentsMap />
      </Stack>
    </Container>
  );
}