import { create } from 'zustand';

interface UIStore {
  // Config sheet (legacy — kept for any residual usage)
  configSheetOpen: boolean;
  editingConfigId: string | null;
  setConfigSheet: (open: boolean, editingId?: string | null) => void;

  // Sidebar collapsed state — persists across pages
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  configSheetOpen: false,
  editingConfigId: null,
  setConfigSheet: (open, editingId = null) =>
    set({ configSheetOpen: open, editingConfigId: open ? editingId : null }),

  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
}));
