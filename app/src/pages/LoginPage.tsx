import { useState } from "react";
import { Box, Button, TextField, Typography, Alert } from "@mui/material";
import { ENV } from "../config/env";

export default function AuthPage() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        try {
            const res = await fetch(`${ENV.API_BASE_URL}/token/token`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "accept": "application/json"
                },
                body: new URLSearchParams({
                    grant_type: "password",
                    username,
                    password,
                    scope: "",
                    client_id: "string",
                    client_secret: "string",
                }),
            });

            if (!res.ok) throw new Error("Błędna nazwa użytkownika lub hasło");

            const data = await res.json();
            localStorage.setItem("token", data.access_token); // 🧩 zapis tokena
            window.location.href = "/profile"; // przekierowanie po zalogowaniu
        } catch (err: any) {
            setError(err.message);
        }
    };

    return (
        <Box display="flex" flexDirection="column" alignItems="center" mt={8}>
            <Typography variant="h5" gutterBottom>
                Logowanie użytkownika
            </Typography>

            <Box component="form" onSubmit={handleLogin} width={300}>
                <TextField
                    fullWidth
                    margin="normal"
                    label="Nazwa użytkownika"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                />
                <TextField
                    fullWidth
                    margin="normal"
                    label="Hasło"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />

                {error && <Alert severity="error">{error}</Alert>}

                <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    fullWidth
                    sx={{ mt: 2 }}
                >
                    Zaloguj się
                </Button>
            </Box>
        </Box>
    );
}
