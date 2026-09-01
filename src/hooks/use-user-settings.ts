"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { UserSettings } from "@/lib/types";
import { useUser } from "./use-user";

export function useUserSettings() {
  const { user } = useUser();

  return useQuery({
    queryKey: ["user_settings", user?.id],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("user_settings")
        .select("*")
        .single();
      if (error) throw error;
      return data as UserSettings;
    },
    enabled: !!user,
  });
}

export function useUpdateUserSettings() {
  const queryClient = useQueryClient();
  const { user } = useUser();

  return useMutation({
    mutationFn: async (patch: Partial<UserSettings>) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("user_settings")
        .update(patch)
        .eq("user_id", user?.id)
        .select("*")
        .single();
      if (error) throw error;
      return data as UserSettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user_settings"] });
    },
  });
}
