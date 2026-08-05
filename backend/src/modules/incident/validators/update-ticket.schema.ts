import { z } from "zod";
import { TicketStatus } from "../../../../generated/prisma/enums.js";

export const updateTicketSchema = z.object({
  status: z.nativeEnum(TicketStatus),
});

export type UpdateTicketDto = z.infer<typeof updateTicketSchema>;