import { useQuery } from "@tanstack/react-query";
import { fetchMonitoringData } from "@/lib/api";
import type { MonitoringPayload } from "@/types/monitoring";

export function useMonitoringData() {
  return useQuery<MonitoringPayload>({
    queryKey: ["monitoring"],
    queryFn: async () => {
      const data = await fetchMonitoringData();
      return data as MonitoringPayload;
    },
    refetchInterval: 5000,
  });
}

