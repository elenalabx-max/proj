import { create } from "zustand";

type ReminderPanelState = {
  reminderId: string | null;
  open: (reminderId: string) => void;
  close: () => void;
};

export const useReminderPanelStore = create<ReminderPanelState>((set) => ({
  reminderId: null,
  open: (reminderId) => set({ reminderId }),
  close: () => set({ reminderId: null }),
}));
