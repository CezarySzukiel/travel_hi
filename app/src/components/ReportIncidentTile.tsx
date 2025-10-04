import {Card, CardContent, CardActions, Button, Typography} from "@mui/material";
import ReportProblemIcon from "@mui/icons-material/ReportProblem";
import {useNavigate} from "react-router-dom";

export default function ReportIncidentTile() {
    const nav = useNavigate();
    return (
        <Card sx={{height: "100%"}}>
            <CardContent>
                <Typography variant="h6" fontWeight={700}>Zgłoś incydent</Typography>
                <Typography variant="body2" color="text.secondary" sx={{mt: 1}}>
                    Zauważyłeś utrudnienia? Dodaj zgłoszenie i pomóż innym pasażerom.
                </Typography>
            </CardContent>
            <CardActions>
                <Button startIcon={<ReportProblemIcon/>} variant="contained" onClick={() => nav("/incidents/report")}>
                    Zgłoś
                </Button>
            </CardActions>
        </Card>
    );
}