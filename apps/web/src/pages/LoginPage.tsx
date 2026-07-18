import { Navigate } from "react-router-dom";
import { useAppStore } from "../store/useAppStore.ts";
import { LoginForm } from "../components/login-form.tsx";

export function LoginPage() {
  const token = useAppStore((state: any) => state.token);

  // Redirect if already logged in
  if (token) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8 text-foreground">
      <div className="w-full max-w-md space-y-6">
        <LoginForm />
      </div>
    </div>
  );
}
