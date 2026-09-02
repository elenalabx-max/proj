import { create } from "zustand";

// 只有手機寬度（< md）才會用到——桌面版 Sidebar 一直都在，這個 store 只管
// 手機上那個抽屜式選單目前是開還關。
type SidebarState = {
  mobileOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
};

export const useSidebarStore = create<SidebarState>((set) => ({
  mobileOpen: false,
  open: () => set({ mobileOpen: true }),
  close: () => set({ mobileOpen: false }),
  toggle: () => set((s) => ({ mobileOpen: !s.mobileOpen })),
}));
