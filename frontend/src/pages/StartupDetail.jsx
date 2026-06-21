import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { api, formatApiErrorDetail } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { X, GitPullRequest, CheckCircle2, Sparkles } from "lucide-react";

const COLUMNS = [
  { key: "open", label: "OPEN" },
  { key: "in_progress", label: "IN PROGRESS" },
  { key: "in_review", label: "IN REVIEW" },
  { key: "completed", label: "COMPLETED" },
];

const DIFF_TAG = { easy: "tag", medium: "tag tag-blue", hard: "tag tag-red" };

export default function StartupDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [startup, setStartup] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [joined, setJoined] = useState(false);
  const [submitTask, setSubmitTask] = useState(null);

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
      <div className="min-h-screen bg-[#FAFAFA]">
        <Navbar />
        <div className="max-w-[1400px] mx-auto px-6 py-20 overline">LOADING //</div>
      </div>
    );
  }

  const groupedTasks = COLUMNS.map((c) => ({ ...c, items: tasks.filter((t) => t.status === c.key) }));
  const isAssignee = (t) => t.assignee_id === user?.id;

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <Navbar />

      {/* Header */}
      <div className="border-b border-[#1A1A1A] bg-white">
        <div className="max-w-[1400px] mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8">
            <div className="overline text-[#525252]">{startup.industry} / {startup.stage}</div>
            <h1 className="font-heading text-5xl sm:text-6xl font-black tracking-tighter mt-2">{startup.name}</h1>
            <p className="mt-3 text-base max-w-3xl leading-relaxed">{startup.description}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {(startup.tech_stack || []).map((t) => <span key={t} className="tag">{t}</span>)}
            </div>
          </div>
          <div className="lg:col-span-4 border border-[#1A1A1A]">
            <div className="grid grid-cols-2">
              <div className="p-5 border-r border-b border-[#1A1A1A]">
                <div className="overline text-[#525252]">MEMBERS</div>
                <div className="font-heading text-3xl font-black mt-1">{String(startup.members_count).padStart(2,"0")}</div>
              </div>
              <div className="p-5 border-b border-[#1A1A1A]">
                <div className="overline text-[#525252]">TASKS</div>
                <div className="font-heading text-3xl font-black mt-1">{String(startup.tasks_count).padStart(2,"0")}</div>
              </div>
              <div className="p-5 col-span-2">
                <div className="overline text-[#525252] mb-2">ROLES OPEN</div>
                <div className="flex flex-wrap gap-1.5">
                  {(startup.roles_open || []).map((r) => <span key={r} className="tag tag-ink">{r}</span>)}
                </div>
                <button
                  data-testid="startup-join-btn"
                  onClick={join}
                  disabled={joined}
                  className={`mt-5 w-full ${joined ? "btn-ghost cursor-default" : "btn-primary"}`}
                >
                  {joined ? "✓ Joined" : "Apply to join →"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Kanban */}
      <div className="max-w-[1400px] mx-auto px-6 py-10">
        <div className="overline text-[#525252]">CONTROL ROOM // TASK BOARD</div>
        <h2 className="font-heading text-3xl font-bold tracking-tight mt-2">Backlog</h2>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 border border-[#1A1A1A] bg-white">
          {groupedTasks.map((col, i) => (
            <div key={col.key} className={`min-h-[60vh] ${i < 3 ? "lg:border-r md:border-r" : ""} border-b lg:border-b-0 border-[#1A1A1A]`}>
              <div className="px-4 py-3 border-b border-[#1A1A1A] flex items-center justify-between bg-[#0A0A0A] text-white">
                <span className="overline">{col.label}</span>
                <span className="overline">{String(col.items.length).padStart(2,"0")}</span>
              </div>
              <div className="p-3 space-y-3">
                {col.items.length === 0 && <div className="overline text-[#525252] p-2">EMPTY //</div>}
                {col.items.map((t) => (
                  <div key={t.id} data-testid={`task-card-${t.id}`} className="border border-[#1A1A1A] bg-white p-4">
                    <div className="flex items-center justify-between">
                      <span className={DIFF_TAG[t.difficulty] || "tag"}>{t.difficulty.toUpperCase()}</span>
                      <span className="overline text-[#525252]">+{t.points} XP</span>
                    </div>
                    <div className="font-heading font-bold text-base mt-2 leading-snug">{t.title}</div>
                    <p className="text-xs text-[#525252] mt-1 line-clamp-2">{t.description}</p>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {(t.skills || []).slice(0, 3).map((sk) => <span key={sk} className="tag text-[9px]">{sk}</span>)}
                    </div>
                    {t.assignee_name && (
                      <div className="mt-3 overline text-[#525252]">ASSIGNEE: <span className="text-[#0A0A0A]">{t.assignee_name}</span></div>
                    )}
                    <div className="mt-4">
                      {col.key === "open" && joined && (
                        <button data-testid={`task-claim-${t.id}`} onClick={() => claim(t.id)} className="btn-primary w-full text-[11px] py-2">Claim →</button>
                      )}
                      {col.key === "open" && !joined && (
                        <button onClick={join} className="btn-ghost w-full text-[11px] py-2">Join to claim</button>
                      )}
                      {col.key === "in_progress" && isAssignee(t) && (
                        <button data-testid={`task-submit-${t.id}`} onClick={() => setSubmitTask(t)} className="btn-primary w-full text-[11px] py-2 inline-flex items-center justify-center gap-2">
                          <GitPullRequest size={14}/> Submit PR
                        </button>
                      )}
                      {col.key === "in_review" && (
                        <div className="overline text-center text-[#525252] py-1">UNDER MENTOR REVIEW</div>
                      )}
                      {col.key === "completed" && (
                        <div className="overline text-center text-[#FF3B30] py-1 inline-flex items-center gap-1"><CheckCircle2 size={12}/> VERIFIED</div>
                      )}
                    </div>
                  </div>
                ))}
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
      // Demo auto-approve via Mentor Bot for instant feedback loop
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
    <div className="fixed inset-0 z-50 bg-[#0A0A0A]/70 flex items-end md:items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white border border-[#1A1A1A]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1A1A1A]">
          <div>
            <div className="overline text-[#525252]">SUBMIT PULL REQUEST</div>
            <div className="font-heading text-2xl font-bold mt-1">{task.title}</div>
          </div>
          <button data-testid="submit-close" onClick={onClose} className="border border-[#1A1A1A] p-2 hover:bg-[#0A0A0A] hover:text-white"><X size={16}/></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-5">
          <div>
            <label className="overline">GitHub PR / Repo URL *</label>
            <input
              data-testid="submit-github-url"
              type="url"
              required
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              placeholder="https://github.com/you/repo/pull/42"
              className="w-full bg-transparent border-0 border-b-2 border-[#1A1A1A] px-0 py-3 font-mono text-sm focus:outline-none focus:border-[#FF3B30]"
            />
          </div>
          <div>
            <label className="overline">Notes for the mentor</label>
            <textarea
              data-testid="submit-notes"
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What you built, decisions you made, tradeoffs…"
              className="w-full bg-transparent border border-[#1A1A1A] px-3 py-2 font-mono text-sm focus:outline-none focus:border-[#FF3B30]"
            />
          </div>
          <div className="border border-[#1A1A1A] bg-[#FAFAFA] p-4 flex items-start gap-3">
            <Sparkles size={18} className="mt-0.5"/>
            <div className="text-xs font-mono">
              <span className="font-bold">Mentor Bot</span> will auto-review and verify your submission. Approved submissions add to your verified profile.
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
            <button data-testid="submit-confirm" disabled={busy} className="btn-primary">{busy ? "Submitting…" : "Submit PR →"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
