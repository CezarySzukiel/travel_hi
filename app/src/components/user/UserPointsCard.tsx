import { Card, CardContent, Typography, Stack } from "@mui/material";

interface Props {
    points: number;
}

const UserPointsCard: React.FC<Props> = ({ points }) => (
    <Card sx={{ mb: 3, boxShadow: 3, borderRadius: 2 }}>
        <CardContent>
            <Stack alignItems="center" spacing={1}>
                <Typography variant="h6" fontWeight={600}>
                    Twoje punkty
                </Typography>
                <Typography variant="h3" color="primary" fontWeight={800}>
                    {points}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Zbieraj punkty za aktywność i zgłoszenia
                </Typography>
            </Stack>
        </CardContent>
    </Card>
);

export default UserPointsCard;
