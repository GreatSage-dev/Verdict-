import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAccount } from "wagmi";
import { History, Scale, Clock, CheckCircle, ExternalLink, ShieldAlert } from "lucide-react";
import { getDisputes, getPersonaDetails, truncateAddress, getArcExplorerUrl } from "../firebase/db";
import WalletGate from "../components/WalletGate";

export default function MyDisputes() {
  const { address } = useAccount();
  const [persona, setPersona] = useState(() => getPersonaDetails(address));
  const [disputes, setDisputes] = useState([]);
  const [stats, setStats] = useState({
    active: 0,
    resolved: 0,
    staked: 0
  });

  const loadMyDisputes = async (userAddress) => {
    if (!userAddress) return;
    const currentPersona = getPersonaDetails(userAddress);
    setPersona(currentPersona);

    const allDisputes = await getDisputes();
    const myFiltered = allDisputes.filter(
      d => d.creatorAddress.toLowerCase() === userAddress.toLowerCase()
    );

    const activeCount = myFiltered.filter(d => d.status === "pending").length;
    const resolvedCount = myFiltered.filter(d => d.status === "resolved").length;
    const stakedSum = myFiltered.reduce((sum, d) => sum + d.stakeAmount, 0);

    setDisputes(myFiltered);
    setStats({
      active: activeCount,
      resolved: resolvedCount,
      staked: stakedSum
    });
  };

  useEffect(() => {
    loadMyDisputes(address);
    const handleUpdate = () => loadMyDisputes(address);
    window.addEventListener("verdictDbUpdated", handleUpdate);
    return () => {
      window.removeEventListener("verdictDbUpdated", handleUpdate);
    };
  }, [address]);

  return (
    <WalletGate>
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="p-6 md:p-8 max-w-5xl mx-auto space-y-8"
      >
        {/* Page Header */}
        <div>
          <h1 className="font-headline font-extrabold text-2xl md:text-3xl text-white tracking-tight flex items-center gap-3">
            <History className="h-7 w-7 text-[#4F6EF7]" />
            My Disputes
          </h1>
          <p className="font-body text-sm text-[#94a3b8] mt-2">
            Track case history, stakes in escrow, and consensus reports filed under your signature.
          </p>
        </div>

        {/* Persona Alert */}
        {persona.role !== "creator" && (
          <div className="bg-white/[0.04] border border-white/[0.07] backdrop-blur-md rounded-[14px] p-6 flex gap-4 text-xs font-body leading-relaxed text-[#94a3b8]">
            <ShieldAlert className="h-5 w-5 text-[#F5A623] shrink-0 mt-0.5" />
            <div>
              <span className="text-white font-semibold">Reviewer Wallet Connected:</span> You are currently viewing logs for <strong className="text-white">Reviewer account ({persona.name})</strong>. 
              Reviewers don't typically submit disputes, but you can see disputes initiated by this wallet address here.
            </div>
          </div>
        )}

        {/* Stats Summary row */}
        <section className="grid grid-cols-3 gap-6">
          {[
            { label: "Active Disputes", val: stats.active, icon: Clock, color: "text-[#F5A623]", borderClass: "border-l-[#3b82f6]" },
            { label: "Resolved Disputes", val: stats.resolved, icon: CheckCircle, color: "text-[#00D48B]", borderClass: "border-l-[#10b981]" },
            { label: "Total Escrow Staked", val: `${stats.staked.toFixed(2)} USDC`, icon: Scale, color: "text-[#4F6EF7]", borderClass: "border-l-[#8b5cf6]" }
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div 
                key={idx} 
                className={`bg-white/[0.04] backdrop-blur-md border-y border-r border-white/[0.07] border-l-[3px] ${item.borderClass} rounded-[14px] p-5 flex flex-col justify-between space-y-4`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-body text-[10px] text-[#94a3b8] uppercase tracking-wider font-semibold">{item.label}</span>
                  <Icon className={`h-4 w-4 ${item.color}`} />
                </div>
                <div className="font-headline font-extrabold text-lg text-white tracking-tight">
                  {item.val}
                </div>
              </div>
            );
          })}
        </section>

        {/* History Cases List */}
        <section className="bg-white/[0.04] backdrop-blur-md border border-white/[0.07] rounded-[14px] overflow-hidden">
          <div className="px-6 py-4 border-b border-white/[0.07]">
            <h3 className="font-headline font-bold text-sm text-white tracking-wide uppercase">
              Your Case Filings
            </h3>
          </div>

          {disputes.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <History className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="font-body text-xs text-[#94a3b8]">No disputes filed under this address yet.</p>
              {persona.role === "creator" && (
                <Link 
                  to="/submit" 
                  className="font-body text-xs text-primary hover:text-[#4F6EF7]/80 mt-2 inline-block font-semibold"
                >
                  File your first dispute now
                </Link>
              )}
            </div>
          ) : (
            <div className="divide-y divide-white/[0.07]">
              {disputes.map((dispute) => {
                const isResolved = dispute.status === "resolved";
                return (
                  <div key={dispute.id} className="p-6 hover:bg-white/[0.02] transition-colors duration-200 relative flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[9px] text-[#4F6EF7] bg-[#4F6EF7]/10 px-2 py-0.5 rounded uppercase font-semibold">
                          {dispute.violationType}
                        </span>
                        <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase ${
                          isResolved 
                            ? "bg-[#00D48B]/10 border-[#00D48B]/20 text-[#00D48B]" 
                            : "bg-[#F5A623]/10 border-[#F5A623]/20 text-[#F5A623] animate-pulse-pending"
                        }`}>
                          {dispute.status}
                        </span>
                      </div>

                      <h4 className="font-headline font-bold text-sm text-white leading-snug">
                        {dispute.title}
                      </h4>

                      <div className="flex items-center space-x-2 text-[10px] text-[#94a3b8] font-mono">
                        <span>Submitted: {new Date(dispute.createdAt).toLocaleString()}</span>
                        <span>•</span>
                        <a 
                          href={getArcExplorerUrl(dispute.txHash)} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="hover:text-white flex items-center gap-0.5 text-[#94a3b8]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span>Tx: {truncateAddress(dispute.txHash)}</span>
                          <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-6 shrink-0 z-10 font-body">
                      <div className="text-right">
                        <span className="text-[#94a3b8] block text-[10px] uppercase font-semibold">Stake</span>
                        <span className="text-white font-mono font-semibold text-xs mt-0.5 block">
                          {dispute.stakeAmount.toFixed(2)} USDC
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[#94a3b8] block text-[10px] uppercase font-semibold">Consensus</span>
                        <span className={`font-mono font-semibold text-xs mt-0.5 block uppercase ${
                          dispute.consensus === "reject" 
                            ? "text-[#F7476E]" 
                            : dispute.consensus === "approve" 
                              ? "text-[#00D48B]" 
                              : "text-[#94a3b8]"
                        }`}>
                          {dispute.consensus ? dispute.consensus : "PENDING"}
                        </span>
                      </div>
                    </div>

                    <Link 
                      to={`/disputes/${dispute.id}`} 
                      className="absolute inset-0" 
                      aria-label={`View case ${dispute.id}`}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </motion.div>
    </WalletGate>
  );
}
