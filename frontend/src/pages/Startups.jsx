import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { api } from "@/lib/api";
import { ArrowUpRight } from "lucide-react";

const STAGE_COLORS = {
  "Pre-seed": "#22D3EE",
  "Seed": "#A3E635",
  "Series A": "#F472B6",
  "Series B": "#FBBF24",
};

export default function Startups() {
  const [startups, setStartups] = useState([]);
  const [q, setQ] = useState("");
  const [industry, setIndustry] = useState("All");

  useEffect(() => {
    api.get("/startups").then((r) => setStartups(r.data)).catch(() => {});
  }, []);

  const industries = ["All", ...Array.from(new Set(startups.map((s) => s.industry).filter(Boolean)))];
  const filtered = startups.filter((s) =>
    (industry === "All" || s.industry === industry) &&
    (s.name.toLowerCase().includes(q.toLowerCase()) || s.tagline.toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <Navbar />
      <div className="max-w-[1400px] mx-auto px-6 py-10">
        <div className="font-mono text-sm text-[#22D3EE]">// hiring now</div>
        <h1 className="font-heading text-4xl sm:text-5xl font-bold tracking-tight mt-3">Virtual startups</h1>
        <p className="mt-4 max-w-2xl font-mono text-sm text-white/60">Pick one. Apply. Start shipping.</p>

        <div className="mt-8 border border-white/10 bg-white/[0.02] p-4 flex flex-col md:flex-row gap-4 md:items-center">
          <input
            data-testid="startups-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search startups…"
            className="flex-1 bg-transparent border-0 border-b border-white/15 focus:border-[#22D3EE] px-0 py-2 font-mono text-sm text-white placeholder:text-white/30 focus:outline-none"
          />
          <div className="flex gap-2 flex-wrap">
            {industries.map((i) => (
              <button
                key={i}
                onClick={() => setIndustry(i)}
                data-testid={`startups-filter-${i}`}
                className={`font-mono text-xs px-3 py-1.5 border transition-colors ${
                  industry === i
                    ? "bg-white text-[#0A0A0A] border-white"
                    : "text-white/60 border-white/15 hover:text-white hover:border-white/40"
                }`}
              >
                {i}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((s) => {
            const stageColor = STAGE_COLORS[s.stage] || "#A3E635";
            return (
              <Link
                key={s.id}
                to={`/startups/${s.id}`}
                data-testid={`startup-card-${s.id}`}
                className="group relative border border-white/10 hover:border-white/30 bg-white/[0.02] hover:bg-white/[0.04] p-6 transition-colors"
              >
                <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${stageColor}, transparent)` }} />

                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-heading text-2xl font-bold tracking-tight group-hover:text-[#22D3EE] transition-colors">{s.name}</div>
                    <p className="mt-2 text-sm font-mono text-white/60 line-clamp-2">{s.tagline}</p>
                  </div>
                  <span
                    className="font-mono text-[10px] uppercase tracking-widest px-2 py-1 border rounded-full whitespace-nowrap"
                    style={{ color: stageColor, borderColor: `${stageColor}55` }}
                  >
                    {s.stage}
                  </span>
                </div>

                <div className="mt-5 flex flex-wrap gap-1.5">
                  {(s.tech_stack || []).slice(0, 4).map((t) => (
                    <span key={t} className="font-mono text-[11px] text-white/70 bg-white/5 border border-white/10 px-2 py-0.5">
                      {t}
                    </span>
                  ))}
                </div>

                <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
                  <div className="flex gap-5">
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-widest text-white/40">members</div>
                      <div className="font-heading text-lg font-bold">{String(s.members_count || 0).padStart(2,"0")}</div>
                    </div>
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-widest text-white/40">tasks</div>
                      <div className="font-heading text-lg font-bold">{String(s.tasks_count || 0).padStart(2,"0")}</div>
                    </div>
                  </div>
                  <ArrowUpRight size={16} className="text-white/40 group-hover:text-[#22D3EE] transition-colors" />
                </div>
              </Link>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="mt-8 border border-white/10 bg-white/[0.02] p-10 font-mono text-sm text-white/50">No startups match your filter.</div>
        )}
      </div>
    </div>
  );
}
