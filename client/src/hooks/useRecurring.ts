import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type RecurringInput, type RecurringUpdateInput } from "../lib/api";

export function useRecurring() {
  return useQuery({ queryKey: ["recurring"], queryFn: api.recurring.list });
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["recurring"] });
  qc.invalidateQueries({ queryKey: ["expenses"] });
  qc.invalidateQueries({ queryKey: ["income"] });
  qc.invalidateQueries({ queryKey: ["dashboard"] });
  qc.invalidateQueries({ queryKey: ["analytics"] });
}

export function useCreateRecurring() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: RecurringInput) => api.recurring.create(data),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useUpdateRecurring() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: RecurringUpdateInput }) =>
      api.recurring.update(id, data),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useDeleteRecurring() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.recurring.remove(id),
    onSuccess: () => invalidateAll(qc),
  });
}
