import { create } from "zustand";

interface User {
  id: string;
  username: string;
  fullName: string;
  roleId: number;
  companyId: string;
}

interface AppState {
  // Sidebar State
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;

  // Authentication State
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  clearAuth: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  // 1. Sidebar initial state
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  // 2. Authentication initial state
  token: localStorage.getItem("auth-token"),
  user: localStorage.getItem("auth-user") 
    ? JSON.parse(localStorage.getItem("auth-user")!) 
    : null,

  setAuth: (token, user) => {
    localStorage.setItem("auth-token", token);
    localStorage.setItem("auth-user", JSON.stringify(user));
    set({ token, user });
  },

  clearAuth: () => {
    localStorage.removeItem("auth-token");
    localStorage.removeItem("auth-user");
    set({ token: null, user: null });
  }
}));

export default useAppStore;
