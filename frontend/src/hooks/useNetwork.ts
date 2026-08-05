import { useQuery } from "@tanstack/react-query";

import { getNetwork } from "../api/network";

import type { NetworkResponse } from "../types/network";

export function useNetwork() {
  return useQuery<NetworkResponse>({
    queryKey: ["network"],
    queryFn: getNetwork,
  });
}