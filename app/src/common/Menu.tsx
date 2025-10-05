import {List, ListItemButton, ListItemText, Divider} from "@mui/material";
import {Link as RouterLink} from "react-router-dom";

export default function Menu() {
    return (
        <List>
            <ListItemButton component={RouterLink} to="/">
                <ListItemText primary="Strona główna"/>
            </ListItemButton>
            <ListItemButton component={RouterLink} to="/travel">
                <ListItemText primary="Utrudnienia"/>
            </ListItemButton>
            <ListItemButton component={RouterLink} to="/planner">
                <ListItemText primary="Planuj"/>
            </ListItemButton>
            <Divider/>
        </List>
    );
}