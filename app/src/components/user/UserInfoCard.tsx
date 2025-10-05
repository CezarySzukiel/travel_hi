import { Card, CardContent, Typography } from "@mui/material";
import type { User } from "../../services/user";

interface Props {
    user: User;
}

const UserInfoCard: React.FC<Props> = ({ user }) => (
    <Card sx={{ mb: 3, boxShadow: 3, borderRadius: 2 }}>
        <CardContent>
            <Typography variant="h5" fontWeight={700} gutterBottom>
                Witaj, {user.name} 👋
            </Typography>
            <Typography color="text.secondary">{user.email}</Typography>
        </CardContent>
    </Card>
);

export default UserInfoCard;
