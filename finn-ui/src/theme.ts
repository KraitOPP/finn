import { createTheme } from "@mui/material/styles";

export const workspaceTheme = createTheme({
  palette: {
    primary: { main: "#09594d" },
    background: { default: "#f4f7fa", paper: "#ffffff" },
    text: { primary: "#162437", secondary: "#4d5f72" },
    divider: "#d7e0e8",
  },
  typography: {
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
    button: { textTransform: "none", fontWeight: 650 },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiButton: { defaultProps: { disableElevation: true } },
    MuiTextField: { defaultProps: { size: "small" } },
    MuiTab: {
      styleOverrides: { root: { textTransform: "none", minWidth: 72 } },
    },
  },
});
