import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { CheckCircle2, Zap, GitPullRequest } from "lucide-react";

const STATUS_CONFIG = {
  "ready_for_pickup": { label: "Ready for Pickup", color: "#22D3EE" },
  "in_progress": { label: "In Progress", color: "#FBBF24" },
  "in_review": { label: "In Review", color: "#F472B6" },
  "changes_requested": { label: "Changes Requested", color: "#F87171" },
  "approved": { label: "Approved", color: "#A3E635" },
  "merged": { label: "Merged", color: "#10B981" },
  "done": { label: "Done", color: "#A3E635" },
};

export default function MyTickets() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/tasks/my-tickets");
        setTickets(data);
      } catch (e) {
        console.error("Failed to load my tickets:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = filter === "all" ? tickets : tickets.filter((t) => t.status === filter);
  const statuses = ["all", ...Object.keys(STATUS_CONFIG)];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white">
        <div className="max-w-[1400px] mx-auto px-6 py-10 font-mono text-sm text-white/50">
          // loading tickets
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="border border-white/10 bg-white/[0.02] p-4 flex flex-wrap gap-2">
        {statuses.map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`font-mono text-xs px-3 py-1.5 border transition-colors ${
              filter === status
                ? "bg-white text-[#0A0A0A] border-white"
                : "text-white/60 border-white/15 hover:text-white hover:border-white/40"
            }`}
          >
            {status === "all" ? "All" : STATUS_CONFIG[status]?.label}
          </button>
        ))}
      </div>

      {/* Tickets List */}
      {filtered.length === 0 ? (
        <div className="border border-white/10 bg-white/[0.02] p-8">
          <p className="font-mono text-sm text-white/50">No tickets found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((ticket) => {
            const status = STATUS_CONFIG[ticket.status] || { label: ticket.status, color: "#A3E635" };
            return (
              <Link
                key={ticket.id}
                to={`/startups/${ticket.startup_id}`}
                className="block border border-white/10 hover:border-white/25 bg-white/[0.02] hover:bg-white/[0.04] p-5 transition-colors"
              >
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                  {/* Ticket Info */}
                  <div className="md:col-span-6">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-mono text-[10px] uppercase tracking-widest text-white/40">
                          {ticket.startup_name}
                        </div>
                        <div className="font-heading text-base font-bold mt-1 truncate">{ticket.title}</div>
                        <p className="text-xs font-mono text-white/50 mt-1 line-clamp-1">{ticket.customer_problem || ticket.description}</p>
                      </div>
                    </div>
                  </div>

                  {/* Difficulty & Points */}
                  <div className="md:col-span-2 flex gap-3">
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-widest text-white/40">Difficulty</div>
                      <div className="font-heading text-sm font-bold mt-1 capitalize">{ticket.difficulty}</div>
                    </div>
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-widest text-white/40">Points</div>
                      <div className="font-heading text-sm font-bold mt-1 flex items-center gap-1">
                        <Zap size={12} className="text-[#FBBF24]" /> +{ticket.points}
                      </div>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="md:col-span-2 text-right">
                    <span
                      className="font-mono text-[10px] uppercase tracking-widest px-2 py-1 border rounded-full inline-flex items-center gap-1"
                      style={{ color: status.color, borderColor: `${status.color}55` }}
                    >
                      {ticket.status === "done" && <CheckCircle2 size={12} />}
                      {status.label}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
