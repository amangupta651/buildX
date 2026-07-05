import { useState } from "react";
import { X, GitPullRequest, Sparkles, CheckCircle2, XCircle, ArrowRight } from "lucide-react";
import { api, formatApiErrorDetail } from "@/lib/api";
import { toast } from "sonner";

// Stages: "pr" → "interview" → "grading" → "result"
export default function SubmitAndInterviewModal({ task, onClose, onDone, onUpgradeNeeded }) {
  const [stage, setStage] = useState("pr");
  const [submissionId, setSubmissionId] = useState(null);
  const [githubUrl, setGithubUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState(["", "", ""]);
  const [result, setResult] = useState(null);

  const submitPr = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post(`/tasks/${task.id}/submit`, { github_url: githubUrl, notes });
      setSubmissionId(data.id);
      toast.success("PR received. Now the follow-up interview…");
      setStage("interview-loading");
      const iv = await api.post(`/submissions/${data.id}/interview/start`);
      setQuestions(iv.data.questions);
      setAnswers(new Array(iv.data.questions.length).fill(""));
      setStage("interview");
    } catch (e2) {
      toast.error(formatApiErrorDetail(e2.response?.data?.detail));
    } finally {
      setBusy(false);
    }
  };

  const submitAnswers = async () => {
    if (answers.some((a) => a.trim().length < 5)) {
      toast.error("Please answer every question (at least a sentence each).");
      return;
    }
    setBusy(true);
    setStage("grading");
    try {
      const { data } = await api.post(`/submissions/${submissionId}/interview/answer`, { answers });
      setResult(data.interview);
      setStage("result");
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail));
      setStage("interview");
    } finally {
      setBusy(false);
    }
  };

  const finalize = () => {
    onDone?.();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-[#0A0A0A] border border-white/15 max-h-[92vh] overflow-y-auto">
        {/* Header with stepper */}
        <div className="sticky top-0 bg-[#0A0A0A] border-b border-white/10 px-6 py-4 flex items-center justify-between">
          <div className="flex-1">
            <div className="font-mono text-[10px] uppercase tracking-widest text-[#22D3EE]">
              Ticket {task.ticket_no || `#${task.id.slice(-4).toUpperCase()}`}
            </div>
            <div className="font-heading text-lg font-bold text-white mt-0.5">{task.title}</div>
          </div>
          <Stepper stage={stage} />
          <button
            data-testid="interview-close"
            onClick={onClose}
            className="ml-4 text-white/60 hover:text-white border border-white/15 hover:border-white/40 p-2 transition-colors"
          >
            <X size={16}/>
          </button>
        </div>

        <div className="p-6">
          {stage === "pr" && (
            <form onSubmit={submitPr} className="space-y-5">
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
                <label className="font-mono text-[10px] uppercase tracking-widest text-white/50">PR notes</label>
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
                <Sparkles size={16} className="text-[#22D3EE] mt-0.5 shrink-0"/>
                <div className="text-xs font-mono text-white/70 leading-relaxed">
                  <span className="text-white font-bold">Next: a 3-question follow-up interview.</span> Your PR alone doesn&apos;t merge — you&apos;ll be asked to explain your design choices, operational risks, and edge cases. A senior engineer AI grades your answers on <span className="text-[#22D3EE]">understanding, architecture, communication, delivery</span>.
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={onClose} className="font-mono text-sm text-white/60 hover:text-white border border-white/15 hover:border-white/40 px-5 py-2.5 transition-colors">Cancel</button>
                <button
                  data-testid="submit-confirm"
                  disabled={busy}
                  className="font-mono text-sm font-semibold bg-[#22D3EE] text-[#0A0A0A] hover:bg-white disabled:opacity-50 px-5 py-2.5 transition-colors inline-flex items-center gap-2"
                >
                  <GitPullRequest size={14}/> {busy ? "Submitting…" : "Submit & start interview →"}
                </button>
              </div>
            </form>
          )}

          {stage === "interview-loading" && (
            <div className="py-12 text-center">
              <div className="inline-flex items-center gap-2 font-mono text-sm text-white/70">
                <Sparkles size={14} className="text-[#22D3EE] animate-pulse"/> Generating your interview questions…
              </div>
            </div>
          )}

          {stage === "interview" && (
            <div className="space-y-6">
              <div className="border border-white/10 bg-white/[0.02] p-4 flex items-start gap-3">
                <Sparkles size={16} className="text-[#22D3EE] mt-0.5 shrink-0"/>
                <div className="text-xs font-mono text-white/70 leading-relaxed">
                  Answer honestly. Vague answers → low understanding scores. Reference specific code, tradeoffs, and edge cases.
                </div>
              </div>
              {questions.map((q, i) => (
                <div key={i}>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-[#22D3EE]">Question {i + 1} of {questions.length}</div>
                  <div className="font-heading text-lg font-bold text-white mt-1 mb-3 leading-snug">{q}</div>
                  <textarea
                    data-testid={`interview-answer-${i}`}
                    rows={4}
                    value={answers[i]}
                    onChange={(e) => {
                      const a = [...answers]; a[i] = e.target.value; setAnswers(a);
                    }}
                    placeholder="Your answer…"
                    className="w-full bg-transparent border border-white/15 focus:border-[#22D3EE] px-3 py-2 font-mono text-sm text-white placeholder:text-white/30 focus:outline-none"
                  />
                  <div className="font-mono text-[10px] text-white/40 mt-1 text-right">{answers[i].length} chars</div>
                </div>
              ))}
              <div className="flex justify-end gap-3">
                <button
                  data-testid="interview-submit"
                  onClick={submitAnswers}
                  disabled={busy}
                  className="font-mono text-sm font-semibold bg-[#22D3EE] text-[#0A0A0A] hover:bg-white disabled:opacity-50 px-6 py-3 transition-colors inline-flex items-center gap-2"
                >
                  Submit for grading <ArrowRight size={14}/>
                </button>
              </div>
            </div>
          )}

          {stage === "grading" && (
            <div className="py-16 text-center">
              <div className="inline-flex items-center gap-2 font-mono text-sm text-white/70">
                <Sparkles size={14} className="text-[#22D3EE] animate-pulse"/> AI mentor is reviewing your answers…
              </div>
              <div className="mt-4 font-mono text-[10px] text-white/40">Grading on understanding · architecture · communication · delivery</div>
            </div>
          )}

          {stage === "result" && result && (
            <Result result={result} onDone={finalize} />
          )}
        </div>
      </div>
    </div>
  );
}

function Stepper({ stage }) {
  const steps = ["pr", "interview", "result"];
  const idx = stage === "pr" ? 0 : stage === "result" ? 2 : 1;
  return (
    <div className="hidden md:flex items-center gap-2">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-2">
          <div className={`w-6 h-6 flex items-center justify-center font-mono text-[10px] ${i <= idx ? "bg-[#22D3EE] text-[#0A0A0A]" : "border border-white/20 text-white/40"}`}>
            {i + 1}
          </div>
          {i < steps.length - 1 && <div className={`w-6 h-px ${i < idx ? "bg-[#22D3EE]" : "bg-white/20"}`} />}
        </div>
      ))}
    </div>
  );
}

