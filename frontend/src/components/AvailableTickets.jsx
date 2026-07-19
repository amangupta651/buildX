import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { ArrowUpRight, Zap, Filter } from "lucide-react";

const DIFFICULTY_META = {
  easy: { color: "#A3E635", label: "easy" },
  medium: { color: "#22D3EE", label: "medium" },
  hard: { color: "#F472B6", label: "hard" },
};

export default function AvailableTickets() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [difficulty, setDifficulty] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      try {
        let url = "/tasks/available";
        if (user?.stack?.length) {
          url += `?stack=${encodeURIComponent(user.stack.join(","))}`;
        }
        const { data } = await api.get(url);
        setTickets(data);
      } catch (e) {
        console.error("Failed to load available tickets:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.stack]);

  const filtered = tickets.filter((t) => {
    const matchDifficulty = difficulty === "all" || t.difficulty === difficulty;
    const matchSearch =
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.startup_name.toLowerCase().includes(search.toLowerCase());
    return matchDifficulty && matchSearch;
  });

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
      {/* Search & Filter */}
      <div className="border border-white/10 bg-white/[0.02] p-4 space-y-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title or startup…"
          className="w-full bg-transparent border-0 border-b border-white/15 focus:border-[#22D3EE] px-0 py-2 font-mono text-sm text-white placeholder:text-white/30 focus:outline-none"
        />
        <div className="flex gap-2 flex-wrap">
          {["all", "easy", "medium", "hard"].map((d) => (
            <button
              key={d}
              onClick={() => setDifficulty(d)}
              className={`font-mono text-xs px-3 py-1.5 border transition-colors ${
                difficulty === d
                  ? "bg-white text-[#0A0A0A] border-white"
                  : "text-white/60 border-white/15 hover:text-white hover:border-white/40"
              }`}
            >
              {d === "all" ? "All difficulties" : d}
            </button>
          ))}
        </div>
      </div>

      {/* Tickets Grid */}
      {filtered.length === 0 ? (
        <div className="border border-white/10 bg-white/[0.02] p-8">
          <p className="font-mono text-sm text-white/50">
            {search || difficulty !== "all"
              ? "No tickets match your search."
              : "No available tickets at the moment."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((ticket) => {
            const diff = DIFFICULTY_META[ticket.difficulty] || DIFFICULTY_META.medium;
            return (
              <Link
                key={ticket.id}
                to={`/startups/${ticket.startup_id}`}
                className="group relative border border-white/10 hover:border-white/30 bg-white/[0.02] hover:bg-white/[0.04] p-5 transition-colors"
              >
                {/* Difficulty accent */}
                <div
                  className="absolute top-0 left-0 right-0 h-px"
                  style={{ background: `linear-gradient(90deg, transparent, ${diff.color}, transparent)` }}
                />

                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-widest text-white/40">
                      {ticket.startup_name}
                    </div>
                    <div className="font-heading text-base font-bold mt-1 group-hover:text-[#22D3EE] transition-colors">
                      {ticket.title}
                    </div>
                  </div>
                  <ArrowUpRight size={14} className="text-white/40 group-hover:text-[#22D3EE] transition-colors flex-shrink-0" />
                </div>

                <p className="text-xs font-mono text-white/60 line-clamp-2 mb-4">
                  {ticket.customer_problem || ticket.description}
                </p>

                {/* Skills */}
                {ticket.skills?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {ticket.skills.slice(0, 3).map((skill) => (
                      <span key={skill} className="font-mono text-[10px] text-white/60 bg-white/5 border border-white/10 px-1.5 py-0.5">
                        {skill}
                      </span>
                    ))}
                  </div>
                )}

                {/* Footer */}
                <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                  <div className="flex gap-3">
                    <div>
                      <span
                        className="font-mono text-[10px] uppercase tracking-widest px-2 py-0.5 border"
                        style={{ color: diff.color, borderColor: `${diff.color}55` }}
                      >
                        {diff.label}
                      </span>
                    </div>
                    <div className="font-mono text-[10px] text-white/50 flex items-center gap-1">
                      <Zap size={10} className="text-[#FBBF24]" />
                      +{ticket.points}
                    </div>
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
