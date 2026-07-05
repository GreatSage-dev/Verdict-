import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAccount } from "wagmi";
import { Shield, CheckCircle, ArrowRight, Star, Scale, Coins } from "lucide-react";
import { registerReviewer, isRegisteredReviewer, getRegisteredReviewer } from "../firebase/db";
import WalletGate from "../components/WalletGate";

export default function BecomeReviewer() {
  const { address } = useAccount();
  const [registered, setRegistered] = useState(false);
  const [reviewer, setReviewer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [justActivated, setJustActivated] = useState(false);

  const checkStatus = async () => {
    if (!address) {
      setLoading(false);
      return;
    }
    try {
      const isReg = await isRegisteredReviewer(address);
      setRegistered(isReg);
      if (isReg) {
        const data = await getRegisteredReviewer(address);
        setReviewer(data);
      }
    } catch (e) {
      console.error("Failed to check reviewer status:", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    checkStatus();

    const handleUpdate = () => checkStatus();
    window.addEventListener("verdictDbUpdated", handleUpdate);
    return () => window.removeEventListener("verdictDbUpdated", handleUpdate);
  }, [address]);

  const handleActivate = async () => {
    if (!address || activating) return;
    setActivating(true);
    try {
      const result = await registerReviewer(address);
      setReviewer(result);
      setRegistered(true);
      setJustActivated(true);
      setTimeout(() => setJustActivated(false), 3000);
    } catch (e) {
      console.error("Registration failed:", e);
    }
    setActivating(false);
  };

  const benefits = [
    {
      icon: Coins,
      title: "Earn 2.00 USDC Per Review",
      description: "Receive direct compensation for each dispute you review with reasoning submitted."
    },
    {
      icon: Shield,
      title: "No Staking Required",
      description: "Activate your reviewer role instantly — no upfront collateral deposit needed to get started."
    },
    {
      icon: Scale,
      title: "Shape AI Accountability",
      description: "Help resolve edge cases the AI Judge couldn't confidently decide, improving the protocol for everyone."
    },
    {
      icon: Star,
      title: "Build On-Chain Reputation",
      description: "Your review history and consensus alignment score become part of your verifiable on-chain identity."
    }
  ];

  if (loading) {
    return (
      <WalletGate>
        <div className="flex items-center justify-center py-24">
          <div className="h-8 w-8 border-2 border-[#4F6EF7] border-t-transparent rounded-full animate-spin" />
        </div>
      </WalletGate>
    );
  }

  return (
    <WalletGate>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="p-6 md:p-10 max-w-3xl mx-auto space-y-8"
      >
        {/* ─── Registered Reviewer Dashboard ─── */}
        {registered && reviewer ? (
          <>
            {/* Success flash animation */}
            {justActivated && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="bg-[#00D48B]/10 border border-[#00D48B]/20 rounded-[14px] p-6 text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
                  className="text-4xl mb-3"
                >
                  🎉
                </motion.div>
                <h3 className="font-headline font-bold text-lg text-[#00D48B] uppercase tracking-wider">
                  Reviewer Role Activated!
                </h3>
                <p className="font-body text-sm text-[#94a3b8] mt-1">
                  You're now part of the Verdict dispute resolution panel.
                </p>
              </motion.div>
            )}

            {/* Status Badge */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-headline font-extrabold text-2xl md:text-3xl text-white tracking-tight flex items-center gap-3">
                  <Shield className="h-7 w-7 text-[#4F6EF7]" />
                  Reviewer Dashboard
                </h1>
                <p className="font-body text-sm text-[#94a3b8] mt-2">
                  Manage your reviewer status and track performance.
                </p>
              </div>
              <div className="flex items-center gap-2 bg-[#00D48B]/10 border border-[#00D48B]/20 rounded-full px-4 py-2">
                <CheckCircle className="h-4 w-4 text-[#00D48B]" />
                <span className="font-headline font-bold text-xs text-[#00D48B] uppercase tracking-wider">
                  Active Reviewer
                </span>
              </div>
            </div>

            {/* Stats Grid */}
            <section className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[
                {
                  label: "Reviews Completed",
                  value: reviewer.votesCount || 0,
                  icon: Scale,
                  color: "text-[#4F6EF7]",
                  borderClass: "border-l-[#4F6EF7]"
                },
                {
                  label: "Total Earned",
                  value: `${(reviewer.earnings || 0).toFixed(2)} USDC`,
                  icon: Coins,
                  color: "text-[#00D48B]",
                  borderClass: "border-l-[#00D48B]"
                },
                {
                  label: "Current Status",
                  value: reviewer.status === "active" ? "Active" : "Inactive",
                  icon: CheckCircle,
                  color: reviewer.status === "active" ? "text-[#00D48B]" : "text-[#F7476E]",
                  borderClass: reviewer.status === "active" ? "border-l-[#00D48B]" : "border-l-[#F7476E]"
                }
              ].map((stat, idx) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={idx}
                    className={`bg-white/[0.04] backdrop-blur-md border-y border-r border-white/[0.07] border-l-[3px] ${stat.borderClass} rounded-[14px] p-5 flex flex-col justify-between space-y-4`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-body text-[10px] text-[#94a3b8] uppercase tracking-wider font-semibold">
                        {stat.label}
                      </span>
                      <Icon className={`h-4 w-4 ${stat.color}`} />
                    </div>
                    <div className="font-headline font-extrabold text-lg text-white tracking-tight">
                      {stat.value}
                    </div>
                  </div>
                );
              })}
            </section>

            {/* Escalation Queue Link */}
            <Link
              to="/escalation-queue"
              className="group flex items-center justify-between bg-white/[0.04] backdrop-blur-md border border-white/[0.07] rounded-[14px] p-6 hover:bg-white/[0.06] transition-colors duration-200"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-[#4F6EF7]/10 border border-[#4F6EF7]/20 rounded-xl">
                  <Scale className="h-5 w-5 text-[#4F6EF7]" />
                </div>
                <div>
                  <h3 className="font-headline font-bold text-sm text-white uppercase tracking-wider">
                    View Escalation Queue
                  </h3>
                  <p className="font-body text-xs text-[#94a3b8] mt-0.5">
                    Review disputes that need human judgment
                  </p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-[#94a3b8] group-hover:text-white group-hover:translate-x-1 transition-all duration-200" />
            </Link>
          </>
        ) : (
          /* ─── Not Registered — Activation Form ─── */
          <>
            {/* Header */}
            <div className="text-center space-y-4">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                className="inline-flex p-5 bg-white/[0.04] backdrop-blur-md border border-white/[0.07] rounded-full"
              >
                <Shield className="h-12 w-12 text-[#4F6EF7]" />
              </motion.div>

              <h1 className="font-headline font-extrabold text-2xl md:text-3xl text-white tracking-tight">
                Become a Reviewer
              </h1>

              <p className="font-body text-sm text-[#94a3b8] max-w-xl mx-auto leading-relaxed">
                Review escalated disputes the AI Judge couldn't confidently resolve.
                Earn <strong className="text-white">2.00 USDC</strong> for each completed review
                with reasoning submitted.
              </p>
            </div>

            {/* Benefits List */}
            <div className="bg-white/[0.04] backdrop-blur-md border border-white/[0.07] rounded-[14px] p-6 space-y-5">
              <h3 className="font-headline font-bold text-sm text-white uppercase tracking-wider">
                Reviewer Benefits
              </h3>

              <div className="space-y-4">
                {benefits.map((benefit, idx) => {
                  const Icon = benefit.icon;
                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -15 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.15 + idx * 0.08, duration: 0.35 }}
                      className="flex gap-4"
                    >
                      <div className="p-2.5 bg-[#4F6EF7]/10 border border-[#4F6EF7]/20 rounded-xl shrink-0 h-fit">
                        <Icon className="h-4 w-4 text-[#4F6EF7]" />
                      </div>
                      <div className="space-y-0.5">
                        <h4 className="font-headline font-bold text-xs text-white uppercase tracking-wide">
                          {benefit.title}
                        </h4>
                        <p className="font-body text-xs text-[#94a3b8] leading-normal">
                          {benefit.description}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Activate Button */}
            <div className="flex justify-center">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleActivate}
                disabled={activating}
                className="bg-[#4F6EF7] hover:bg-[#3d5bd9] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg px-8 py-3.5 font-headline font-bold text-sm uppercase tracking-wider flex items-center gap-2.5 transition-colors duration-200 shadow-lg shadow-[#4F6EF7]/20"
              >
                {activating ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Activating...
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4" />
                    Activate Reviewer Role
                  </>
                )}
              </motion.button>
            </div>

            {/* Fine Print */}
            <p className="text-center font-body text-[11px] text-[#94a3b8]/60">
              No staking or collateral deposit is required. You can begin reviewing immediately after activation.
            </p>
          </>
        )}
      </motion.div>
    </WalletGate>
  );
}
