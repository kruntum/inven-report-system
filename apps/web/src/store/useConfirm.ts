import { create } from "zustand";

export interface ConfirmOptions {
  title: string;
  description: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

export interface ConfirmStore {
  isOpen: boolean;
  title: string;
  description: string;
  onConfirm: (() => void) | null;
  onCancel: (() => void) | null;
  confirm: (options: ConfirmOptions) => void;
  close: () => void;
}

export const useConfirm = create<ConfirmStore>((set) => ({
  isOpen: false,
  title: "",
  description: "",
  onConfirm: null,
  onCancel: null,
  confirm: ({ title, description, onConfirm, onCancel }) => set({
    isOpen: true,
    title,
    description,
    onConfirm,
    onCancel: onCancel || null,
  }),
  close: () => set({ isOpen: false, title: "", description: "", onConfirm: null, onCancel: null }),
}));
