import { X, Sparkles, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export default function UpgradeModal({ open, onClose, message, feature }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-[#0A0A0A] border border-white/20">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-[#22D3EE]" />
            <div className="font-mono text-[10px] uppercase tracking-widest text-[#22D3EE]">// upgrade required</div>
          </div>
          <button
            data-testid="upgrade-modal-close"
            onClick={onClose}
            className="text-white/60 hover:text-white border border-white/15 hover:border-white/40 p-2 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-8">
          <div
            className="font-mono text-[10px] uppercase tracking-widest px-2 py-1 border border-[#FBBF24]/40 text-[#FBBF24] inline-block"
          >
            {feature || "Pro feature"}
          </div>
          <h2 className="mt-4 font-heading text-3xl font-bold tracking-tight">
            You're on the <span className="text-white/50">Free</span> plan.
          </h2>
          <p className="mt-4 font-mono text-sm text-white/70 leading-relaxed">
            {message || "The Free plan lets you ship 1 project. Upgrade to Pro to join unlimited startups, unlock the AI mentor, and get a downloadable certificate."}
          </p>

          <div className="mt-6 border border-white/10 bg-white/[0.02] p-5">
            <div className="flex items-baseline justify-between">
              <div>
                <div className="font-heading text-2xl font-bold">Pro</div>
                <div className="font-mono text-xs text-white/50">unlimited startups + AI mentor</div>
              </div>
              <div className="text-right">
                <div className="font-heading text-3xl font-bold">₹299</div>
                <div className="font-mono text-xs text-white/50">/ month</div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 font-mono text-sm text-white/60 hover:text-white border border-white/15 hover:border-white/40 px-5 py-3 transition-colors"
            >
              Maybe later
            </button>
            <Link
              to="/pricing"
              data-testid="upgrade-modal-cta"
              onClick={onClose}
              className="flex-1 inline-flex items-center justify-center gap-2 bg-[#22D3EE] text-[#0A0A0A] font-mono text-sm font-semibold px-5 py-3 hover:bg-white transition-colors"
            >
              See plans <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
