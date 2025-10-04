import { Container, Typography } from "@mui/material";
import { IncidentsMap } from "./components/map/IncidentsMap";
import "./App.css";

function App() {
    return (
        <Container maxWidth="lg" sx={{ py: 3 }}>
            <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>
                Travel HI — Mapa utrudnień
            </Typography>
            <IncidentsMap />
        </Container>
    );
}

export default App;
