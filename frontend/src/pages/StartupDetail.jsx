import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import UpgradeModal from "@/components/UpgradeModal";
import { api, formatApiErrorDetail } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { X, GitPullRequest, CheckCircle2, Sparkles, Zap, Bot } from "lucide-react";

const COLUMNS = [
  { key: "open", label: "Open", accent: "#22D3EE" },
  { key: "in_progress", label: "In progress", accent: "#FBBF24" },
  { key: "in_review", label: "In review", accent: "#F472B6" },
  { key: "completed", label: "Completed", accent: "#A3E635" },
];

const STAGE_COLORS = {
  "Pre-seed": "#22D3EE",
  "Seed": "#A3E635",
  "Series A": "#F472B6",
  "Series B": "#FBBF24",
};

const DIFF_META = {
  easy: { color: "#A3E635", label: "easy" },
  medium: { color: "#22D3EE", label: "medium" },
  hard: { color: "#F472B6", label: "hard" },
};

export default function StartupDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [startup, setStartup] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [joined, setJoined] = useState(false);
  const [submitTask, setSubmitTask] = useState(null);
  const [aiTask, setAiTask] = useState(null);
  const [upgradePrompt, setUpgradePrompt] = useState(null);

  const loadAll = useCallback(async () => {
    const [s, t, m] = await Promise.all([
      api.get(`/startups/${id}`),
      api.get(`/tasks?startup_id=${id}`),
      api.get(`/startups/${id}/membership`).catch(() => ({ data: { joined: false } })),
    ]);
    setStartup(s.data);
    setTasks(t.data);
    setJoined(m.data.joined);
  }, [id]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const join = async () => {
    try {
      const { data } = await api.post(`/startups/${id}/apply`);
      setJoined(true);
      toast.success(data.message || "Joined!");
      loadAll();
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail));
    }
  };

  const claim = async (taskId) => {
    try {
      await api.post(`/tasks/${taskId}/claim`);
      toast.success("Task claimed.");
      loadAll();
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail));
    }
  };

  if (!startup) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white">
        <Navbar />
        <div className="max-w-[1400px] mx-auto px-6 py-20 font-mono text-sm text-white/50">// loading</div>
      </div>
    );
  }

  const stageColor = STAGE_COLORS[startup.stage] || "#A3E635";
  const groupedTasks = COLUMNS.map((c) => ({ ...c, items: tasks.filter((t) => t.status === c.key) }));
  const isAssignee = (t) => t.assignee_id === user?.id;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <Navbar />

      {/* Header */}
      <div className="border-b border-white/10">
        <div className="max-w-[1400px] mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-white/40">{startup.industry}</span>
              <span
                className="font-mono text-[10px] uppercase tracking-widest px-2 py-1 border rounded-full"
                style={{ color: stageColor, borderColor: `${stageColor}55` }}
              >
                {startup.stage}
              </span>
            </div>
            <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mt-3">{startup.name}</h1>
            <p className="mt-4 text-base font-mono max-w-3xl text-white/70 leading-relaxed">{startup.description}</p>
            <div className="mt-5 flex flex-wrap gap-1.5">
              {(startup.tech_stack || []).map((t) => (
                <span key={t} className="font-mono text-[11px] text-white/70 bg-white/5 border border-white/10 px-2 py-0.5">{t}</span>
              ))}
            </div>
          </div>

          <div className="lg:col-span-4 border border-white/10 bg-white/[0.02]">
            <div className="grid grid-cols-2">
              <div className="p-5 border-r border-b border-white/10">
                <div className="font-mono text-[10px] uppercase tracking-widest text-white/40">members</div>
                <div className="font-heading text-3xl font-bold mt-1">{String(startup.members_count).padStart(2,"0")}</div>
              </div>
              <div className="p-5 border-b border-white/10">
                <div className="font-mono text-[10px] uppercase tracking-widest text-white/40">tasks</div>
                <div className="font-heading text-3xl font-bold mt-1">{String(startup.tasks_count).padStart(2,"0")}</div>
              </div>
            </div>
            <div className="p-5">
              <div className="font-mono text-[10px] uppercase tracking-widest text-white/40 mb-2">roles open</div>
              <div className="flex flex-wrap gap-1.5">
                {(startup.roles_open || []).map((r) => (
                  <span key={r} className="font-mono text-[11px] bg-white/5 border border-white/10 px-2 py-0.5 text-white/80">{r}</span>
                ))}
              </div>
              <button
                data-testid="startup-join-btn"
                onClick={join}
                disabled={joined}
                className={`mt-5 w-full font-mono text-sm font-semibold py-3 transition-colors ${
                  joined
                    ? "bg-[#A3E635]/10 text-[#A3E635] border border-[#A3E635]/40 cursor-default"
                    : "bg-white text-[#0A0A0A] hover:bg-[#22D3EE]"
                }`}
              >
                {joined ? "✓ You're in" : "Apply to join →"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Kanban */}
      <div className="max-w-[1400px] mx-auto px-6 py-10">
        <div className="font-mono text-sm text-[#22D3EE]">// task board</div>
        <h2 className="font-heading text-3xl font-bold tracking-tight mt-2">Backlog</h2>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {groupedTasks.map((col) => (
            <div key={col.key} className="min-h-[60vh] border border-white/10 bg-white/[0.02]">
              <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                <span className="font-mono text-xs uppercase tracking-widest" style={{ color: col.accent }}>{col.label}</span>
                <span className="font-mono text-xs text-white/40">{String(col.items.length).padStart(2,"0")}</span>
              </div>
              <div className="p-3 space-y-3">
                {col.items.length === 0 && <div className="font-mono text-[10px] uppercase tracking-widest text-white/30 p-2">// empty</div>}
                {col.items.map((t) => {
                  const diff = DIFF_META[t.difficulty] || DIFF_META.medium;
                  return (
                    <div key={t.id} data-testid={`task-card-${t.id}`} className="border border-white/10 hover:border-white/25 bg-white/[0.02] hover:bg-white/[0.04] p-4 transition-colors">
                      <div className="flex items-center justify-between">
                        <span
                          className="font-mono text-[10px] uppercase tracking-widest px-2 py-0.5 border"
                          style={{ color: diff.color, borderColor: `${diff.color}55` }}
                        >
                          {diff.label}
                        </span>
                        <span className="font-mono text-[10px] text-white/50 flex items-center gap-1">
                          <Zap size={10} className="text-[#FBBF24]"/> +{t.points}
                        </span>
                      </div>
                      <div className="font-heading font-bold text-sm mt-3 leading-snug">{t.title}</div>
                      <p className="text-xs font-mono text-white/50 mt-1 line-clamp-2">{t.description}</p>
                      <div className="mt-3 flex flex-wrap gap-1">
                        {(t.skills || []).slice(0, 3).map((sk) => (
                          <span key={sk} className="font-mono text-[10px] text-white/60 bg-white/5 border border-white/10 px-1.5 py-0.5">{sk}</span>
                        ))}
                      </div>
                      {t.assignee_name && (
                        <div className="mt-3 font-mono text-[10px] text-white/40">
                          @ <span className="text-white/80">{t.assignee_name}</span>
                        </div>
                      )}
                      <div className="mt-4">
                        {col.key === "open" && joined && (
                          <button
                            data-testid={`task-claim-${t.id}`}
                            onClick={() => claim(t.id)}
                            className="w-full font-mono text-xs font-semibold py-2 bg-white text-[#0A0A0A] hover:bg-[#22D3EE] transition-colors"
                          >
                            Claim →
                          </button>
                        )}
                        {col.key === "open" && !joined && (
                          <button onClick={join} className="w-full font-mono text-xs py-2 border border-white/15 text-white/70 hover:text-white hover:border-white/40 transition-colors">
                            Join to claim
                          </button>
                        )}
                        {col.key === "in_progress" && isAssignee(t) && (
                          <div className="space-y-2">
                            <button
                              data-testid={`task-submit-${t.id}`}
                              onClick={() => setSubmitTask(t)}
                              className="w-full font-mono text-xs font-semibold py-2 bg-[#22D3EE] text-[#0A0A0A] hover:bg-white transition-colors inline-flex items-center justify-center gap-2"
                            >
                              <GitPullRequest size={12}/> Submit PR
                            </button>
                            <button
                              data-testid={`task-ai-mentor-${t.id}`}
                              onClick={() => setAiTask(t)}
                              className="w-full font-mono text-xs py-2 border border-white/15 text-white/80 hover:border-[#F472B6]/60 hover:text-[#F472B6] transition-colors inline-flex items-center justify-center gap-2"
                            >
                              <Bot size={12}/> Ask AI Mentor
                            </button>
                          </div>
                        )}
                        {col.key === "in_review" && (
                          <div className="font-mono text-[10px] uppercase tracking-widest text-center text-[#F472B6] py-1">// under review</div>
                        )}
                        {col.key === "completed" && (
                          <div className="font-mono text-[10px] uppercase tracking-widest text-center text-[#A3E635] py-1 inline-flex items-center gap-1 justify-center w-full">
                            <CheckCircle2 size={12}/> verified
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {submitTask && (
        <SubmissionModal
          task={submitTask}
          onClose={() => setSubmitTask(null)}
          onSubmitted={() => { setSubmitTask(null); loadAll(); }}
        />
      )}
      {aiTask && (
        <AIMentorModal
          task={aiTask}
          onClose={() => setAiTask(null)}
          onUpgradeNeeded={(msg) => { setAiTask(null); setUpgradePrompt({ message: msg, feature: "AI Mentor" }); }}
        />
      )}
      <UpgradeModal
        open={!!upgradePrompt}
        onClose={() => setUpgradePrompt(null)}
        message={upgradePrompt?.message}
        feature={upgradePrompt?.feature}
      />
    </div>
  );
}

function SubmissionModal({ task, onClose, onSubmitted }) {
  const [githubUrl, setGithubUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post(`/tasks/${task.id}/submit`, { github_url: githubUrl, notes });
      toast.success("Submitted! Running mentor review…");
      try {
        await api.post(`/submissions/${data.id}/auto-approve`);
        toast.success("Mentor Bot approved your PR. Task marked complete.");
      } catch {}
      onSubmitted();
    } catch (e2) {
      toast.error(formatApiErrorDetail(e2.response?.data?.detail));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-[#0A0A0A] border border-white/15">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-[#22D3EE]">// submit pull request</div>
            <div className="font-heading text-xl font-bold mt-1 text-white">{task.title}</div>
          </div>
          <button
            data-testid="submit-close"
            onClick={onClose}
            className="text-white/60 hover:text-white border border-white/15 hover:border-white/40 p-2 transition-colors"
          >
            <X size={16}/>
          </button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-5">
          <div>
            <label className="font-mono text-[10px] uppercase tracking-widest text-white/50">GitHub PR / Repo URL *</label>
            <input
              data-testid="submit-github-url"
              type="url"
              required
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              placeholder="https://github.com/you/repo/pull/42"
              className="w-full bg-transparent border-0 border-b border-white/15 focus:border-[#22D3EE] px-0 py-3 font-mono text-sm text-white placeholder:text-white/30 focus:outline-none"
            />
          </div>
          <div>
            <label className="font-mono text-[10px] uppercase tracking-widest text-white/50">Notes for the mentor</label>
            <textarea
              data-testid="submit-notes"
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What you built, decisions you made, tradeoffs…"
              className="w-full bg-transparent border border-white/15 focus:border-[#22D3EE] px-3 py-2 font-mono text-sm text-white placeholder:text-white/30 focus:outline-none mt-1"
            />
          </div>
          <div className="border border-white/10 bg-white/[0.02] p-4 flex items-start gap-3">
            <Sparkles size={16} className="text-[#22D3EE] mt-0.5"/>
            <div className="text-xs font-mono text-white/60">
              <span className="font-bold text-white">Mentor Bot</span> will auto-review and verify your submission. Approved submissions land on your verified profile.
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="font-mono text-sm text-white/60 hover:text-white border border-white/15 hover:border-white/40 px-5 py-2.5 transition-colors">Cancel</button>
            <button
              data-testid="submit-confirm"
              disabled={busy}
              className="font-mono text-sm font-semibold bg-white text-[#0A0A0A] hover:bg-[#22D3EE] disabled:opacity-50 px-5 py-2.5 transition-colors"
            >
              {busy ? "Submitting…" : "Submit PR →"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AIMentorModal({ task, onClose, onUpgradeNeeded }) {
  const [loading, setLoading] = useState(true);
  const [review, setReview] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.post("/ai-mentor/review", { task_id: task.id });
        setReview(data);
      } catch (e) {
        const detail = e.response?.data?.detail;
        if (detail && typeof detail === "object" && detail.code === "plan_required") {
          onUpgradeNeeded(detail.message);
        } else {
          toast.error(formatApiErrorDetail(detail));
          onClose();
        }
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.id]);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-[#0A0A0A] border border-white/15 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 sticky top-0 bg-[#0A0A0A]">
          <div className="flex items-center gap-2">
            <Bot size={18} className="text-[#F472B6]" />
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-[#F472B6]">// ai mentor</div>
              <div className="font-heading text-lg font-bold mt-0.5 text-white">{task.title}</div>
            </div>
          </div>
          <button
            data-testid="ai-mentor-close"
            onClick={onClose}
            className="text-white/60 hover:text-white border border-white/15 hover:border-white/40 p-2 transition-colors"
          >
            <X size={16}/>
          </button>
        </div>

        <div className="p-6">
          {loading && (
            <div className="font-mono text-sm text-white/60 py-8 text-center">
              <div className="inline-block animate-pulse">Analyzing your task…</div>
            </div>
          )}
          {review && (
            <div className="space-y-6">
              <div className="border border-white/10 bg-white/[0.02] p-5">
                <div className="flex items-center justify-between">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-white/40">verdict</div>
                  <div className="font-mono text-xs">
                    <span className="text-white/40">score: </span>
                    <span className="text-[#A3E635] font-bold">{review.score}/100</span>
                  </div>
                </div>
                <div className="font-heading text-xl font-bold mt-2 text-[#22D3EE]">{review.verdict}</div>
                <p className="font-mono text-sm text-white/70 mt-2">{review.summary}</p>
              </div>

              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-[#A3E635] mb-2">// strengths</div>
                <ul className="space-y-2">
                  {review.strengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 font-mono text-sm text-white/80">
                      <span className="text-[#A3E635] mt-0.5">+</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-[#FBBF24] mb-2">// improvements</div>
                <ul className="space-y-2">
                  {review.improvements.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 font-mono text-sm text-white/80">
                      <span className="text-[#FBBF24] mt-0.5">→</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="border border-white/10 bg-white/[0.02] p-4 flex items-start gap-3">
                <Sparkles size={14} className="text-[#22D3EE] mt-0.5"/>
                <div className="text-xs font-mono text-white/60">
                  This review is generated by the buildX AI Mentor based on the task spec. When you submit your PR, the mentor bot will run a final verification.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

