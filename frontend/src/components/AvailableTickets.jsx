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
        
        // Filter by user's selected technologies
        if (user?.stack?.length) {
          url += `?tech_stack=${encodeURIComponent(user.stack.join(","))}`;
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
          // loading assignments matching your tech stack
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Info Banner - Show selected tech stack */}
      {user?.stack?.length > 0 && (
        <div className="border border-[#22D3EE]/50 bg-[#22D3EE]/5 p-4">
          <div className="font-mono text-xs text-[#22D3EE]">// filtered by your stack</div>
          <div className="flex flex-wrap gap-2 mt-2">
            {user.stack.map((tech) => (
              <span
                key={tech}
                className="font-mono text-[10px] bg-[#22D3EE]/10 border border-[#22D3EE]/40 text-[#22D3EE] px-2 py-1 rounded"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      )}

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
              ? "No assignments match your search criteria."
              : user?.stack?.length === 0
              ? "Select your technologies in profile to see available assignments."
              : "No assignments available for your tech stack at the moment."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Assignment Count */}
          <div className="font-mono text-xs text-white/60">
            {filtered.length} assignment{filtered.length !== 1 ? "s" : ""} available
          </div>

          {/* Assignments List */}
          {filtered.map((ticket) => {
            const diff = DIFFICULTY_META[ticket.difficulty] || DIFFICULTY_META.medium;
            return (
              <Link
                key={ticket.id}
                to={`/startups/${ticket.startup_id}`}
                className="group relative border border-white/10 hover:border-white/30 bg-white/[0.02] hover:bg-white/[0.04] p-5 transition-colors block"
              >
                {/* Difficulty accent */}
                <div
                  className="absolute top-0 left-0 right-0 h-px"
                  style={{ background: `linear-gradient(90deg, transparent, ${diff.color}, transparent)` }}
                />

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                  {/* Left: Title & Description */}
                  <div className="md:col-span-6">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-mono text-[10px] uppercase tracking-widest text-white/40">
                          {ticket.startup_name}
                        </div>
                        <div className="font-heading text-base font-bold mt-1 group-hover:text-[#22D3EE] transition-colors line-clamp-2">
                          {ticket.title}
                        </div>
                        <p className="text-xs font-mono text-white/60 mt-2 line-clamp-2">
                          {ticket.customer_problem || ticket.description}
                        </p>
                      </div>
                      <ArrowUpRight size={14} className="text-white/40 group-hover:text-[#22D3EE] transition-colors flex-shrink-0 mt-1" />
                    </div>
                  </div>

                  {/* Middle: Skills & Tech Stack */}
                  <div className="md:col-span-3">
                    {ticket.tech_stack?.length > 0 && (
                      <div>
                        <div className="font-mono text-[10px] uppercase tracking-widest text-white/40 mb-2">
                          Tech Stack
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {ticket.tech_stack.slice(0, 3).map((tech) => (
                            <span
                              key={tech}
                              className={`font-mono text-[10px] px-1.5 py-0.5 border rounded ${
                                user?.stack?.includes(tech)
                                  ? "border-[#22D3EE] bg-[#22D3EE]/10 text-[#22D3EE]"
                                  : "border-white/10 bg-white/5 text-white/60"
                              }`}
                            >
                              {tech}
                            </span>
                          ))}
                          {ticket.tech_stack?.length > 3 && (
                            <span className="font-mono text-[10px] text-white/40">
                              +{ticket.tech_stack.length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right: Difficulty, XP, Status */}
                  <div className="md:col-span-3 flex flex-col gap-3">
                    <div className="flex gap-3">
                      <div>
                        <div className="font-mono text-[10px] uppercase tracking-widest text-white/40">
                          Difficulty
                        </div>
                        <span
                          className="font-mono text-[10px] uppercase tracking-widest px-2 py-0.5 border rounded inline-block mt-1"
                          style={{ color: diff.color, borderColor: `${diff.color}55` }}
                        >
                          {diff.label}
                        </span>
                      </div>
                      <div>
                        <div className="font-mono text-[10px] uppercase tracking-widest text-white/40">
                          Reward
                        </div>
                        <div className="font-mono text-[10px] text-[#FBBF24] flex items-center gap-1 mt-1">
                          <Zap size={10} /> +{ticket.points} XP
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    {ticket.status && (
                      <div>
                        <div className="font-mono text-[10px] uppercase tracking-widest text-white/40">
                          Status
                        </div>
                        <span className="font-mono text-[10px] text-[#A3E635] inline-block mt-1">
                          {ticket.status === "open" ? "🟢 Ready to Claim" : ticket.status}
                        </span>
                      </div>
                    )}
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
