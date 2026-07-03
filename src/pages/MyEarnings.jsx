import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAccount } from "wagmi";
import { TrendingUp, Coins, Award, HelpCircle, ArrowUpRight, Scale, ShieldAlert } from "lucide-react";
import { getDisputes, getPersonaDetails, truncateAddress, getArcExplorerUrl } from "../firebase/db";
import WalletGate from "../components/WalletGate";

export default function MyEarnings() {
  const { address } = useAccount();
  const [persona, setPersona] = useState(() => getPersonaDetails(address));
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState({
    totalEarnings: 0,
    lockedStakes: 0,
    totalVotes: 0,
    alignmentIndex: 100
  });

  const loadEarnings = async (userAddress) => {
    if (!userAddress) return;
    const currentPersona = getPersonaDetails(userAddress);
    setPersona(currentPersona);

    const allDisputes = await getDisputes();
    const votedDisputes = allDisputes.filter(
      d => d.voters.includes(currentPersona.id)
    );

    let activeStakes = 0;
    let correctVotes = 0;
    let finishedVotes = 0;

    const formattedHistory = votedDisputes.map(d => {
      const myVote = d.votes[currentPersona.id];
      const isResolved = d.status === "resolved";
      
      let winStatus = "pending";
      let rewardAmount = 0;

      if (!isResolved) {
        activeStakes += 50.00;
      } else {
        finishedVotes++;
        const won = d.consensus === myVote;
        if (won) {
          correctVotes++;
          winStatus = "won";
          
          const votesVal = Object.values(d.votes);
          const losingCount = votesVal.filter(v => v !== d.consensus).length;
          
          if (d.consensus === "reject") {
            const winningReviewersCount = votesVal.filter(v => v === "reject").length;
            const reviewerBonus = losingCount > 0 ? (losingCount * 30.00) / winningReviewersCount : 0;
            rewardAmount = reviewerBonus;
          } else {
            const creatorStake = d.stakeAmount;
            const winningReviewersCount = votesVal.filter(v => v === "approve").length;
            const reviewerReward = (creatorStake + (losingCount * 50.00)) / winningReviewersCount;
            rewardAmount = reviewerReward;
          }
        } else {
          winStatus = "lost";
          rewardAmount = -50.00;
        }
      }

      return {
        id: d.id,
        title: d.title,
        myVote,
        consensus: d.consensus,
        status: d.status,
        createdAt: d.createdAt,
        winStatus,
        rewardAmount,
        txHash: d.txHash
      };
    }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const alignment = finishedVotes > 0 ? Math.round((correctVotes / finishedVotes) * 100) : 100;
    const displayEarnings = currentPersona.role === "reviewer" ? currentPersona.balance : 0;

    setHistory(formattedHistory);
    setStats({
      totalEarnings: displayEarnings,
      lockedStakes: activeStakes,
      totalVotes: votedDisputes.length,
      alignmentIndex: alignment
    });
  };

  useEffect(() => {
    loadEarnings(address);
    const handleUpdate = () => loadEarnings(address);
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
            <TrendingUp className="h-7 w-7 text-[#4F6EF7]" />
            Reviewer Performance
          </h1>
          <p className="font-body text-sm text-[#94a3b8] mt-2">
            Track consensus accuracy metrics, total earned USDC yields, and ongoing case stake channels.
          </p>
        </div>

        {/* Persona Alert */}
        {persona.role !== "reviewer" && (
          <div className="bg-white/[0.04] border border-white/[0.07] backdrop-blur-md rounded-[14px] p-6 flex gap-4 text-xs font-body leading-relaxed text-[#94a3b8]">
            <ShieldAlert className="h-5 w-5 text-[#F5A623] shrink-0 mt-0.5" />
            <div>
              <span className="text-white font-semibold">Submitter Account Connected:</span> You are currently connected with a Submitter wallet. 
              Submitters do not vote on disputes and do not receive reviewer yields. 
              To view mock reviewer earnings, connect one of the pre-seeded reviewer addresses (Alice, Bob, or Charlie).
            </div>
          </div>
        )}

        {/* Stats Summary row */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: "Net Earnings", val: `${stats.totalEarnings.toFixed(2)} USDC`, icon: Coins, color: "text-[#00D48B]", borderClass: "border-l-[#3b82f6]" },
            { label: "Stakes Locked", val: `${stats.lockedStakes.toFixed(2)} USDC`, icon: Scale, color: "text-[#F5A623]", borderClass: "border-l-[#10b981]" },
            { label: "Votes Cast", val: stats.totalVotes, icon: Award, color: "text-[#4F6EF7]", borderClass: "border-l-[#8b5cf6]" },
            { label: "Consensus Alignment", val: `${stats.alignmentIndex}%`, icon: TrendingUp, color: "text-white", borderClass: "border-l-[#06b6d4]" }
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

        {/* Main Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Review Log Feed */}
          <div className="lg:col-span-2 space-y-6">
            <h3 className="font-headline font-bold text-sm text-white uppercase tracking-wider">
              Review Activity Log
            </h3>

            <div className="bg-white/[0.04] backdrop-blur-md border border-white/[0.07] rounded-[14px] overflow-hidden">
              {history.length === 0 ? (
                <div className="px-6 py-12 text-center font-body">
                  <Award className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-xs text-[#94a3b8]">No review activity recorded for this address.</p>
                  <Link to="/disputes" className="text-xs text-primary font-semibold mt-2 inline-block">
                    Explore active disputes to vote
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-white/[0.07] font-body text-xs">
                  {history.map((item) => {
                    const isWon = item.winStatus === "won";
                    const isLost = item.winStatus === "lost";

                    return (
                      <div key={item.id} className="p-5 flex items-start justify-between gap-6 hover:bg-white/[0.02] transition-colors duration-200 relative">
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase ${
                              item.myVote === "reject" 
                                ? "bg-[#F7476E]/10 border-[#F7476E]/20 text-[#F7476E]" 
                                : "bg-[#00D48B]/10 border-[#00D48B]/20 text-[#00D48B]"
                            }`}>
                              Voted: {item.myVote}
                            </span>
                            <span className="text-[10px] text-[#94a3b8] font-mono">
                              Case ID: {item.id}
                            </span>
                          </div>

                          <h4 className="font-headline font-bold text-xs text-white leading-normal truncate">
                            {item.title}
                          </h4>

                          <span className="text-[10px] text-[#94a3b8] block font-mono">
                            Voted on: {new Date(item.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 shrink-0 z-10 text-right">
                          <div>
                            <span className="text-[#94a3b8] block text-[9px] uppercase font-semibold">Yield</span>
                            <span className={`font-mono font-bold text-xs mt-0.5 block ${
                              isWon ? "text-[#00D48B]" : isLost ? "text-[#F7476E]" : "text-[#F5A623]"
                            }`}>
                              {isWon ? `+${item.rewardAmount.toFixed(2)}` : isLost ? `-${Math.abs(item.rewardAmount).toFixed(2)}` : "0.00"} USDC
                            </span>
                          </div>
                          <div>
                            <span className="text-[#94a3b8] block text-[9px] uppercase font-semibold">State</span>
                            <span className={`font-mono font-semibold text-[10px] mt-0.5 block uppercase ${
                              isWon ? "text-[#00D48B]" : isLost ? "text-[#F7476E]" : "text-[#F5A623]"
                            }`}>
                              {item.winStatus}
                            </span>
                          </div>
                        </div>

                        <Link to={`/disputes/${item.id}`} className="absolute inset-0" aria-label={`View Case ${item.id}`} />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Info Column */}
          <div className="space-y-6">
            <h3 className="font-headline font-bold text-sm text-white uppercase tracking-wider">
              Reviewer Protocol Rules
            </h3>

            <div className="bg-white/[0.04] backdrop-blur-md border border-white/[0.07] rounded-[14px] p-6 space-y-6">
              <div className="flex gap-4">
                <Coins className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-headline font-bold text-xs text-white uppercase tracking-wide">
                    Reviewer Collateral Staking
                  </h4>
                  <p className="font-body text-xs text-[#94a3b8] leading-normal">
                    Expert reviews require a collateral deposit of <strong className="text-white">50.00 USDC</strong> via Circle nanopayments to align incentives and prevent sybil attacks.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <TrendingUp className="h-5 w-5 text-[#00D48B] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-headline font-bold text-xs text-white uppercase tracking-wide">
                    USDC Yield Split
                  </h4>
                  <p className="font-body text-xs text-[#94a3b8] leading-normal">
                    Consensus winners reclaim their 50.00 USDC collateral and split the slashed collateral pot of losing jury members and developers.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <Award className="h-5 w-5 text-[#F5A623] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-headline font-bold text-xs text-white uppercase tracking-wide">
                    Alignment Index & Slashing
                  </h4>
                  <p className="font-body text-xs text-[#94a3b8] leading-normal">
                    Maintain an Alignment Index above <strong className="text-white">80%</strong> to stay qualified. Voting against consensus slashes your 50.00 USDC collateral.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </WalletGate>
  );
}
