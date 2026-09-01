import { create } from "zustand";

type TaskPanelState = {
  taskId: string | null;
  open: (taskId: string) => void;
  close: () => void;
};

export const useTaskPanelStore = create<TaskPanelState>((set) => ({
  taskId: null,
  open: (taskId) => set({ taskId }),
  close: () => set({ taskId: null }),
}));
