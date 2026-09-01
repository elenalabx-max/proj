"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Project } from "@/lib/types";
import { useUser } from "./use-user";

export function useProjects() {
  const { user } = useUser();

  return useQuery({
    queryKey: ["projects", user?.id],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .is("archived_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Project[];
    },
    enabled: !!user,
  });
}

export function useProject(projectId: string | null) {
  return useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();
      if (error) throw error;
      return data as Project;
    },
    enabled: !!projectId,
  });
}

export type NewProject = {
  area_id: string;
  name: string;
  description?: string | null;
  color: string;
  status?: Project["status"];
  start_date?: string | null;
  due_date?: string | null;
};

export function useCreateProject() {
  const queryClient = useQueryClient();
  const { user } = useUser();

  return useMutation({
    mutationFn: async (input: NewProject) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("projects")
        .insert({ ...input, user_id: user?.id })
        .select("*")
        .single();
      if (error) throw error;
      return data as Project;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Project> }) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("projects")
        .update(patch)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw error;
      return data as Project;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project", data.id] });
    },
  });
}

export function useArchiveProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("projects")
        .update({ archived_at: new Date().toISOString(), status: "archived" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}
