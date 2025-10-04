import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { LoadScript } from "@react-google-maps/api";

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <LoadScript googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
            <App />
        </LoadScript>
    </React.StrictMode>
);
