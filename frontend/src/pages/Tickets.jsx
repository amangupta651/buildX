import { useState } from "react";
import Navbar from "@/components/Navbar";
import MyTickets from "@/components/MyTickets";
import AvailableTickets from "@/components/AvailableTickets";

export default function Tickets() {
  const [tab, setTab] = useState("available");

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <Navbar />
      <div className="max-w-[1400px] mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <div className="font-mono text-sm text-[#22D3EE]">// ticket board</div>
          <h1 className="font-heading text-4xl sm:text-5xl font-bold tracking-tight mt-3">Tasks & Tickets</h1>
          <p className="mt-4 max-w-2xl font-mono text-sm text-white/60">
            Claim open tasks, track your progress, and ship verified work.
          </p>
        </div>

        {/* Tabs */}
        <div className="border border-white/10 bg-white/[0.02] p-1 inline-flex gap-1 mb-8">
          <button
            onClick={() => setTab("available")}
            className={`font-mono text-sm px-5 py-2.5 transition-colors ${
              tab === "available"
                ? "bg-white text-[#0A0A0A]"
                : "text-white/70 hover:text-white"
            }`}
          >
            Available Tickets
          </button>
          <button
            onClick={() => setTab("my")}
            className={`font-mono text-sm px-5 py-2.5 transition-colors ${
              tab === "my"
                ? "bg-white text-[#0A0A0A]"
                : "text-white/70 hover:text-white"
            }`}
          >
            My Tickets
          </button>
        </div>

        {/* Content */}
        {tab === "available" ? <AvailableTickets /> : <MyTickets />}
      </div>
    </div>
  );
}
