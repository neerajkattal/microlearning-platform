import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AdminApp } from "./admin/AdminApp";
import "./index.css";

// No router in the player app (App.tsx is a single internal screen
// state machine, not URL-driven) - a plain pathname check is enough to
// keep the admin dashboard on its own /admin URL without pulling in a
// routing library for one extra screen.
const RootComponent = window.location.pathname.startsWith("/admin") ? AdminApp : App;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RootComponent />
  </React.StrictMode>
);
