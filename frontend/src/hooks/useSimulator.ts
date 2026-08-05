import { useMutation } from "@tanstack/react-query";
import { simulate } from "../api/simulator";

export function useSimulator() {
  return useMutation({
    mutationFn: ({ action, payload }: { action: string; payload: any }) =>
      simulate(action, payload),
  });
}
