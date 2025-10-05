import * as React from "react";
import {Box, Alert, Grid} from "@mui/material";
import DetectTransportTile from "../components/DetectTransportTile";
import DetectionResultDialog from "../components/DetectionResultDialog";
import type {DetectResult, TransportMode} from "../types/Transport";
import {
    alternatesFor,

    findTransitHint,
    makeUnknownResult,
    isStationary
} from "../helpers/transport";
import ReportIncidentTile from "../components/ReportIncidentTile.tsx";
import PlanTripTile from "../components/PlanTripTile.tsx";
import IncidentFeed from "../components/IncidentFeed.tsx";
import {useNavigate} from "react-router-dom";


export default function Intro(props: {
    onDetectComplete?: (result: DetectResult) => void;
    onManualDefine?: () => void;
    onPlanTrip?: (mode: TransportMode) => void;
}) {
    const [error, setError] = React.useState<string | null>(null);
    const [dialogOpen, setDialogOpen] = React.useState(false);
    const [result, setResult] = React.useState<DetectResult | null>(null);
    const navigate = useNavigate();


    const openDialogWith = (base: DetectResult) => {
        setResult(base);
        setDialogOpen(true);
    };

    const handleDetectComplete = async (base: DetectResult) => {
        try {
            let enriched = base;
            if (base.samples.length >= 2) {
                const stationary = isStationary(base.samples);
                if (stationary) {
                    enriched = {...base, mode: "unknown", speedKmh: 0};
                }
            }

            const last = base.samples.at(-1);
            if (last) {
                const hint = await findTransitHint(last);
                if (hint) enriched = {...enriched, nearbyHint: hint};
            }

            enriched = {...enriched, alternates: alternatesFor(enriched.speedKmh).filter((m) => m !== enriched.mode)};

            openDialogWith(enriched);


            if (enriched.mode !== "unknown") props.onDetectComplete?.(enriched);
        } catch (e: any) {
            setError(e?.message ?? "Wykrywanie zakończone z błędem.");
            openDialogWith(makeUnknownResult());
        }
    };


    const handlePlanSubmit = ({date, mode}: { date: Date; mode: "departure" | "arrival" }) => {
        const qs = new URLSearchParams({
            mode,
            at: date.toISOString(),   // ISO 8601
        }).toString();
        navigate(`/planner?${qs}`);
    };

    return (
        <>
            <Box sx={{px: {xs: 1, md: 2}}}>
                {error && <Alert severity="error" sx={{mb: 2}}>{error}</Alert>}
                <Grid container spacing={2}>
                    <Grid size={{xs: 12, md: 8}}>
                        <Grid container spacing={2}>
                            <Grid size={{xs: 12, md: 6}}>
                                <DetectTransportTile detectSeconds={12} onComplete={handleDetectComplete}/>
                            </Grid>
                            <Grid size={{xs: 12, md: 6}}>
                                <PlanTripTile onSubmit={handlePlanSubmit}/>
                            </Grid>
                            <Grid size={{xs: 12}}>
                                <ReportIncidentTile/>
                            </Grid>
                        </Grid>
                    </Grid>
                    <Grid size={{xs: 12, md: 4}}>
                        <IncidentFeed/>
                    </Grid>
                </Grid>
            </Box>


            <DetectionResultDialog
                open={dialogOpen}
                result={result}
                onClose={() => setDialogOpen(false)}
                onManualDefine={() => props.onManualDefine?.()}
                onPlanTrip={({mode, vehicleId}) => {
                    setDialogOpen(false);
                    const qs = new URLSearchParams({
                        mode,
                        ...(vehicleId?.trim() ? {vehicleId: vehicleId.trim()} : {}),
                    });
                    navigate(`/planner?${qs.toString()}`);
                }}
            />
        </>

    );
}