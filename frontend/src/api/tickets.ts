import { api } from "./axios";
import type { Ticket } from "../types/ticket";

export async function getTickets(): Promise<Ticket[]> {
  const { data } = await api.get("/tickets");

  return data;
}