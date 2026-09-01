"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Area } from "@/lib/types";

export function useAreas() {
  return useQuery({
    queryKey: ["areas"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase.from("areas").select("*").order("type");
      if (error) throw error;
      return data as Area[];
    },
  });
}
