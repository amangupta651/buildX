import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Navigate } from "react-router-dom";
import { Users, Rocket, GitBranch, Award, RefreshCw, GitPullRequest } from "lucide-react";

export default function Admin() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/overview");
      setData(data);
      setErr("");
    } catch (e) {
      setErr(e.response?.data?.detail || e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (user?.role === "admin") load(); /* eslint-disable-next-line */ }, [user]);

  if (user && user.role !== "admin") return <Navigate to="/dashboard" replace />;

  if (!data && loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white">
        <Navbar />
        <div className="max-w-[1400px] mx-auto px-6 py-20 font-mono text-sm text-white/50">// loading admin overview</div>
      </div>
    );
  }

  const counts = data?.counts || {};

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <Navbar />
      <div className="max-w-[1400px] mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-baseline justify-between gap-4 flex-wrap">
          <div>
            <div className="font-mono text-sm text-[#F472B6]">// admin control room</div>
            <h1 className="font-heading text-4xl sm:text-5xl font-bold tracking-tight mt-2">
              Overview
            </h1>
            <p className="mt-2 font-mono text-sm text-white/60">
              Signed in as <span className="text-white">{user?.email}</span> · role: <span className="text-[#F472B6]">admin</span>
            </p>
          </div>
          <button
            onClick={load}
            data-testid="admin-refresh"
            className="font-mono text-sm text-white/70 hover:text-white border border-white/15 hover:border-white/40 px-4 py-2 transition-colors inline-flex items-center gap-2"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>

        {err && (
          <div className="mt-4 border border-[#F472B6]/40 bg-[#F472B6]/10 text-[#F472B6] px-4 py-3 font-mono text-sm">
            {String(err)}
          </div>
        )}

        {/* Counts row */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat I={Users} label="students" v={counts.students} color="#22D3EE" />
          <Stat I={Rocket} label="startups" v={counts.startups} color="#A3E635" />
          <Stat I={GitPullRequest} label="submissions" v={counts.submissions_total} color="#F472B6" />
          <Stat I={Award} label="verified" v={counts.submissions_approved} color="#FBBF24" />
        </div>

        {/* Plan breakdown */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <PlanCard label="Free" v={(counts.students || 0) - (counts.pro_subscribers || 0) - (counts.industry_subscribers || 0)} color="#94A3B8" />
          <PlanCard label="Pro ₹299/mo" v={counts.pro_subscribers} color="#22D3EE" />
          <PlanCard label="Industry ₹1499" v={counts.industry_subscribers} color="#FBBF24" />
        </div>

        {/* Signups sparkline */}
        {data?.signups_by_day?.length > 0 && (
          <div className="mt-10 border border-white/10 bg-white/[0.02] p-6">
            <div className="font-mono text-[10px] uppercase tracking-widest text-white/40">signups · last 7 days</div>
            <div className="mt-5 flex items-end gap-3 h-24">
              {data.signups_by_day.map((d) => {
                const max = Math.max(...data.signups_by_day.map((x) => x.count), 1);
                const pct = (d.count / max) * 100;
                return (
                  <div key={d.date} className="flex-1 flex flex-col items-center gap-1.5">
                    <div className="font-mono text-xs text-white/80">{d.count}</div>
                    <div className="w-full bg-white/5 h-full flex items-end">
                      <div className="w-full bg-[#22D3EE]" style={{ height: `${pct}%` }} />
                    </div>
                    <div className="font-mono text-[9px] text-white/40">{d.date.slice(5)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent signups */}
        <div className="mt-10">
          <h2 className="font-heading text-2xl font-bold tracking-tight">Recent signups</h2>
          <div className="mt-4 border border-white/10 bg-white/[0.02] overflow-x-auto">
            <table className="w-full min-w-[720px] font-mono text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left">
                  <Th>Name</Th><Th>Email</Th><Th>University</Th><Th>GitHub</Th><Th>Roles</Th><Th>Plan</Th><Th>Joined</Th>
                </tr>
              </thead>
              <tbody>
                {(data?.recent_users || []).map((u) => (
                  <tr key={u.id} className="border-b last:border-b-0 border-white/5 hover:bg-white/[0.03]">
                    <Td className="text-white font-semibold">{u.name}</Td>
                    <Td className="text-white/70">{u.email}</Td>
                    <Td className="text-white/60">{u.university || "—"}</Td>
                    <Td>{u.github_handle ? <a className="text-[#22D3EE] hover:underline" href={`https://github.com/${u.github_handle}`} target="_blank" rel="noreferrer">@{u.github_handle}</a> : <span className="text-white/40">—</span>}</Td>
                    <Td>{(u.roles_wanted || []).slice(0, 2).map((r) => <span key={r} className="mr-1 text-[10px] text-white/60 bg-white/5 border border-white/10 px-1.5 py-0.5">{r}</span>)}</Td>
                    <Td>
                      <PlanBadge plan={u.plan} />
                    </Td>
                    <Td className="text-white/50 text-xs">{u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}</Td>
                  </tr>
                ))}
                {(!data?.recent_users || data.recent_users.length === 0) && (
                  <tr><td colSpan={7} className="px-4 py-6 text-white/50 text-center">No signups yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent submissions */}
        <div className="mt-10 mb-16">
          <h2 className="font-heading text-2xl font-bold tracking-tight">Recent submissions</h2>
          <div className="mt-4 border border-white/10 bg-white/[0.02] overflow-x-auto">
            <table className="w-full min-w-[720px] font-mono text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left">
                  <Th>Ticket</Th><Th>Student</Th><Th>PR</Th><Th>Overall</Th><Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {(data?.recent_submissions || []).map((s) => (
                  <tr key={s.id} className="border-b last:border-b-0 border-white/5 hover:bg-white/[0.03]">
                    <Td>
                      <div className="text-[10px] text-white/40">{s.ticket_no || "—"}</div>
                      <div className="text-white text-xs">{s.task_title || "—"}</div>
                    </Td>
                    <Td>
                      <div className="text-white text-xs">{s.user_name}</div>
                      <div className="text-white/40 text-[10px]">{s.user_email}</div>
                    </Td>
                    <Td className="truncate max-w-[260px]"><a href={s.github_url} target="_blank" rel="noreferrer" className="text-[#22D3EE] hover:underline inline-flex items-center gap-1 text-xs"><GitBranch size={10}/>{s.github_url.replace("https://","").slice(0, 40)}</a></Td>
                    <Td>{s.overall != null ? <span className={`font-bold ${s.overall >= 60 ? "text-[#A3E635]" : "text-[#F472B6]"}`}>{s.overall}</span> : <span className="text-white/40">—</span>}</Td>
                    <Td><StatusBadge status={s.status} /></Td>
                  </tr>
                ))}
                {(!data?.recent_submissions || data.recent_submissions.length === 0) && (
                  <tr><td colSpan={5} className="px-4 py-6 text-white/50 text-center">No submissions yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ I, label, v, color }) {
  return (
    <div className="border border-white/10 bg-white/[0.02] p-5">
      <I size={18} strokeWidth={1.4} style={{ color }} />
      <div className="font-mono text-[10px] uppercase tracking-widest text-white/40 mt-3">{label}</div>
      <div className="font-heading text-3xl font-bold mt-1" style={{ color }}>{v ?? 0}</div>
    </div>
  );
}
function PlanCard({ label, v, color }) {
  return (
    <div className="border border-white/10 bg-white/[0.02] p-4 flex items-baseline justify-between">
      <div className="font-mono text-xs text-white/60">{label}</div>
      <div className="font-heading text-2xl font-bold" style={{ color }}>{v ?? 0}</div>
    </div>
  );
}
function Th({ children }) { return <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-white/40 font-normal">{children}</th>; }
function Td({ children, className = "" }) { return <td className={`px-4 py-3 ${className}`}>{children}</td>; }
function PlanBadge({ plan }) {
  const map = {
    pro: { c: "#22D3EE", label: "PRO" },
    industry: { c: "#FBBF24", label: "IEP" },
    free: { c: "#94A3B8", label: "FREE" },
  };
  const p = map[plan] || map.free;
  return <span className="font-mono text-[10px] px-2 py-0.5 border" style={{ color: p.c, borderColor: `${p.c}55` }}>{p.label}</span>;
}
function StatusBadge({ status }) {
  const c = status === "approved" ? "#A3E635" : status === "rejected" ? "#F472B6" : "#FBBF24";
  return <span className="font-mono text-[10px] px-2 py-0.5 border rounded-full" style={{ color: c, borderColor: `${c}55` }}>{status}</span>;
}
