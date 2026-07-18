import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";

// Layouts & Security Guards
import { ProtectedRoute } from "./components/ProtectedRoute.tsx";
import { ProtectedLayout } from "./components/layouts/ProtectedLayout.tsx";

// Pages
import { LoginPage } from "./pages/LoginPage.tsx";

// Global UI Utilities
import { ConfirmDialog } from "./components/shared/ConfirmDialog.tsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <ProtectedLayout />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ConfirmDialog />
      <Toaster position="bottom-right" richColors />
    </BrowserRouter>
  );
}