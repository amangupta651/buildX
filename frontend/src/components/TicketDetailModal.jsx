import { X, Zap, ExternalLink, GitPullRequest, Sparkles } from "lucide-react";

const DIFF_META = {
  easy: { color: "#A3E635", label: "easy" },
  medium: { color: "#22D3EE", label: "medium" },
  hard: { color: "#F472B6", label: "hard" },
};

export default function TicketDetailModal({ ticket, joined, isAssignee, onClose, onClaim, onSubmit, onAskAI }) {
  if (!ticket) return null;
  const diff = DIFF_META[ticket.difficulty] || DIFF_META.medium;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-[#0A0A0A] border border-white/15 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-[#0A0A0A] px-6 py-4 border-b border-white/10 flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-mono text-xs text-[#22D3EE]">Ticket {ticket.ticket_no || `#${ticket.id.slice(-4).toUpperCase()}`}</span>
              <span
                className="font-mono text-[10px] uppercase tracking-widest px-2 py-0.5 border"
                style={{ color: diff.color, borderColor: `${diff.color}55` }}
              >
                {diff.label}
              </span>
              <span className="font-mono text-[10px] text-white/50 flex items-center gap-1">
                <Zap size={10} className="text-[#FBBF24]"/> +{ticket.points} XP
              </span>
            </div>
            <h2 className="font-heading text-2xl md:text-3xl font-bold mt-2 text-white leading-tight">{ticket.title}</h2>
          </div>
          <button
            data-testid="ticket-modal-close"
            onClick={onClose}
            className="text-white/60 hover:text-white border border-white/15 hover:border-white/40 p-2 transition-colors shrink-0"
          >
            <X size={16}/>
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* Customer problem */}
          {ticket.customer_problem && (
            <Section label="Customer problem">
              <p className="font-mono text-sm text-white/80 leading-relaxed">{ticket.customer_problem}</p>
            </Section>
          )}

          {/* Acceptance criteria */}
          {ticket.acceptance_criteria?.length > 0 && (
            <Section label="Acceptance criteria">
              <ul className="space-y-2">
                {ticket.acceptance_criteria.map((c, i) => (
                  <li key={i} className="flex items-start gap-3 font-mono text-sm text-white/80">
                    <span className="mt-0.5 w-4 h-4 border border-white/25 flex items-center justify-center text-[10px] text-white/40 shrink-0">✓</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* Business context */}
          {ticket.business_context && (
            <Section label="Why this matters">
              <div className="border-l-2 border-[#22D3EE] pl-4 py-1">
                <p className="font-mono text-sm text-white/70 leading-relaxed italic">{ticket.business_context}</p>
              </div>
            </Section>
          )}

          {/* Attachments */}
          {ticket.attachments?.length > 0 && (
            <Section label="Attachments">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ticket.attachments.map((a, i) => (
                  <a
                    key={i}
                    href={a.url || "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/25 p-3 flex items-center justify-between transition-colors"
                  >
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-widest text-white/40">{a.type || "asset"}</div>
                      <div className="font-mono text-sm text-white/90 mt-1">{a.label}</div>
                    </div>
                    <ExternalLink size={14} className="text-white/40" />
                  </a>
                ))}
              </div>
            </Section>
          )}

          {/* Skills */}
          {ticket.skills?.length > 0 && (
            <Section label="Tech stack">
              <div className="flex flex-wrap gap-1.5">
                {ticket.skills.map((s) => (
                  <span key={s} className="font-mono text-[11px] text-white/70 bg-white/5 border border-white/10 px-2 py-0.5">{s}</span>
                ))}
              </div>
            </Section>
          )}

          {ticket.assignee_name && (
            <div className="font-mono text-xs text-white/50">
              Assigned to <span className="text-white/90">{ticket.assignee_name}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="sticky bottom-0 bg-[#0A0A0A] border-t border-white/10 px-6 py-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="font-mono text-sm text-white/60 hover:text-white border border-white/15 hover:border-white/40 px-5 py-2.5 transition-colors"
          >
            Close
          </button>
          {ticket.status === "open" && joined && (
            <button
              data-testid="ticket-modal-claim"
              onClick={onClaim}
              className="font-mono text-sm font-semibold bg-white text-[#0A0A0A] hover:bg-[#22D3EE] px-5 py-2.5 transition-colors"
            >
              Claim ticket →
            </button>
          )}
          {ticket.status === "in_progress" && isAssignee && (
            <>
              <button
                data-testid="ticket-modal-ai"
                onClick={onAskAI}
                className="font-mono text-sm text-white/80 hover:text-[#F472B6] border border-white/15 hover:border-[#F472B6]/60 px-5 py-2.5 transition-colors inline-flex items-center justify-center gap-2"
              >
                <Sparkles size={14}/> Ask AI Mentor
              </button>
              <button
                data-testid="ticket-modal-submit"
                onClick={onSubmit}
                className="font-mono text-sm font-semibold bg-[#22D3EE] text-[#0A0A0A] hover:bg-white px-5 py-2.5 transition-colors inline-flex items-center justify-center gap-2"
              >
                <GitPullRequest size={14}/> Submit PR
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ label, children }) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-widest text-white/40 mb-3">{label}</div>
      {children}
    </div>
  );
}
