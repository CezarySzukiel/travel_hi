import { useEffect, useState } from "react";
import { Container, CircularProgress, Box, Typography } from "@mui/material";
import { getUserProfile } from "../services/user";
import type { User } from "../services/user";
import UserInfoCard from "../components/user/UserInfoCard";
import UserPointsCard from "../components/user/UserPointsCard";
import UserIncidentsList from "../components/user/UserIncidentsList";

const UserProfile: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getUserProfile()
            .then(setUser)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading)
        return (
            <Box display="flex" justifyContent="center" alignItems="center" height="70vh">
                <CircularProgress />
            </Box>
        );

    if (!user)
        return (
            <Typography align="center" color="error" mt={5}>
                Nie udało się pobrać profilu użytkownika.
            </Typography>
        );

    return (
        <Container maxWidth="md" sx={{ py: 4 }}>
            <UserInfoCard user={user} />
            <UserPointsCard points={user.points} />
            <UserIncidentsList />
        </Container>
    );
};

export default UserProfile;
