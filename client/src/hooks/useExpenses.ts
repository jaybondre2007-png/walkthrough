import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type ExpenseInput } from "../lib/api";

export function useExpenses(params?: {
  categoryId?: string;
  from?: string;
  to?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: ["expenses", params],
    queryFn: () => api.expenses.list(params),
  });
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["expenses"] });
  qc.invalidateQueries({ queryKey: ["dashboard"] });
  qc.invalidateQueries({ queryKey: ["categories"] });
  qc.invalidateQueries({ queryKey: ["analytics"] });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ExpenseInput) => api.expenses.create(data),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useUpdateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ExpenseInput> }) =>
      api.expenses.update(id, data),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.expenses.remove(id),
    onSuccess: () => invalidateAll(qc),
  });
}
