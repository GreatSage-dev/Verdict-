import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAccount } from "wagmi";
import { Scale, Clock, Shield, ArrowRight, AlertTriangle, User } from "lucide-react";
import {
  getEscalatedDisputes,
  isRegisteredReviewer,
  claimDispute,
  truncateAddress
} from "../firebase/db";
import WalletGate from "../components/WalletGate";

function timeSince(dateStr) {
  if (!dateStr) return "—";
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function EscalationQueue() {
  const { address } = useAccount();
  const navigate = useNavigate();

  const [disputes, setDisputes] = useState([]);
  const [isReviewer, setIsReviewer] = useState(null); // null = loading
  const [claimingId, setClaimingId] = useState(null);
  const [error, setError] = useState("");

  const loadData = async () => {
    if (!address) return;
    const [registered, escalated] = await Promise.all([
      isRegisteredReviewer(address),
      getEscalatedDisputes()
    ]);
    setIsReviewer(registered);
    setDisputes(escalated || []);
  };

  useEffect(() => {
    loadData();
    window.addEventListener("verdictDbUpdated", loadData);
    return () => window.removeEventListener("verdictDbUpdated", loadData);
  }, [address]);

  const handleClaim = async (disputeId) => {
    setClaimingId(disputeId);
    setError("");
    try {
      await claimDispute(disputeId, address);
      navigate(`/review/${disputeId}`);
    } catch (e) {
      setError(e.message || "Failed to claim dispute.");
      setClaimingId(null);
    }
  };

  // Loading state
  if (isReviewer === null) {
    return (
      <WalletGate>
        <div className="p-8 text-center text-[#94a3b8] font-body">
          <Scale className="h-8 w-8 text-[#4F6EF7] animate-spin mx-auto mb-3" />
          <span>Verifying reviewer credentials...</span>
        </div>
      </WalletGate>
    );
  }

  // Not a registered reviewer
  if (!isReviewer) {
    return (
      <WalletGate>
        <div className="flex flex-col items-center justify-center text-center p-8 py-24 max-w-lg mx-auto space-y-6">
          <div className="p-6 bg-white/[0.04] backdrop-blur-md border border-white/[0.07] rounded-full">
            <Shield className="h-16 w-16 text-[#F5A623]" />
          </div>
          <h2 className="font-headline font-extrabold text-2xl text-white">
            Reviewer Access Required
          </h2>
          <p className="font-body text-sm text-[#94a3b8] leading-relaxed max-w-md">
            The Escalation Queue is restricted to registered expert reviewers. 
            Complete the reviewer onboarding process to access dispute escalations.
          </p>
          <Link
            to="/become-reviewer"
            className="inline-flex items-center gap-2 bg-[#4F6EF7] hover:bg-[#4F6EF7]/80 text-white px-6 py-3 rounded-lg text-sm font-headline font-bold uppercase tracking-wider transition-colors duration-200"
          >
            <Shield className="h-4 w-4" />
            Become a Reviewer
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </WalletGate>
    );
  }

  const getConfidenceColor = (score) => {
    if (score < 70) return { bar: "bg-[#F7476E]", text: "text-[#F7476E]" };
    if (score < 85) return { bar: "bg-[#F5A623]", text: "text-[#F5A623]" };
    return { bar: "bg-[#00D48B]", text: "text-[#00D48B]" };
  };

  return (
    <WalletGate>
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="p-6 md:p-10 max-w-4xl mx-auto space-y-8"
      >
        {/* Page Header */}
        <div>
          <h1 className="font-headline font-extrabold text-2xl md:text-3xl text-white tracking-tight flex items-center gap-3">
            <AlertTriangle className="h-7 w-7 text-[#F5A623]" />
            Escalation Queue
          </h1>
          <p className="font-body text-sm text-[#94a3b8] mt-2">
            Disputes escalated for human review due to low AI confidence. Claim a case to begin your expert analysis.
          </p>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="text-[#F7476E] text-[11px] font-semibold bg-[#F7476E]/10 border border-[#F7476E]/20 p-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Empty State */}
        {disputes.length === 0 ? (
          <div className="bg-white/[0.04] border border-white/[0.07] rounded-[14px] p-12 text-center">
            <Scale className="h-10 w-10 text-gray-400 mx-auto mb-3" />
            <p className="font-headline font-semibold text-sm text-[#94a3b8]">No escalated disputes</p>
            <p className="font-body text-xs text-[#94a3b8] mt-1">
              All disputes are currently handled by the AI Judge. Check back later.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {disputes.map((dispute) => {
              const isClaimed = !!dispute.claimedBy;
              const confidence = dispute.aiJudgeConfidence ?? 0;
              const colors = getConfidenceColor(confidence);

              return (
                <motion.div
                  key={dispute.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="bg-white/[0.04] border border-white/[0.07] rounded-[14px] p-5 space-y-4"
                >
                  {/* Card Header */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[9px] text-[#4F6EF7] bg-[#4F6EF7]/10 px-2 py-0.5 rounded uppercase font-semibold">
                          {dispute.violationType}
                        </span>
                        <span className="text-[9px] font-mono text-[#94a3b8] flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {timeSince(dispute.escalatedAt || dispute.createdAt)}
                        </span>
                      </div>
                      <h3 className="font-headline font-bold text-sm text-white leading-snug">
                        {dispute.title}
                      </h3>
                    </div>

                    {/* Claim Status */}
                    {isClaimed ? (
                      <span className="shrink-0 text-[9px] font-mono font-bold px-2.5 py-1 rounded border bg-[#4F6EF7]/10 border-[#4F6EF7]/20 text-[#4F6EF7] flex items-center gap-1.5 uppercase">
                        <User className="h-3 w-3" />
                        Under Review by {truncateAddress(dispute.claimedBy)}
                      </span>
                    ) : (
                      <span className="shrink-0 text-[9px] font-mono font-bold px-2.5 py-1 rounded border bg-[#F5A623]/10 border-[#F5A623]/20 text-[#F5A623] uppercase animate-pulse-pending">
                        Awaiting Reviewer
                      </span>
                    )}
                  </div>

                  {/* Metadata Row */}
                  <div className="flex items-center gap-4 text-[10px] text-[#94a3b8] font-mono">
                    <span>Creator: {truncateAddress(dispute.creatorAddress)}</span>
                    <span>•</span>
                    <span className="text-white font-semibold">{(dispute.stakeAmount ?? 0).toFixed(2)} USDC</span>
                  </div>

                  {/* AI Judge Reasoning */}
                  {dispute.aiJudgeReasoning && (
                    <div className="bg-white/[0.02] border border-white/[0.07] rounded-lg p-4 space-y-3">
                      <h4 className="font-headline font-bold text-[10px] text-white uppercase tracking-wider flex items-center gap-1.5">
                        <Scale className="h-3.5 w-3.5 text-[#4F6EF7]" />
                        AI Judge Reasoning
                      </h4>
                      <p className="font-body text-xs text-[#94a3b8] leading-relaxed">
                        "{dispute.aiJudgeReasoning}"
                      </p>
                    </div>
                  )}

                  {/* Confidence Bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-headline font-bold text-[#94a3b8] uppercase tracking-wider">
                        AI Confidence
                      </span>
                      <span className={`font-mono font-bold ${colors.text}`}>
                        {confidence}%
                      </span>
                    </div>
                    <div className="w-full bg-white/[0.07] rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${colors.bar}`}
                        style={{ width: `${Math.min(confidence, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Action */}
                  <div className="flex justify-end pt-1">
                    <button
                      onClick={() => handleClaim(dispute.id)}
                      disabled={isClaimed || claimingId === dispute.id}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-headline font-bold uppercase tracking-wider transition-colors duration-200 cursor-pointer ${
                        isClaimed
                          ? "bg-white/[0.04] border border-white/[0.07] text-[#94a3b8]/50 cursor-not-allowed"
                          : claimingId === dispute.id
                            ? "bg-[#4F6EF7]/20 border border-[#4F6EF7]/40 text-[#4F6EF7] cursor-wait"
                            : "bg-[#4F6EF7] hover:bg-[#4F6EF7]/80 text-white"
                      }`}
                    >
                      {claimingId === dispute.id ? (
                        <>
                          <Scale className="h-4 w-4 animate-spin" />
                          Claiming...
                        </>
                      ) : isClaimed ? (
                        <>
                          <Shield className="h-4 w-4" />
                          Already Claimed
                        </>
                      ) : (
                        <>
                          <Shield className="h-4 w-4" />
                          Claim for Review
                          <ArrowRight className="h-3.5 w-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </WalletGate>
  );
}
