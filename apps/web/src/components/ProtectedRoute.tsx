import * as React from "react";
import { Navigate } from "react-router-dom";
import { useAppStore } from "../store/useAppStore.ts";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAppStore((state: any) => state.token);
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}
