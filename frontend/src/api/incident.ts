import { api } from "./axios";
import type { Incident } from "../types/incident";

export async function getActiveIncidents(): Promise<Incident[]> {
  const { data } = await api.get("/incidents/active");

  return data;
}