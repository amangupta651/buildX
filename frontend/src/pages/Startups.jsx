import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { api } from "@/lib/api";
import { ArrowUpRight } from "lucide-react";

export default function Startups() {
  const [startups, setStartups] = useState([]);
  const [q, setQ] = useState("");
  const [industry, setIndustry] = useState("ALL");

  useEffect(() => {
    api.get("/startups").then((r) => setStartups(r.data)).catch(() => {});
  }, []);

  const industries = ["ALL", ...Array.from(new Set(startups.map((s) => s.industry).filter(Boolean)))];
  const filtered = startups.filter((s) =>
    (industry === "ALL" || s.industry === industry) &&
    (s.name.toLowerCase().includes(q.toLowerCase()) || s.tagline.toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <Navbar />
      <div className="max-w-[1400px] mx-auto px-6 py-10">
        <div className="overline text-[#525252]">REGISTRY // 0X20</div>
        <h1 className="font-heading text-5xl font-black tracking-tighter mt-2">Virtual startups.</h1>
        <p className="text-sm text-[#525252] mt-2">Pick one. Apply. Start shipping.</p>

        <div className="mt-8 border border-[#1A1A1A] bg-white p-4 flex flex-col md:flex-row gap-4 md:items-center">
          <input
            data-testid="startups-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search startups…"
            className="flex-1 bg-transparent border-0 border-b-2 border-[#1A1A1A] px-0 py-2 font-mono text-sm focus:outline-none focus:border-[#FF3B30]"
          />
          <div className="flex gap-2 flex-wrap">
            {industries.map((i) => (
              <button
                key={i}
                onClick={() => setIndustry(i)}
                data-testid={`startups-filter-${i}`}
                className={`overline px-3 py-2 border border-[#1A1A1A] ${industry === i ? "bg-[#0A0A0A] text-white" : "bg-white hover:bg-[#0A0A0A] hover:text-white"}`}
              >
                {i}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 border border-[#1A1A1A]">
          {filtered.map((s, i) => (
            <Link
              key={s.id}
              to={`/startups/${s.id}`}
              data-testid={`startup-card-${s.id}`}
              className={`p-6 bg-white relative card-flat ${i % 3 !== 2 ? "lg:border-r" : ""} ${i % 2 === 0 ? "md:border-r lg:border-r" : ""} border-b border-[#1A1A1A]`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="overline text-[#525252]">{s.industry || "STARTUP"} / {s.stage}</div>
                <ArrowUpRight size={18}/>
              </div>
              <div className="font-heading text-3xl font-black tracking-tighter mt-3">{s.name}</div>
              <p className="text-sm mt-2 text-[#525252] line-clamp-3">{s.tagline}</p>

              <div className="mt-5 flex flex-wrap gap-1.5">
                {(s.tech_stack || []).slice(0, 4).map((t) => (
                  <span key={t} className="tag">{t}</span>
                ))}
              </div>

              <div className="mt-6 pt-4 border-t border-[#1A1A1A] grid grid-cols-2 gap-2">
                <div>
                  <div className="overline text-[#525252]">MEMBERS</div>
                  <div className="font-heading text-xl font-bold">{String(s.members_count || 0).padStart(2,"0")}</div>
                </div>
                <div>
                  <div className="overline text-[#525252]">TASKS</div>
                  <div className="font-heading text-xl font-bold">{String(s.tasks_count || 0).padStart(2,"0")}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="mt-8 border border-[#1A1A1A] bg-white p-10 font-mono text-sm">No startups match your filter.</div>
        )}
      </div>
    </div>
  );
}
