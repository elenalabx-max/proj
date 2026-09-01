"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "./use-user";

export type Person = {
  id: string;
  user_id: string;
  name: string;
  note: string | null;
  created_at: string;
  archived_at: string | null;
};

export function usePeople() {
  const { user } = useUser();

  return useQuery({
    queryKey: ["people", user?.id],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("people")
        .select("*")
        .is("archived_at", null)
        .order("name", { ascending: true });
      if (error) throw error;
      return data as Person[];
    },
    enabled: !!user,
  });
}

export function useCreatePerson() {
  const queryClient = useQueryClient();
  const { user } = useUser();

  return useMutation({
    mutationFn: async (name: string) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("people")
        .insert({ name, user_id: user?.id })
        .select("*")
        .single();
      if (error) throw error;
      return data as Person;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["people"] }),
  });
}
