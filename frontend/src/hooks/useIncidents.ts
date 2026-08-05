import { useQuery } from "@tanstack/react-query";

import { getActiveIncidents } from "../api/incident";

import type { Incident } from "../types/incident";

export function useIncidents() {
  return useQuery<Incident[]>({
    queryKey: ["incidents"],
    queryFn: getActiveIncidents,
  });
}
