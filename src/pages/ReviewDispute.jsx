import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAccount } from "wagmi";
import {
  ArrowLeft,
  Scale,
  CheckCircle,
  XCircle,
  ExternalLink,
  ShieldAlert,
  MessageSquare,
  Coins
} from "lucide-react";
import {
  getDisputeById,
  submitHumanReview,
  truncateAddress,
  isRegisteredReviewer
} from "../firebase/db";
import WalletGate from "../components/WalletGate";

export default function ReviewDispute() {
  const { id } = useParams();
  const { address } = useAccount();

  const [dispute, setDispute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(null); // null = checking

  // Verdict form state
  const [verdict, setVerdict] = useState(null); // 'fulfilled' | 'failed'
  const [reasoning, setReasoning] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await getDisputeById(id);
        setDispute(data);

        if (
          data &&
          data.status === "claimed" &&
          data.claimedBy?.toLowerCase() === address?.toLowerCase()
        ) {
          setAuthorized(true);
        } else {
          setAuthorized(false);
        }
      } catch (e) {
        console.error("Failed to load dispute", e);
        setAuthorized(false);
      }
      setLoading(false);
    };
    load();
  }, [id, address]);

  const handleSubmit = async () => {
    if (!verdict) {
      setError("Please select a verdict.");
      return;
    }
    if (reasoning.trim().length < 50) {
      setError("Reasoning must be at least 50 characters.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const result = await submitHumanReview(id, verdict, reasoning.trim(), address);
      setDispute(result);
      setSubmitted(true);
    } catch (e) {
      setError(e.message || "Failed to submit review.");
    }
    setSubmitting(false);
  };

  // Loading
  if (loading) {
    return (
      <WalletGate>
        <div className="p-8 text-center text-[#94a3b8] font-body">
          <Scale className="h-8 w-8 text-[#4F6EF7] animate-spin mx-auto mb-3" />
          <span>Loading dispute for review...</span>
        </div>
      </WalletGate>
    );
  }

  // 403 — Not authorized
  if (!authorized || !dispute) {
    return (
      <WalletGate>
        <div className="flex flex-col items-center justify-center text-center p-8 py-24 max-w-lg mx-auto space-y-6">
          <div className="p-6 bg-[#F7476E]/10 border border-[#F7476E]/20 rounded-full">
            <ShieldAlert className="h-16 w-16 text-[#F7476E]" />
          </div>
          <h2 className="font-headline font-extrabold text-2xl text-white">
            Access Denied
          </h2>
          <p className="font-body text-sm text-[#94a3b8] leading-relaxed max-w-md">
            This dispute review is restricted to the reviewer who claimed it.
            {dispute && dispute.claimedBy && (
              <span className="block mt-1 font-mono text-xs text-[#4F6EF7]">
                Claimed by: {truncateAddress(dispute.claimedBy)}
              </span>
            )}
          </p>
          <Link
            to="/escalation-queue"
            className="inline-flex items-center gap-2 text-xs font-body font-semibold text-[#94a3b8] hover:text-white transition-colors duration-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Escalation Queue
          </Link>
        </div>
      </WalletGate>
    );
  }

  const confidenceColor = (dispute.aiJudgeConfidence ?? 0) < 70
    ? "text-[#F7476E]"
    : (dispute.aiJudgeConfidence ?? 0) < 85
      ? "text-[#F5A623]"
      : "text-[#00D48B]";

  // Success — after submission
  if (submitted) {
    return (
      <WalletGate>
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="p-6 md:p-10 max-w-4xl mx-auto space-y-8"
        >
          <div className="bg-white/[0.04] border border-white/[0.07] rounded-[14px] p-10 text-center space-y-6">
            <div className="mx-auto w-fit p-4 bg-[#00D48B]/10 border border-[#00D48B]/20 rounded-full">
              <CheckCircle className="h-12 w-12 text-[#00D48B]" />
            </div>

            <div className="space-y-2">
              <h2 className="font-headline font-extrabold text-xl text-white">
                Review Submitted Successfully
              </h2>
              <p className="font-body text-sm text-[#94a3b8]">
                Your expert verdict has been recorded on the Verdict protocol.
              </p>
            </div>

            <div className="bg-white/[0.02] border border-white/[0.07] rounded-lg p-5 max-w-md mx-auto space-y-3">
              <div className="flex items-center justify-between text-xs font-body">
                <span className="text-[#94a3b8]">Verdict</span>
                <span className={`font-headline font-bold uppercase ${
                  verdict === "fulfilled" ? "text-[#00D48B]" : "text-[#F7476E]"
                }`}>
                  {verdict === "fulfilled" ? "Agent Fulfilled" : "Agent Failed"}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs font-body">
                <span className="text-[#94a3b8]">Dispute</span>
                <span className="text-white font-mono">{dispute.title?.slice(0, 40)}...</span>
              </div>
              <div className="flex items-center justify-between text-xs font-body border-t border-white/[0.07] pt-3">
                <span className="text-[#94a3b8] flex items-center gap-1">
                  <Coins className="h-3.5 w-3.5 text-[#00D48B]" />
                  Reward Earned
                </span>
                <span className="text-[#00D48B] font-mono font-bold">+2.00 USDC</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-4 pt-2">
              <Link
                to="/escalation-queue"
                className="inline-flex items-center gap-2 bg-[#4F6EF7] hover:bg-[#4F6EF7]/80 text-white px-5 py-2.5 rounded-lg text-xs font-headline font-bold uppercase tracking-wider transition-colors duration-200"
              >
                Back to Queue
              </Link>
              <Link
                to={`/disputes/${id}`}
                className="inline-flex items-center gap-2 bg-white/[0.04] border border-white/[0.07] hover:border-white/[0.15] text-white px-5 py-2.5 rounded-lg text-xs font-headline font-bold uppercase tracking-wider transition-colors duration-200"
              >
                View Dispute
              </Link>
            </div>
          </div>
        </motion.div>
      </WalletGate>
    );
  }

  return (
    <WalletGate>
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="p-6 md:p-10 max-w-4xl mx-auto space-y-8"
      >
        {/* Back Link */}
        <Link
          to="/escalation-queue"
          className="flex items-center space-x-2 text-xs font-body font-semibold text-[#94a3b8] hover:text-white transition-colors duration-200"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Escalation Queue</span>
        </Link>

        {/* Case Overview */}
        <section className="bg-white/[0.04] backdrop-blur-md border border-white/[0.07] rounded-[14px] p-6 space-y-4">
          <div className="flex justify-between items-start gap-4">
            <div className="space-y-1">
              <span className="font-mono text-[9px] text-[#4F6EF7] uppercase tracking-wider bg-[#4F6EF7]/10 px-2 py-0.5 rounded font-semibold">
                {dispute.violationType}
              </span>
              <h1 className="font-headline font-extrabold text-xl text-white tracking-tight leading-snug mt-2">
                {dispute.title}
              </h1>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase flex items-center gap-1 bg-[#4F6EF7]/10 border-[#4F6EF7]/20 text-[#4F6EF7]">
              <Scale className="h-3 w-3" />
              Under Review
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-white/[0.07] pt-4 text-xs font-body">
            <div>
              <span className="text-[#94a3b8] block uppercase text-[10px] font-semibold">Staked Escrow</span>
              <span className="text-white font-mono font-bold text-sm mt-0.5 block">
                {(dispute.stakeAmount ?? 0).toFixed(2)} USDC
              </span>
            </div>
            <div>
              <span className="text-[#94a3b8] block uppercase text-[10px] font-semibold">Creator</span>
              <span className="text-white font-mono font-bold text-sm mt-0.5 block">
                {truncateAddress(dispute.creatorAddress)}
              </span>
            </div>
            <div>
              <span className="text-[#94a3b8] block uppercase text-[10px] font-semibold">Submitted</span>
              <span className="text-white font-mono font-bold text-sm mt-0.5 block">
                {new Date(dispute.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div>
              <span className="text-[#94a3b8] block uppercase text-[10px] font-semibold">Case ID</span>
              <span className="text-white font-mono font-bold text-sm mt-0.5 block truncate">
                {dispute.id}
              </span>
            </div>
          </div>
        </section>

        {/* AI Judge Analysis */}
        <section className="bg-white/[0.04] backdrop-blur-md border border-white/[0.07] rounded-[14px] p-6 space-y-4">
          <h3 className="font-headline font-bold text-xs text-white uppercase tracking-wider border-b border-white/[0.07] pb-2 flex items-center gap-2">
            <Scale className="h-4 w-4 text-[#4F6EF7]" />
            AI Judge Analysis
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white/[0.02] border border-white/[0.07] rounded-lg p-4 space-y-2">
              <span className="text-[10px] text-[#94a3b8] uppercase font-semibold block">AI Verdict</span>
              <span className={`font-headline font-bold text-sm uppercase ${
                dispute.aiJudgeVerdict === "fulfilled" || dispute.aiJudgeVerdict === "approve"
                  ? "text-[#00D48B]"
                  : "text-[#F7476E]"
              }`}>
                {dispute.aiJudgeVerdict || "—"}
              </span>
            </div>
            <div className="bg-white/[0.02] border border-white/[0.07] rounded-lg p-4 space-y-2">
              <span className="text-[10px] text-[#94a3b8] uppercase font-semibold block">Confidence Score</span>
              <span className={`font-mono font-bold text-sm ${confidenceColor}`}>
                {dispute.aiJudgeConfidence ?? "—"}%
              </span>
            </div>
          </div>

          {dispute.aiJudgeReasoning && (
            <div className="bg-white/[0.02] border border-white/[0.07] rounded-lg p-4">
              <span className="text-[10px] text-[#94a3b8] uppercase font-semibold block mb-2">Reasoning</span>
              <p className="font-body text-xs text-[#94a3b8] leading-relaxed whitespace-pre-wrap">
                {dispute.aiJudgeReasoning}
              </p>
            </div>
          )}
        </section>

        {/* Full Evidence */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Agent Prompt Input */}
          <div className="bg-white/[0.04] backdrop-blur-md border border-white/[0.07] rounded-[14px] p-6 space-y-4">
            <h3 className="font-headline font-bold text-xs text-white uppercase tracking-wider border-b border-white/[0.07] pb-2">
              Agent Prompt Input
            </h3>
            <div className="bg-white/[0.02] border border-white/[0.07] rounded-lg p-4 font-mono text-xs text-[#94a3b8] whitespace-pre-wrap max-h-42 overflow-y-auto">
              {dispute.prompt}
            </div>
          </div>

          {/* Generated Agent Output */}
          <div className="bg-white/[0.04] backdrop-blur-md border border-white/[0.07] rounded-[14px] p-6 space-y-4">
            <h3 className="font-headline font-bold text-xs text-white uppercase tracking-wider border-b border-white/[0.07] pb-2">
              Generated Agent Output
            </h3>
            <pre className="bg-white/[0.02] border border-white/[0.07] rounded-lg p-4 font-mono text-xs text-red-400 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-42">
              <code>{dispute.agentOutput}</code>
            </pre>
          </div>

          {/* Evidence */}
          {dispute.evidence && (
            <div className="lg:col-span-2 bg-white/[0.04] backdrop-blur-md border border-white/[0.07] rounded-[14px] p-6 space-y-4">
              <h3 className="font-headline font-bold text-xs text-white uppercase tracking-wider border-b border-white/[0.07] pb-2 flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-[#4F6EF7]" />
                Evidence of Interaction
              </h3>

              {dispute.evidence.startsWith("data:image/") ? (
                <div className="space-y-3">
                  <span className="text-xs text-[#94a3b8] font-body block">
                    The dispute creator uploaded the following screenshot as verified proof:
                  </span>
                  <div className="border border-white/[0.07] rounded-lg p-3 bg-black/30 flex justify-center overflow-hidden">
                    <img
                      src={dispute.evidence}
                      alt="Verified Dispute Evidence"
                      className="rounded max-h-[500px] object-contain w-auto hover:scale-[1.02] transition-transform duration-300"
                    />
                  </div>
                </div>
              ) : (
                <div className="bg-white/[0.02] border border-white/[0.07] rounded-lg p-5 flex items-center justify-between gap-4 font-body">
                  <div className="space-y-1">
                    <span className="text-xs text-[#94a3b8] block">
                      The dispute creator provided a shared interaction link as proof:
                    </span>
                    <a
                      href={dispute.evidence}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-mono text-[#4F6EF7] hover:underline break-all block"
                    >
                      {dispute.evidence}
                    </a>
                  </div>
                  <a
                    href={dispute.evidence}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 bg-[#4F6EF7]/20 hover:bg-[#4F6EF7]/30 border border-[#4F6EF7] text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors duration-200"
                  >
                    <span>View Evidence</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Verdict Form */}
        <section className="bg-white/[0.04] backdrop-blur-md border border-white/[0.07] rounded-[14px] p-6 space-y-6">
          <h3 className="font-headline font-bold text-xs text-white uppercase tracking-wider border-b border-white/[0.07] pb-2 flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-[#4F6EF7]" />
            Submit Your Verdict
          </h3>

          {/* Verdict Selection */}
          <div className="space-y-2">
            <span className="block text-xs font-bold text-[#94a3b8] uppercase tracking-wider">
              Expert Verdict
            </span>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setVerdict("fulfilled")}
                className={`py-3 px-4 border rounded-lg flex items-center justify-center gap-2 font-headline text-xs font-semibold uppercase tracking-wider transition-colors duration-200 cursor-pointer ${
                  verdict === "fulfilled"
                    ? "bg-[#00D48B]/10 border-[#00D48B] text-[#00D48B]"
                    : "bg-white/[0.02] border-white/[0.07] text-[#94a3b8] hover:text-white"
                }`}
              >
                <CheckCircle className="h-4 w-4" />
                Agent Fulfilled
              </button>
              <button
                onClick={() => setVerdict("failed")}
                className={`py-3 px-4 border rounded-lg flex items-center justify-center gap-2 font-headline text-xs font-semibold uppercase tracking-wider transition-colors duration-200 cursor-pointer ${
                  verdict === "failed"
                    ? "bg-[#F7476E]/10 border-[#F7476E] text-[#F7476E]"
                    : "bg-white/[0.02] border-white/[0.07] text-[#94a3b8] hover:text-white"
                }`}
              >
                <XCircle className="h-4 w-4" />
                Agent Failed
              </button>
            </div>
          </div>

          {/* Reasoning */}
          <div>
            <label
              htmlFor="review-reasoning-textarea"
              className="block text-xs font-bold text-[#94a3b8] uppercase tracking-wider mb-2"
            >
              Review Reasoning
              <span className="text-[9px] font-normal ml-2 text-[#94a3b8]/60">
                (min 50 characters)
              </span>
            </label>
            <textarea
              id="review-reasoning-textarea"
              rows="5"
              value={reasoning}
              onChange={(e) => setReasoning(e.target.value)}
              placeholder="Provide detailed professional reasoning for your verdict. Explain what the AI agent did correctly or incorrectly, referencing the evidence and prompt instructions..."
              className="w-full bg-white/[0.02] border border-white/[0.07] rounded-lg px-4 py-3 text-xs text-white placeholder-gray-600 focus:border-[#4F6EF7] font-body leading-relaxed"
            />
            <div className="flex justify-end mt-1">
              <span className={`text-[9px] font-mono ${
                reasoning.trim().length >= 50 ? "text-[#00D48B]" : "text-[#94a3b8]/50"
              }`}>
                {reasoning.trim().length}/50 min
              </span>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="text-[#F7476E] text-[11px] font-semibold bg-[#F7476E]/10 border border-[#F7476E]/20 p-2.5 rounded-lg">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!verdict || reasoning.trim().length < 50 || submitting}
            className={`w-full py-3 rounded-lg font-headline font-bold text-sm uppercase tracking-wider transition-colors duration-200 flex items-center justify-center gap-2 cursor-pointer ${
              !verdict || reasoning.trim().length < 50 || submitting
                ? "bg-white/[0.04] border border-white/[0.07] text-[#94a3b8]/50 cursor-not-allowed"
                : verdict === "fulfilled"
                  ? "bg-[#00D48B] hover:bg-[#00D48B]/80 text-white"
                  : "bg-[#F7476E] hover:bg-[#F7476E]/80 text-white"
            }`}
          >
            {submitting ? (
              <>
                <Scale className="h-4 w-4 animate-spin" />
                Submitting Review...
              </>
            ) : (
              <>
                <Scale className="h-4 w-4" />
                Submit Expert Verdict
              </>
            )}
          </button>

          {/* Reward Info */}
          <div className="bg-white/[0.02] border border-white/[0.07] rounded-lg p-3 flex items-center gap-3">
            <Coins className="h-4 w-4 text-[#00D48B] shrink-0" />
            <p className="text-[10px] text-[#94a3b8] font-body leading-relaxed">
              Upon submission, you will earn <strong className="text-[#00D48B] font-mono">2.00 USDC</strong> as
              a reviewer reward for your expert analysis.
            </p>
          </div>
        </section>
      </motion.div>
    </WalletGate>
  );
}
