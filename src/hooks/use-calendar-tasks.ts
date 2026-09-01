"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Task } from "@/lib/types";
import { useUser } from "./use-user";

// Calendar 一律用 scheduled_date（排定時間），不是 due_date——
// 兩者是分開的概念，見規劃書第 23 節。
export function useTasksInRange(startDate: string, endDate: string) {
  const { user } = useUser();

  return useQuery({
    queryKey: ["tasks", "range", startDate, endDate, user?.id],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .gte("scheduled_date", startDate)
        .lte("scheduled_date", endDate)
        .is("archived_at", null)
        .order("scheduled_start", { ascending: true, nullsFirst: true });
      if (error) throw error;
      return data as Task[];
    },
    enabled: !!user,
  });
}
