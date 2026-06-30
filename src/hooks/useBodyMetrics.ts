import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchBodyMetrics,
  saveBodyMetric,
  deleteBodyMetric,
  type SaveBodyMetricInput,
} from '@/api/bodyMetrics';

const KEY = ['body_metrics'] as const;

export function useBodyMetrics() {
  return useQuery({ queryKey: KEY, queryFn: fetchBodyMetrics });
}

export function useSaveBodyMetric() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveBodyMetricInput) => saveBodyMetric(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteBodyMetric() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteBodyMetric(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export const bodyMetricsQueryKey = KEY;
