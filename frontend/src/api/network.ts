import { api } from "./axios";
import type { NetworkResponse } from "../types/network";

export async function getNetwork(): Promise<NetworkResponse> {
  const { data } = await api.get<NetworkResponse>("/network");

  return data;
}
