import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Scale, Search, ShieldAlert, CheckCircle, Clock, ExternalLink } from "lucide-react";
import { getDisputes, truncateAddress, getArcExplorerUrl } from "../firebase/db";
import WalletGate from "../components/WalletGate";

export default function OpenDisputes() {
  const [disputes, setDisputes] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const loadDisputes = async () => {
    const data = await getDisputes();
    setDisputes(data || []);
  };

  useEffect(() => {
    loadDisputes();
    window.addEventListener("verdictDbUpdated", loadDisputes);
    window.addEventListener("personaChanged", loadDisputes);
    return () => {
      window.removeEventListener("verdictDbUpdated", loadDisputes);
      window.removeEventListener("personaChanged", loadDisputes);
    };
  }, []);

  const filteredDisputes = disputes.filter((d) => {
    const matchesSearch = d.title.toLowerCase().includes(search.toLowerCase()) || 
                          d.prompt.toLowerCase().includes(search.toLowerCase()) ||
                          d.id.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || d.status === statusFilter;
    const matchesCategory = categoryFilter === "all" || d.violationType === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const cardVariants = {
    hover: { 
      scale: 1.01,
      borderColor: "#4F6EF7",
      transition: { duration: 0.2, ease: "easeOut" }
    }
  };

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
            <Scale className="h-7 w-7 text-[#4F6EF7]" />
            Dispute Board
          </h1>
          <p className="font-body text-sm text-[#94a3b8] mt-2">
            Explore and resolve open AI agent disputes. Filter by violation category or search by keyword.
          </p>
        </div>

        {/* Filter Toolbar */}
        <div className="bg-white/[0.04] backdrop-blur-md border border-white/[0.07] rounded-[14px] p-4 md:p-6 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
          {/* Search */}
          <div className="md:col-span-2 relative">
            <input
              type="text"
              placeholder="Search disputes, prompts, case IDs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/[0.02] border border-white/[0.07] rounded-lg py-2.5 pl-10 pr-4 text-xs text-white placeholder-gray-600 focus:border-[#4F6EF7]"
            />
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-[#94a3b8]" />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-white/[0.02] border border-white/[0.07] rounded-lg px-3 py-2.5 text-xs text-white cursor-pointer"
            >
              <option value="all" className="bg-[#0d0f1a] text-white">All Statuses</option>
              <option value="pending" className="bg-[#0d0f1a] text-white">Active (Pending)</option>
              <option value="resolved" className="bg-[#0d0f1a] text-white">Resolved</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full bg-white/[0.02] border border-white/[0.07] rounded-lg px-3 py-2.5 text-xs text-white cursor-pointer"
            >
              <option value="all" className="bg-[#0d0f1a] text-white">All Categories</option>
              <option value="Security/PII Leak" className="bg-[#0d0f1a] text-white">Security/PII Leak</option>
              <option value="Hallucination/Malware" className="bg-[#0d0f1a] text-white">Hallucination/Malware</option>
              <option value="Instruction Alignment" className="bg-[#0d0f1a] text-white">Instruction Alignment</option>
              <option value="Safety Policy" className="bg-[#0d0f1a] text-white">Safety Policy</option>
            </select>
          </div>
        </div>

        {/* Disputes Card Grid */}
        {filteredDisputes.length === 0 ? (
          <div className="bg-white/[0.04] border border-white/[0.07] rounded-[14px] p-12 text-center">
            <Scale className="h-10 w-10 text-gray-400 mx-auto mb-3" />
            <p className="font-headline font-semibold text-sm text-[#94a3b8]">No disputes found</p>
            <p className="font-body text-xs text-[#94a3b8] mt-1">Try adjusting your filters or search terms.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredDisputes.map((dispute) => {
              const isResolved = dispute.status === "resolved";
              return (
                <motion.div
                  key={dispute.id}
                  variants={cardVariants}
                  whileHover="hover"
                  className="bg-white/[0.04] backdrop-blur-md border border-white/[0.07] rounded-[14px] p-6 relative flex flex-col justify-between"
                >
                  {/* Header info */}
                  <div>
                    <div className="flex justify-between items-start gap-4 mb-3">
                      <span className="font-mono text-[9px] text-[#4F6EF7] bg-[#4F6EF7]/10 px-2 py-0.5 rounded uppercase font-semibold">
                        {dispute.violationType}
                      </span>
                      <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border flex items-center gap-1 uppercase ${
                        isResolved 
                          ? "bg-[#00D48B]/10 border-[#00D48B]/20 text-[#00D48B]" 
                          : "bg-[#F5A623]/10 border-[#F5A623]/20 text-[#F5A623] animate-pulse-pending"
                      }`}>
                        {isResolved ? (
                          <>
                            <CheckCircle className="h-3 w-3" />
                            <span>Resolved</span>
                          </>
                        ) : (
                          <>
                            <Clock className="h-3 w-3" />
                            <span>Active</span>
                          </>
                        )}
                      </span>
                    </div>

                    <h3 className="font-headline font-bold text-sm text-white leading-snug mb-3">
                      {dispute.title}
                    </h3>

                    <div className="flex items-center space-x-2 text-[10px] text-[#94a3b8] font-mono mb-6">
                      <span>Creator: {truncateAddress(dispute.creatorAddress)}</span>
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

                  {/* Footer specs grid */}
                  <div className="grid grid-cols-3 gap-2 border-t border-white/[0.07] pt-4 text-xs font-body">
                    <div>
                      <span className="text-[#94a3b8] block text-[10px] uppercase font-semibold">Stake</span>
                      <span className="text-white font-semibold font-mono mt-0.5 block">
                        {dispute.stakeAmount.toFixed(0)} USDC
                      </span>
                    </div>
                    <div>
                      <span className="text-[#94a3b8] block text-[10px] uppercase font-semibold">Reviewers</span>
                      <span className="text-white font-semibold font-mono mt-0.5 block">
                        {dispute.voters.length}/3
                      </span>
                    </div>
                    <div>
                      <span className="text-[#94a3b8] block text-[10px] uppercase font-semibold">Consensus</span>
                      <span className={`font-semibold font-mono mt-0.5 block uppercase ${
                        dispute.consensus === "reject" 
                          ? "text-[#F7476E]" 
                          : dispute.consensus === "approve" 
                            ? "text-[#00D48B]" 
                            : "text-[#94a3b8]"
                      }`}>
                        {dispute.consensus ? dispute.consensus : "Voting"}
                      </span>
                    </div>
                  </div>

                  {/* Overlying Router Link */}
                  <Link 
                    to={`/disputes/${dispute.id}`} 
                    className="absolute inset-0 z-10" 
                    aria-label={`View dispute detail for case: ${dispute.title}`}
                  />
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </WalletGate>
  );
}
