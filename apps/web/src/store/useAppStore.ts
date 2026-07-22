import { create } from "zustand";

export interface CompanyItem {
  id: string;
  name: string;
  taxId: string;
}

interface User {
  id: string;
  username: string;
  fullName: string;
  roleId: number;
  companyId: string;
  companies?: CompanyItem[];
}

interface AppState {
  // Sidebar State
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;

  // Authentication & Active Company State
  token: string | null;
  user: User | null;
  activeCompanyId: string | null;
  userCompanies: CompanyItem[];
  setAuth: (token: string, user: User) => void;
  clearAuth: () => void;
  setActiveCompanyId: (companyId: string) => void;
  setUserCompanies: (companies: CompanyItem[]) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // 1. Sidebar initial state
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  // 2. Authentication & Active Company initial state
  token: localStorage.getItem("auth-token"),
  user: localStorage.getItem("auth-user") 
    ? JSON.parse(localStorage.getItem("auth-user")!) 
    : null,
  activeCompanyId: localStorage.getItem("active-company-id") || null,
  userCompanies: [],

  setAuth: (token, user) => {
    localStorage.setItem("auth-token", token);
    localStorage.setItem("auth-user", JSON.stringify(user));
    const activeId = user.companyId || (user.companies && user.companies[0]?.id) || null;
    if (activeId) {
      localStorage.setItem("active-company-id", activeId);
    }
    set({ token, user, activeCompanyId: activeId, userCompanies: user.companies || [] });
  },

  clearAuth: () => {
    localStorage.removeItem("auth-token");
    localStorage.removeItem("auth-user");
    localStorage.removeItem("active-company-id");
    set({ token: null, user: null, activeCompanyId: null, userCompanies: [] });
  },

  setActiveCompanyId: (companyId: string) => {
    localStorage.setItem("active-company-id", companyId);
    set({ activeCompanyId: companyId });
  },

  setUserCompanies: (companies: CompanyItem[]) => {
    set({ userCompanies: companies });
  }
}));

export default useAppStore;
