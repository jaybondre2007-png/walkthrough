import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type IncomeInput } from "../lib/api";

export function useIncome(params?: {
  categoryId?: string;
  from?: string;
  to?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: ["income", params],
    queryFn: () => api.income.list(params),
  });
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["income"] });
  qc.invalidateQueries({ queryKey: ["dashboard"] });
  qc.invalidateQueries({ queryKey: ["categories"] });
  qc.invalidateQueries({ queryKey: ["analytics"] });
}

export function useCreateIncome() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: IncomeInput) => api.income.create(data),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useUpdateIncome() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<IncomeInput> }) =>
      api.income.update(id, data),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useDeleteIncome() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.income.remove(id),
    onSuccess: () => invalidateAll(qc),
  });
}
