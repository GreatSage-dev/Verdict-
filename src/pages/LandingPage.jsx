import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAccount } from "wagmi";
import { 
  Scale, 
  ShieldAlert, 
  Coins, 
  CheckCircle, 
  ArrowRight, 
  Cpu, 
  ChevronRight,
  Wallet,
  ArrowUpRight,
  ChevronDown
} from "lucide-react";
import { 
  getDisputes, 
  getTransactions, 
  getPersonaDetails, 
  truncateAddress, 
  getArcExplorerUrl 
} from "../firebase/db";

const ROTATOR_WORDS = ["Machine Economy", "Agent Economy", "Risk Economy", "Trust Economy"];

export default function LandingPage() {
  const { address, isConnected } = useAccount();
  const [stats, setStats] = useState({
    totalStaked: 0,
    openDisputes: 0,
    resolvedDisputes: 0,
    consensusRate: 97.4
  });
  const [recentDisputes, setRecentDisputes] = useState([]);
  const [persona, setPersona] = useState(() => getPersonaDetails(address));
  const [recentTx, setRecentTx] = useState(null);

  // Typewriter rotators
  const [wordIndex, setWordIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let timer;
    const currentWord = ROTATOR_WORDS[wordIndex];
    
    if (!isDeleting && displayedText === currentWord) {
      timer = setTimeout(() => setIsDeleting(true), 2000);
    } else if (isDeleting && displayedText === "") {
      setIsDeleting(false);
      setWordIndex((prev) => (prev + 1) % ROTATOR_WORDS.length);
    } else {
      const nextText = isDeleting 
        ? currentWord.substring(0, displayedText.length - 1)
        : currentWord.substring(0, displayedText.length + 1);
        
      timer = setTimeout(() => {
        setDisplayedText(nextText);
      }, isDeleting ? 30 : 70);
    }
    
    return () => clearTimeout(timer);
  }, [displayedText, isDeleting, wordIndex]);

  const loadDashboardData = async (userAddress) => {
    const disputes = await getDisputes();
    const open = disputes.filter(d => d.status === "pending").length;
    const resolved = disputes.filter(d => d.status === "resolved").length;
    
    const transactions = await getTransactions();
    const totalStakedSum = transactions
      .filter(t => t.type === "stake")
      .reduce((sum, t) => sum + t.amount, 0);

    setStats({
      totalStaked: totalStakedSum,
      openDisputes: open,
      resolvedDisputes: resolved,
      consensusRate: 98.2
    });

    const sorted = [...disputes].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    setRecentDisputes(sorted.slice(0, 3));
    
    const activePersona = getPersonaDetails(userAddress);
    setPersona(activePersona);

    if (userAddress) {
      const userAddrLower = userAddress.toLowerCase();
      const sortedTx = [...transactions]
        .filter(t => t.fromAddress.toLowerCase() === userAddrLower || t.toAddress.toLowerCase() === userAddrLower)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      if (sortedTx.length > 0) {
        setRecentTx(sortedTx[0]);
      } else {
        setRecentTx(null);
      }
    } else {
      setRecentTx(null);
    }
  };

  useEffect(() => {
    loadDashboardData(address);
    const handleUpdate = () => loadDashboardData(address);
    window.addEventListener("verdictDbUpdated", handleUpdate);
    return () => {
      window.removeEventListener("verdictDbUpdated", handleUpdate);
    };
  }, [address]);

  const scrollToLower = () => {
    const element = document.getElementById("dashboard-lower-section");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const cardVariants = {
    hover: { 
      scale: 1.015,
      borderColor: "rgba(255, 255, 255, 0.15)",
      transition: { duration: 0.2, ease: "easeOut" }
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="p-6 md:p-8 max-w-5xl mx-auto space-y-12 relative"
    >
      {/* 2-Column Hero Header Layout */}
      <section 
        className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center bg-white/[0.04] backdrop-blur-md border border-white/[0.07] rounded-[14px] p-8 md:p-12 md:pb-16 relative overflow-hidden min-h-[480px]"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent opacity-60 pointer-events-none" />
        
        {/* Left Column: Headline, Typewriter, and Actions */}
        <div className="lg:col-span-2 space-y-6">
          <div className="inline-flex items-center space-x-2 bg-white/[0.04] border border-white/[0.07] text-primary rounded-full px-3.5 py-1.5 text-xs font-body font-semibold">
            <Cpu className="h-3.5 w-3.5" />
            <span>AI Dispute Escrow Protocol</span>
          </div>

          <h2 className="font-headline font-extrabold text-3xl md:text-5xl text-white tracking-tight leading-tight">
            The Court of Last Resort for the{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#4F6EF7] to-[#00D48B] inline-block min-w-[280px]">
              {displayedText}
            </span>
            <span className="text-[#00D48B] ml-1 font-light animate-pulse">|</span>
          </h2>

          <p className="font-body text-sm md:text-base leading-relaxed max-w-xl" style={{ color: "#cbd5e1" }}>
            Verdict provides instant transaction resolution and escrow slashing for LLM hallucination, API leaks, and rule violations. Reviewers stake USDC via Circle x402 nanopayments on the Arc blockchain network.
          </p>

          <div className="flex flex-wrap gap-4 pt-2">
            <Link
              to="/submit"
              className="flex items-center space-x-2 bg-gradient-to-r from-[#4F6EF7] to-[#00D48B] hover:opacity-90 text-white rounded-lg px-5 py-3.5 font-body font-bold text-xs uppercase tracking-widest transition-colors duration-250 cursor-pointer no-shadow"
            >
              <span>File New Dispute</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/disputes"
              className="flex items-center space-x-2 bg-transparent hover:bg-white/[0.02] border border-white/[0.2] text-white rounded-lg px-5 py-3.5 font-body font-bold text-xs uppercase tracking-widest transition-colors duration-250 cursor-pointer"
            >
              <span>Explore Board</span>
            </Link>
          </div>
        </div>

        {/* Right Column: Courtroom Scale with Weighted Floating Cards */}
        <div 
          className="lg:col-span-1 flex justify-center items-center relative select-none bg-white/[0.02] border border-white/[0.07] rounded-[14px] p-6 overflow-hidden h-96 w-full"
          style={{ transformStyle: "preserve-3d", perspective: "1000px" }}
        >
          {/* Main Scale Container (scaled down to fit perfectly inside the 24px-padded panel) */}
          <div 
            className="relative flex items-center justify-center h-80 w-full"
            style={{ transform: "scale(0.85)", transformOrigin: "center" }}
          >
            
            {/* Center vertical pillar with glowing base */}
            <div className="absolute w-1.5 h-56 bg-white/[0.1] top-8 rounded-full" />
            <div className="absolute w-8 h-1 bg-white/[0.2] top-8 rounded-full" />
            <div className="absolute w-20 h-1.5 bg-white/[0.15] bottom-16 rounded-full" />
            <div className="absolute w-28 h-1 bg-white/[0.08] bottom-14 rounded-full" />

             {/* Beam Pivot element for rocking */}
            <div 
              className="absolute w-[160px] h-1 top-14 bg-white/[0.25] rounded-full animate-rock-beam"
              style={{ 
                transformStyle: "preserve-3d"
              }}
            >
              {/* Left Pan Attachment Point */}
              <div className="absolute left-0 -top-1 w-2.5 h-2.5 bg-[#00D48B] rounded-full">
                {/* Counter-rotation for strings & cards */}
                <div className="animate-counter-rock">
                  {/* Left hanger strings */}
                  <svg className="absolute top-2 -left-5 w-12 h-16 pointer-events-none" viewBox="0 0 40 50" fill="none">
                    <line x1="20" y1="0" x2="2" y2="44" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
                    <line x1="20" y1="0" x2="38" y2="44" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
                    <path d="M2 44 L38 44" stroke="#00D48B" strokeWidth="2.5" />
                    <path d="M2 44 C2 52, 38 52, 38 44" stroke="rgba(0,212,139,0.2)" strokeWidth="1.5" fill="rgba(0,212,139,0.03)" />
                  </svg>

                  {/* Left pan weighted cards (centered under the pan) */}
                  <div className="absolute top-14 -left-[54px] space-y-3.5 w-28">
                    {/* Left Card 1 */}
                    <motion.div 
                      className="bg-[#0f1321]/90 border border-white/[0.1] border-t-2 border-t-[#00D48B] rounded-[10px] p-2.5 text-left backdrop-blur-md"
                      style={{ transformStyle: "preserve-3d", rotateX: 3, boxShadow: "0 4px 12px rgba(0,0,0,0.4)" }}
                      animate={{
                        y: [0, -5, 0],
                        rotate: [0, -1.5, 0],
                        x: [0, -3, 0]
                      }}
                      transition={{
                        repeat: Infinity,
                        duration: 3.8,
                        ease: "easeInOut"
                      }}
                    >
                      <div className="text-[8px] font-body font-bold uppercase tracking-wider" style={{ color: "#94a3b8" }}>USDC Locked</div>
                      <div className="text-xs font-extrabold text-white font-headline mt-0.5">250 USDC</div>
                    </motion.div>

                    {/* Left Card 2 */}
                    <motion.div 
                      className="bg-[#0f1321]/90 border border-white/[0.1] rounded-[10px] p-2.5 text-left backdrop-blur-md"
                      style={{ transformStyle: "preserve-3d", rotateX: 3, boxShadow: "0 4px 12px rgba(0,0,0,0.4)" }}
                      animate={{
                        y: [0, -7, 0],
                        rotateY: [0, 4, 0],
                        x: [0, -5, 0]
                      }}
                      transition={{
                        repeat: Infinity,
                        duration: 4.5,
                        delay: 1.0,
                        ease: "easeInOut"
                      }}
                    >
                      <div className="text-[8px] font-body font-bold uppercase tracking-wider" style={{ color: "#94a3b8" }}>Open Disputes</div>
                      <div className="text-xs font-extrabold text-white font-headline mt-0.5">2 Active</div>
                    </motion.div>
                  </div>
                </div>
              </div>

              {/* Right Pan Attachment Point */}
              <div className="absolute right-0 -top-1 w-2.5 h-2.5 bg-[#F7476E] rounded-full">
                {/* Counter-rotation */}
                <div className="animate-counter-rock">
                  {/* Right hanger strings */}
                  <svg className="absolute top-2 -left-5 w-12 h-16 pointer-events-none" viewBox="0 0 40 50" fill="none">
                    <line x1="20" y1="0" x2="2" y2="44" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
                    <line x1="20" y1="0" x2="38" y2="44" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
                    <path d="M2 44 L38 44" stroke="#F7476E" strokeWidth="2.5" />
                    <path d="M2 44 C2 52, 38 52, 38 44" stroke="rgba(247,71,110,0.2)" strokeWidth="1.5" fill="rgba(247,71,110,0.03)" />
                  </svg>

                  {/* Right pan weighted cards */}
                  <div className="absolute top-14 -left-[54px] space-y-3.5 w-28">
                    {/* Right Card 1 */}
                    <motion.div 
                      className="bg-[#0f1321]/90 border border-white/[0.1] border-t-2 border-t-[#F7476E] rounded-[10px] p-2.5 text-left backdrop-blur-md"
                      style={{ transformStyle: "preserve-3d", rotateX: 3, boxShadow: "0 4px 12px rgba(0,0,0,0.4)" }}
                      animate={{
                        y: [0, -4, 0],
                        rotate: [0, 1.5, 0],
                        x: [0, 3, 0]
                      }}
                      transition={{
                        repeat: Infinity,
                        duration: 3.2,
                        ease: "easeInOut"
                      }}
                    >
                      <div className="text-[8px] font-body font-bold uppercase tracking-wider" style={{ color: "#94a3b8" }}>Experts Active</div>
                      <div className="text-xs font-extrabold text-white font-headline mt-0.5">4 Auditing</div>
                    </motion.div>

                    {/* Right Card 2 */}
                    <motion.div 
                      className="bg-[#0f1321]/90 border border-white/[0.1] rounded-[10px] p-2.5 text-left backdrop-blur-md"
                      style={{ transformStyle: "preserve-3d", rotateX: 3, boxShadow: "0 4px 12px rgba(0,0,0,0.4)" }}
                      animate={{
                        y: [0, -6, 0],
                        rotateY: [0, -4, 0],
                        x: [0, 5, 0]
                      }}
                      transition={{
                        repeat: Infinity,
                        duration: 5.0,
                        delay: 0.7,
                        ease: "easeInOut"
                      }}
                    >
                      <div className="text-[8px] font-body font-bold uppercase tracking-wider" style={{ color: "#94a3b8" }}>Avg Resolution</div>
                      <div className="text-xs font-extrabold text-white font-headline mt-0.5">48 Hours</div>
                    </motion.div>
                  </div>
                </div>
              </div>

            </div>

            {/* Scale caption label */}
            <div className="absolute bottom-6 font-mono text-[9px] uppercase tracking-[0.2em]" style={{ color: "#cbd5e1" }}>
              VERDICT ENGINE
            </div>

          </div>
        </div>

        {/* Scroll-down Arrow Link */}
        <div 
          onClick={scrollToLower}
          className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex flex-col items-center cursor-pointer z-20 group"
        >
          <span className="text-[8px] font-mono text-[#94a3b8] uppercase tracking-widest mb-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            Scroll Down
          </span>
          <motion.div
            animate={{ y: [0, 5, 0] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
            className="text-[#94a3b8] hover:text-white"
          >
            <ChevronDown className="h-5 w-5 text-[#4F6EF7]" />
          </motion.div>
        </div>

      </section>

      {/* Lower Dashboard Section Wrapper */}
      <div id="dashboard-lower-section" className="grid grid-cols-1 lg:grid-cols-3 gap-8 scroll-mt-24">
        
        {/* Left Column (2/3 width on desktop): Stats Matrix & Case Feed */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Stats Matrix Grid */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Total Value Locked", val: `${stats.totalStaked.toFixed(2)} USDC`, icon: Coins, color: "text-primary", borderClass: "border-l-[#3b82f6]" },
              { label: "Open Disputes", val: stats.openDisputes, icon: ShieldAlert, color: "text-[#F5A623]", borderClass: "border-l-[#10b981]" },
              { label: "Resolved Cases", val: stats.resolvedDisputes, icon: CheckCircle, color: "text-[#00D48B]", borderClass: "border-l-[#8b5cf6]" },
              { label: "Consensus Accuracy", val: `${stats.consensusRate}%`, icon: Scale, color: "text-white", borderClass: "border-l-[#06b6d4]" }
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <div 
                  key={idx} 
                  className={`bg-white/[0.04] backdrop-blur-md border-y border-r border-white/[0.07] border-l-[3px] ${item.borderClass} rounded-[14px] p-5 flex flex-col justify-between space-y-4`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-body text-[10px] text-[#94a3b8] uppercase tracking-wider font-semibold">{item.label}</span>
                    <Icon className={`h-4.5 w-4.5 ${item.color}`} />
                  </div>
                  <div className="font-headline font-extrabold text-lg text-white tracking-tight">
                    {item.val}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Recent Case Feed */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-headline font-bold text-sm text-white uppercase tracking-wider">
                Recent Disputes Board
              </h3>
              <Link 
                to="/disputes" 
                className="font-body text-xs text-primary hover:text-[#4F6EF7]/80 flex items-center gap-1 font-semibold uppercase tracking-wider"
              >
                Explore Case Board <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="space-y-4">
              {recentDisputes.map((dispute) => (
                <motion.div
                  key={dispute.id}
                  variants={cardVariants}
                  whileHover="hover"
                  className="bg-white/[0.04] backdrop-blur-md border border-white/[0.07] rounded-[14px] p-5 block relative transition-colors duration-250"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <span className="font-mono text-[9px] text-[#94a3b8] uppercase font-semibold">
                        Case {dispute.id.toUpperCase()}
                      </span>
                      <h4 className="font-headline font-bold text-xs md:text-sm text-white leading-tight">
                        {dispute.title}
                      </h4>
                    </div>
                    <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${
                      dispute.status === "resolved" 
                        ? "bg-[#00D48B]/10 border-[#00D48B]/20 text-[#00D48B]" 
                        : "bg-[#F5A623]/10 border-[#F5A623]/20 text-[#F5A623] animate-pulse-pending"
                    }`}>
                      {dispute.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 border-t border-white/[0.07] mt-4 pt-4 text-[11px] font-body text-[#94a3b8]">
                    <div>
                      <span className="text-[#94a3b8] block text-[9px] uppercase font-semibold">Stake</span>
                      <span className="text-white font-semibold font-mono mt-0.5 block">
                        {dispute.stakeAmount.toFixed(0)} USDC
                      </span>
                    </div>
                    <div>
                      <span className="text-[#94a3b8] block text-[9px] uppercase font-semibold">Votes</span>
                      <span className="text-white font-semibold font-mono mt-0.5 block">
                        {dispute.voters.length}/3
                      </span>
                    </div>
                    <div>
                      <span className="text-[#94a3b8] block text-[9px] uppercase font-semibold">Consensus</span>
                      <span className={`font-semibold font-mono mt-0.5 block uppercase ${
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
                    className="absolute inset-0 z-10" 
                    aria-label={`View details of case ${dispute.title}`}
                  />
                </motion.div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column (1/3 width on desktop): Profile & Guide */}
        <div className="space-y-6">
          
          {/* Active Wallet Status Info */}
          <div className="bg-white/[0.04] backdrop-blur-md border border-white/[0.07] rounded-[14px] p-6 space-y-4">
            <h3 className="font-headline font-bold text-xs text-white uppercase tracking-wider flex items-center gap-2">
              <Wallet className="h-4 w-4 text-primary" />
              Active Wallet Profile
            </h3>
            
            <div className="bg-white/[0.02] border border-white/[0.07] p-4 rounded-lg">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{persona.avatar}</span>
                <div className="min-w-0 flex-1">
                  <div className="font-headline font-semibold text-xs text-white truncate">
                    {persona.name}
                  </div>
                  <div className="font-mono text-[10px] text-[#94a3b8] truncate mt-0.5">
                    {persona.address}
                  </div>
                  <div className="font-mono text-xs text-[#00D48B] mt-1 font-bold">
                    {persona.balance.toFixed(2)} USDC
                  </div>
                </div>
              </div>
            </div>

            {recentTx && (
              <div className="border-t border-white/[0.07] pt-3 flex justify-between items-center text-[10px] font-mono">
                <span className="text-[#94a3b8]">Last Tx: {truncateAddress(recentTx.hash)}</span>
                <a 
                  href={getArcExplorerUrl(recentTx.hash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline flex items-center gap-0.5"
                >
                  <span>Explorer</span>
                  <ArrowUpRight className="h-3 w-3" />
                </a>
              </div>
            )}

            <Link
              to="/wallet"
              className="w-full py-2 bg-transparent hover:bg-white/[0.02] border border-white/[0.2] text-white text-xs font-body font-bold uppercase tracking-wider rounded-lg flex items-center justify-center transition-all duration-200"
            >
              Circle USDC Faucet & Logs
            </Link>
          </div>

          {/* How It Works Guide */}
          <div className="space-y-4">
            <h3 className="font-headline font-bold text-sm text-white uppercase tracking-wider">
              Verdict Protocol
            </h3>

            <div className="bg-white/[0.04] backdrop-blur-md border border-white/[0.07] rounded-[14px] p-6 space-y-6">
              {[
                { num: "01", title: "Submit and Stake", desc: "An auditor or developer posts a disputed LLM output, highlights the protocol instruction violated, and stakes USDC." },
                { num: "02", title: "Expert Review", desc: "Three pre-seeded expert reviewers examine the context, input parameters, and expected schemas, staking 50 USDC each to vote." },
                { num: "03", title: "Consensus Settlement", desc: "Upon 3 reviews, the smart contract settles. The winning party shares the slashed stake pool, secured by Circle nanopayments." }
              ].map((step, idx) => (
                <div key={idx} className="flex gap-4">
                  <span className="font-mono font-extrabold text-primary text-base leading-none pt-0.5">
                    {step.num}
                  </span>
                  <div className="space-y-1">
                    <h4 className="font-headline font-bold text-xs text-white uppercase tracking-wide">
                      {step.title}
                    </h4>
                    <p className="font-body text-xs text-[#94a3b8] leading-relaxed">
                      {step.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </motion.div>
  );
}
