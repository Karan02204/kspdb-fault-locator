import { useMutation } from "@tanstack/react-query";
import { queryClient } from "../lib/query-client";
import { importNetwork } from "../api/network";

export function useImportNetwork() {
  return useMutation({
    mutationFn: ({
      poles,
      transformers,
    }: {
      poles: File;
      transformers: File;
    }) => importNetwork(poles, transformers),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["network"],
      });
    },
  });
}
