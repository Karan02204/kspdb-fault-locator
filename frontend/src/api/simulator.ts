import { api } from "./axios";

export async function simulate(action: string, payload: any) {
  const { data } = await api.post(`/simulator/${action}`, payload);

  return data;
}