function Result({ result, onDone }) {
  const { scores, overall, feedback, strengths = [], improvements = [] } = result;
  const passed = (overall ?? 0) >= 60;
  const dims = [
    { k: "understanding", label: "Understanding", color: "#22D3EE" },
    { k: "architecture", label: "Architecture", color: "#A3E635" },
    { k: "communication", label: "Communication", color: "#F472B6" },
    { k: "delivery", label: "Delivery", color: "#FBBF24" },
  ];
  return (
    <div className="space-y-6">
      <div className="text-center">
        {passed ? (
          <CheckCircle2 size={48} className="mx-auto text-[#A3E635]" strokeWidth={1.4} />
        ) : (
          <XCircle size={48} className="mx-auto text-[#F472B6]" strokeWidth={1.4} />
        )}
        <div className="mt-4 font-mono text-[10px] uppercase tracking-widest text-white/40">
          {passed ? "ticket merged · verified" : "revisions requested"}
        </div>
        <div className="mt-2 font-heading text-5xl font-bold" style={{ color: passed ? "#A3E635" : "#F472B6" }}>
          {overall}<span className="text-white/40 text-3xl">/100</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {dims.map((d) => {
          const v = scores?.[d.k] ?? 0;
          return (
            <div key={d.k} className="border border-white/10 bg-white/[0.02] p-4">
              <div className="font-mono text-[10px] uppercase tracking-widest text-white/40">{d.label}</div>
              <div className="mt-1 font-heading text-2xl font-bold" style={{ color: d.color }}>{v}</div>
              <div className="mt-2 h-1 bg-white/10 relative">
                <div className="absolute inset-y-0 left-0" style={{ width: `${v}%`, background: d.color }} />
              </div>
            </div>
          );
        })}
      </div>

      {feedback && (
        <div className="border border-white/10 bg-white/[0.02] p-4">
          <div className="font-mono text-[10px] uppercase tracking-widest text-white/40">Mentor feedback</div>
          <p className="mt-2 font-mono text-sm text-white/80 leading-relaxed">{feedback}</p>
        </div>
      )}

      {strengths.length > 0 && (
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-[#A3E635] mb-2">Strengths</div>
          <ul className="space-y-1.5">
            {strengths.map((s, i) => (
              <li key={i} className="flex items-start gap-2 font-mono text-sm text-white/80">
                <span className="text-[#A3E635] mt-0.5">+</span>{s}
              </li>
            ))}
          </ul>
        </div>
      )}
      {improvements.length > 0 && (
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-[#FBBF24] mb-2">Improvements</div>
          <ul className="space-y-1.5">
            {improvements.map((s, i) => (
              <li key={i} className="flex items-start gap-2 font-mono text-sm text-white/80">
                <span className="text-[#FBBF24] mt-0.5">→</span>{s}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex justify-end">
        <button
          data-testid="interview-done"
          onClick={onDone}
          className="font-mono text-sm font-semibold bg-white text-[#0A0A0A] hover:bg-[#22D3EE] px-6 py-3 transition-colors"
        >
          {passed ? "Add to my profile →" : "Back to board →"}
        </button>
      </div>
    </div>
  );
}
