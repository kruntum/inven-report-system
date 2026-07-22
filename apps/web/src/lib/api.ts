import { QueryClient } from "@tanstack/react-query";
import { useAppStore } from "../store/useAppStore.ts";

// 1. Setup Query Client for TanStack React Query
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000,   // 10 minutes (garbage collection)
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// 2. Fetch Wrapper with Base URL (pointed to Nginx Reverse Proxy route at /api)
const BASE_URL = "/api";

export const api = {
  request: async (path: string, options: RequestInit = {}) => {
    const token = useAppStore.getState().token;
    const activeCompanyId = useAppStore.getState().activeCompanyId || localStorage.getItem("active-company-id");
    
    const headers = new Headers(options.headers);
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    if (activeCompanyId) {
      headers.set("x-company-id", activeCompanyId);
    }
    if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    const config: RequestInit = {
      ...options,
      headers,
    };

    const response = await fetch(`${BASE_URL}${path}`, config);

    if (response.status === 401) {
      useAppStore.getState().clearAuth();
      window.location.href = "/login";
      throw new Error("Unauthorized, session expired");
    }

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "An error occurred while fetching data");
    }

    return data;
  },

  get: (path: string, options: RequestInit = {}) => 
    api.request(path, { ...options, method: "GET" }),

  post: (path: string, body: any, options: RequestInit = {}) => 
    api.request(path, { 
      ...options, 
      method: "POST", 
      body: body instanceof FormData ? body : JSON.stringify(body) 
    }),

  put: (path: string, body: any, options: RequestInit = {}) => 
    api.request(path, { 
      ...options, 
      method: "PUT", 
      body: body instanceof FormData ? body : JSON.stringify(body) 
    }),

  patch: (path: string, body?: any, options: RequestInit = {}) => 
    api.request(path, { 
      ...options, 
      method: "PATCH", 
      body: body ? JSON.stringify(body) : undefined 
    }),

  delete: (path: string, options: RequestInit = {}) => 
    api.request(path, { ...options, method: "DELETE" }),
};

export default api;
