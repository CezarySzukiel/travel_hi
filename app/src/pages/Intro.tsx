import {Grid, Box} from "@mui/material";
import DetectTransportTile from "../components/DetectTransportTile";
import PlanTripTile from "../components/PlanTripTile";
import ReportIncidentTile from "../components/ReportIncidentTile";
import IncidentFeed from "../components/IncidentFeed";
import {useNavigate} from "react-router-dom";

export default function IntroPage() {
    const nav = useNavigate();

    return (
        <Box sx={{px: {xs: 1, md: 2}}}>
            <Grid container spacing={2}>
                <Grid size={{xs: 12, md: 8}}>
                    <Grid container spacing={2}>
                        <Grid size={{xs: 12, md: 6}}>
                            <DetectTransportTile onComplete={(res) => nav("/travel", {state: res})}/>
                        </Grid>
                        <Grid size={{xs: 12, md: 6}}>
                            <PlanTripTile
                                onSubmit={({date, mode}) => nav(`/travel?mode=${mode}&at=${date.toISOString()}`)}/>
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
    );
}