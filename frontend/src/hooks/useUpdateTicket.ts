import { useMutation } from "@tanstack/react-query";

import { queryClient } from "../lib/query-client";

import { updateTicketStatus } from "../api/ticket-actions";

export function useUpdateTicket() {
  return useMutation({
    mutationFn: ({ ticketId, status }: { ticketId: string; status: string }) =>
      updateTicketStatus(ticketId, status),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["tickets"],
      });

      queryClient.invalidateQueries({
        queryKey: ["incidents"],
      });
    },
  });
}