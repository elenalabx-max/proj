import { create } from "zustand";

type TodoPanelState = {
  todoId: string | null;
  open: (todoId: string) => void;
  close: () => void;
};

export const useTodoPanelStore = create<TodoPanelState>((set) => ({
  todoId: null,
  open: (todoId) => set({ todoId }),
  close: () => set({ todoId: null }),
}));
