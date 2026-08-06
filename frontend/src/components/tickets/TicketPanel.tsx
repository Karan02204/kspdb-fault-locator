import { useTickets } from "../../hooks/useTickets";
import TicketCard from "./ticketCard";

export default function TicketPanel() {
  const { data, isLoading } = useTickets();

  return (
    <div className="rounded-2xl bg-white p-5 shadow-lg h-full">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-bold">Active Tickets</h2>

        <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
          {data?.length ?? 0}
        </span>
      </div>

      {isLoading && <div>Loading...</div>}

      <div className="space-y-4">
        {data?.map((ticket) => (
          <TicketCard key={ticket.id} ticket={ticket} />
        ))}
      </div>
    </div>
  );
}
