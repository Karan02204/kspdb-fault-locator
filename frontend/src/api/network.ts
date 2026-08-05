import type { NetworkResponse } from "../types/network";
import { api } from "./axios";


export async function importNetwork(poles: File, transformers: File) {
  const formData = new FormData();

  formData.append("poles", poles);
  formData.append("transformers", transformers);

  const { data } = await api.post("/network/import", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return data;
}

export async function getNetwork(): Promise<NetworkResponse> {
  const { data } = await api.get<NetworkResponse>("/network");

  return data;
}

