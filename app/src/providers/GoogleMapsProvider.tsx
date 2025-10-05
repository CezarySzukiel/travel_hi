// src/providers/GoogleMapsProvider.tsx
import * as React from "react";
import {Box, CircularProgress, Alert} from "@mui/material";
import {useJsApiLoader} from "@react-google-maps/api";

type Ctx = { isLoaded: boolean; loadError: Error | undefined };
const GoogleMapsContext = React.createContext<Ctx>({isLoaded: false, loadError: undefined});

export function useGoogleMaps() {
    return React.useContext(GoogleMapsContext);
}

type Props = {
    children: React.ReactNode;
    blockUntilLoaded?: boolean;
};

export function GoogleMapsProvider({children, blockUntilLoaded = true}: Props) {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
    const {isLoaded, loadError} = useJsApiLoader({
        id: "gmaps-sdk",
        googleMapsApiKey: apiKey,
        libraries: ["places"],
    });

    if (blockUntilLoaded) {
        if (!apiKey) {
            return (
                <Box
                    sx={{
                        display: "grid",
                        placeItems: "center",
                        minHeight: "40vh",
                    }}
                >
                    <Alert severity="warning">
                        Brakuje <code>VITE_GOOGLE_MAPS_API_KEY</code> w pliku <code>.env</code>.
                    </Alert>
                </Box>
            );
        }
        if (loadError) {
            return (
                <Box
                    sx={{
                        display: "grid",
                        placeItems: "center",
                        minHeight: "40vh",
                    }}
                >
                    <Alert severity="error">Błąd ładowania Google Maps SDK.</Alert>
                </Box>
            );
        }
        if (!isLoaded) {
            return (
                <Box
                    sx={{
                        display: "grid",
                        placeItems: "center",
                        height: "100vh",
                    }}
                >
                    <CircularProgress/>
                </Box>
            );
        }
    }

    return (
        <GoogleMapsContext.Provider value={{isLoaded, loadError}}>
            {children}
        </GoogleMapsContext.Provider>
    );
}