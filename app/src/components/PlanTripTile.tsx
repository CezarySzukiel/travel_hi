// src/components/PlanTripTile.tsx
import * as React from "react";
import {
    Card, CardContent, CardActions, Button, Stack, ToggleButtonGroup,
    ToggleButton, Typography
} from "@mui/material";
import {DateTimePicker, LocalizationProvider} from "@mui/x-date-pickers";
import {AdapterDateFns} from "@mui/x-date-pickers/AdapterDateFns";
import {pl} from "date-fns/locale";

type Mode = "departure" | "arrival";

export default function PlanTripTile({
                                         defaultMode = "departure",
                                         defaultDate = new Date(),
                                         onSubmit,
                                     }: {
    defaultMode?: Mode;
    defaultDate?: Date;
    onSubmit: (args: { date: Date; mode: Mode }) => void;
}) {
    const [mode, setMode] = React.useState<Mode>(defaultMode);
    const [date, setDate] = React.useState<Date>(defaultDate);

    const canSubmit = date instanceof Date && !Number.isNaN(+date);

    return (
        <Card>
            <CardContent>
                <Typography variant="h6" fontWeight={700}>Zaplanuj podróż</Typography>

                <Stack spacing={2} sx={{mt: 2}}>
                    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={pl}>
                        <DateTimePicker
                            label="Data i godzina"
                            value={date}
                            onChange={(d) => d && setDate(d)}
                            slotProps={{textField: {fullWidth: true}}}
                        />
                    </LocalizationProvider>

                    <ToggleButtonGroup
                        value={mode}
                        exclusive
                        onChange={(_, v) => v && setMode(v)}
                        size="small"
                    >
                        <ToggleButton value="departure">Odjazd</ToggleButton>
                        <ToggleButton value="arrival">Przyjazd</ToggleButton>
                    </ToggleButtonGroup>
                </Stack>
            </CardContent>

            <CardActions>
                <Button
                    variant="contained"
                    disabled={!canSubmit}
                    onClick={() => onSubmit({date, mode})}
                >
                    Przejdź do planera
                </Button>
            </CardActions>
        </Card>
    );
}