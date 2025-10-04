import * as React from "react";
import {
  Box,
  FormControlLabel,
  Radio,
  RadioGroup,
  Typography,
  Button,
} from "@mui/material";
import { DateTimePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { pl } from "date-fns/locale";

type TravelTimeFormProps = {
  onSubmit: (data: { date: Date | null; mode: "departure" | "arrival" }) => void;
};

export default function TravelTimeForm({ onSubmit }: TravelTimeFormProps) {
  const [date, setDate] = React.useState<Date | null>(new Date());
  const [mode, setMode] = React.useState<"departure" | "arrival">("departure");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ date, mode });
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={pl}>
      <Box
        component="form"
        onSubmit={handleSubmit}
        display="flex"
        flexDirection="column"
        gap={3}
        maxWidth={400}
      >
        <Typography variant="h6">Czas podróży</Typography>

        <DateTimePicker
          label="Data i godzina"
          value={date}
          onChange={(newDate) => setDate(newDate)}
          slotProps={{
            textField: { fullWidth: true, required: true },
          }}
        />

        <RadioGroup
          row
          value={mode}
          onChange={(e) => setMode(e.target.value as "departure" | "arrival")}
        >
          <FormControlLabel value="departure" control={<Radio />} label="Odjazd" />
          <FormControlLabel value="arrival" control={<Radio />} label="Przyjazd" />
        </RadioGroup>

        <Button type="submit" variant="contained" size="large">
          Zatwierdź
        </Button>
      </Box>
    </LocalizationProvider>
  );
}