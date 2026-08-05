import { api } from "./axios";

export async function updateTicketStatus(ticketId: string, status: string) {
  const { data } = await api.patch(`/tickets/${ticketId}/${status}`);

  return data;
}