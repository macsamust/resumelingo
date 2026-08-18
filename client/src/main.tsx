import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { AdminAuthProvider } from "./context/AdminAuthContext";
import { ToastProvider } from "./components/common/Toast";
import "./styles/global.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      {/* One toast system for the whole app — regular pages (Dashboard,
          Profile, ...) and admin pages both reach it via useToast(). Mounted
          above both auth providers so a toast can still fire from, say, a
          failed logout. */}
      <ToastProvider>
        <AuthProvider>
          <AdminAuthProvider>
            <App />
          </AdminAuthProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>
);
