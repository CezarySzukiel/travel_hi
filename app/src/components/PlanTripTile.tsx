import * as React from "react";
import { Card, CardContent, CardActions, Button, Stack, Typography, RadioGroup, FormControlLabel, Radio } from "@mui/material";
import { DateTimePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { pl } from "date-fns/locale";

type Props = {
  onSubmit?: (data: { date: Date; mode: "departure" | "arrival" }) => void;
};

export default function PlanTripTile({ onSubmit }: Props) {
  const [date, setDate] = React.useState<Date>(new Date());
  const [mode, setMode] = React.useState<"departure" | "arrival">("departure");

  const handle = () => onSubmit?.({ date, mode });

  return (
    <Card sx={{ height: "100%" }}>
      <CardContent>
        <Typography variant="h6" fontWeight={700}>Zaplanuj podróż</Typography>
        <Stack spacing={2} sx={{ mt: 2 }}>
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={pl}>
            <DateTimePicker
              label="Data i czas"
              value={date}
              onChange={(d)=> d && setDate(d)}
              slotProps={{ textField: { fullWidth: true } }}
            />
          </LocalizationProvider>
          <RadioGroup row value={mode} onChange={(e)=>setMode(e.target.value as any)}>
            <FormControlLabel value="departure" control={<Radio/>} label="Odjazd" />
            <FormControlLabel value="arrival" control={<Radio/>} label="Przyjazd" />
          </RadioGroup>
        </Stack>
      </CardContent>
      <CardActions>
        <Button variant="contained" onClick={handle}>Planuj</Button>
      </CardActions>
    </Card>
  );
}