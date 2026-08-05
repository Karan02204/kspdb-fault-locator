import { useQuery } from "@tanstack/react-query";
import { getTickets } from "../api/tickets";

export function useTickets() {
  return useQuery({
    queryKey: ["tickets"],
    queryFn: getTickets,
  });
}