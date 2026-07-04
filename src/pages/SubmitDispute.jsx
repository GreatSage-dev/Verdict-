import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAccount, useBalance } from "wagmi";
import { FilePlus, ShieldAlert, Coins, HelpCircle } from "lucide-react";
import { getPersonaDetails, createDispute } from "../firebase/db";
import CountdownButton from "../components/CountdownButton";
import WalletGate from "../components/WalletGate";

export default function SubmitDispute() {
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const { data: balanceData } = useBalance({ address });
  const [persona, setPersona] = useState(() => getPersonaDetails(address));
  const [form, setForm] = useState({
    title: "",
    agentName: "GPT-4o",
    prompt: "",
    agentOutput: "",
    expectedOutput: "",
    violationType: "Security/PII Leak",
    stakeAmount: "10"
  });
  const [error, setError] = useState("");

  useEffect(() => {
    setPersona(getPersonaDetails(address));
  }, [address]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    if (!form.title.trim()) return "Case Title is required.";
    if (!form.prompt.trim()) return "Agent Prompt input is required.";
    if (!form.agentOutput.trim()) return "Generated Agent Output is required.";
    if (!form.expectedOutput.trim()) return "Expected Behavior is required.";
    
    const stake = parseFloat(form.stakeAmount);
    if (isNaN(stake) || stake < 5) return "Minimum stake amount is 5 USDC.";
    
    const displayBalance = balanceData ? parseFloat(balanceData.formatted) : 0;
    if (stake > displayBalance) return `Insufficient USDC balance. You need ${stake} USDC, but currently have ${displayBalance.toFixed(2)} USDC.`;
    
    return "";
  };

  const validationError = validateForm();

  const handleComplete = async () => {
    const errorMsg = validateForm();
    if (errorMsg) {
      setError(errorMsg);
      return;
    }
    
    setError("");
    try {
      await createDispute(
        form.title,
        form.prompt,
        form.agentOutput,
        form.expectedOutput,
        form.violationType,
        form.stakeAmount,
        address
      );
      navigate("/disputes");
    } catch (e) {
      setError("Failed to create dispute. Check Console.");
      console.error(e);
    }
  };


  return (
    <WalletGate>
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="p-6 md:p-8 max-w-3xl mx-auto space-y-8"
      >
        {/* Page Header */}
        <div>
          <h1 className="font-headline font-extrabold text-2xl md:text-3xl text-white tracking-tight flex items-center gap-3">
            <FilePlus className="h-7 w-7 text-[#4F6EF7]" />
            File AI Agent Dispute
          </h1>
          <p className="font-body text-sm text-[#94a3b8] mt-2">
            Stake USDC to open a dispute case. Three expert reviewers will inspect and vote to resolve the escrow.
          </p>
        </div>

        <div className="bg-white/[0.04] backdrop-blur-md border border-white/[0.07] rounded-[14px] p-6 md:p-8 space-y-6">
          {/* Submitter Alert */}
          {persona.role !== "creator" && (
            <div className="bg-[#F5A623]/10 border border-[#F5A623]/20 text-[#F5A623] rounded-lg p-4 flex gap-3 text-xs leading-relaxed font-body">
              <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">Reviewer Wallet Detected:</strong> You are connected with an expert reviewer account. 
                Reviewers vote on disputes rather than filing them. If you open a case, you will not be allowed to vote on it. 
                The transaction will be registered to your connected wallet.
              </div>
            </div>
          )}

          {/* Balance Display Widget */}
          <div className="bg-white/[0.02] border border-white/[0.07] rounded-[14px] p-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Coins className="h-5 w-5 text-[#4F6EF7]" />
              <div>
                <span className="text-[10px] text-[#94a3b8] font-body uppercase tracking-wider block font-semibold">Your Wallet Balance</span>
                <span className="font-mono text-sm text-white font-bold">
                  {balanceData ? parseFloat(balanceData.formatted).toFixed(2) : "0.00"} USDC
                </span>
              </div>
            </div>
            <span className="font-mono text-[10px] bg-white/[0.07] text-[#94a3b8] px-2 py-0.5 rounded uppercase font-semibold">
              Arc Testnet
            </span>
          </div>

          {/* Form Inputs */}
          <form onSubmit={(e) => e.preventDefault()} className="space-y-6 font-body text-sm">
            {/* Dispute Title */}
            <div>
              <label htmlFor="dispute-title-input" className="block text-xs font-bold text-[#94a3b8] uppercase tracking-wider mb-2">Dispute Title</label>
              <input
                id="dispute-title-input"
                type="text"
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="e.g. Claude 3.5 Sonnet hallucinates AWS S3 package name"
                className="w-full bg-white/[0.02] border border-white/[0.07] rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:border-[#4F6EF7]"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Target AI Agent */}
              <div>
                <label htmlFor="agent-name-select" className="block text-xs font-bold text-[#94a3b8] uppercase tracking-wider mb-2">Target AI Agent</label>
                <select
                  id="agent-name-select"
                  name="agentName"
                  value={form.agentName}
                  onChange={handleChange}
                  className="w-full bg-white/[0.02] border border-white/[0.07] rounded-lg px-4 py-2.5 text-white cursor-pointer"
                >
                  <option value="GPT-4o" className="bg-[#0d0f1a] text-white">GPT-4o</option>
                  <option value="Claude 3.5 Sonnet" className="bg-[#0d0f1a] text-white">Claude 3.5 Sonnet</option>
                  <option value="Gemini 1.5 Pro" className="bg-[#0d0f1a] text-white">Gemini 1.5 Pro</option>
                  <option value="Custom LLM Agent" className="bg-[#0d0f1a] text-white">Custom LLM Agent</option>
                </select>
              </div>

              {/* Violation Type */}
              <div>
                <label htmlFor="violation-type-select" className="block text-xs font-bold text-[#94a3b8] uppercase tracking-wider mb-2">Violation Category</label>
                <select
                  id="violation-type-select"
                  name="violationType"
                  value={form.violationType}
                  onChange={handleChange}
                  className="w-full bg-white/[0.02] border border-white/[0.07] rounded-lg px-4 py-2.5 text-white cursor-pointer"
                >
                  <option value="Security/PII Leak" className="bg-[#0d0f1a] text-white">Security/PII Leak</option>
                  <option value="Hallucination/Malware" className="bg-[#0d0f1a] text-white">Hallucination/Malware</option>
                  <option value="Instruction Alignment" className="bg-[#0d0f1a] text-white">Instruction Alignment</option>
                  <option value="Safety Policy" className="bg-[#0d0f1a] text-white">Safety Policy</option>
                </select>
              </div>
            </div>

            {/* Prompt Inputted */}
            <div>
              <label htmlFor="agent-prompt-textarea" className="block text-xs font-bold text-[#94a3b8] uppercase tracking-wider mb-2">Agent Prompt Input</label>
              <textarea
                id="agent-prompt-textarea"
                name="prompt"
                rows="3"
                value={form.prompt}
                onChange={handleChange}
                placeholder="Paste the exact prompt that triggered the violation..."
                className="w-full bg-white/[0.02] border border-white/[0.07] rounded-lg px-4 py-2.5 text-white font-mono placeholder-gray-600 focus:border-[#4F6EF7]"
              />
            </div>

            {/* Generated Agent Output */}
            <div>
              <label htmlFor="agent-output-textarea" className="block text-xs font-bold text-[#94a3b8] uppercase tracking-wider mb-2">Generated Agent Output</label>
              <textarea
                id="agent-output-textarea"
                name="agentOutput"
                rows="4"
                value={form.agentOutput}
                onChange={handleChange}
                placeholder="Paste the exact code output or conversational response containing the discrepancy..."
                className="w-full bg-white/[0.02] border border-white/[0.07] rounded-lg px-4 py-2.5 text-white font-mono placeholder-gray-600 focus:border-[#4F6EF7]"
              />
            </div>

            {/* Expected Behavior */}
            <div>
              <label htmlFor="expected-output-textarea" className="block text-xs font-bold text-[#94a3b8] uppercase tracking-wider mb-2">Expected Output / Rules Violated</label>
              <textarea
                id="expected-output-textarea"
                name="expectedOutput"
                rows="3"
                value={form.expectedOutput}
                onChange={handleChange}
                placeholder="Explain what the agent should have outputted instead, citing documentation or safety constraints..."
                className="w-full bg-white/[0.02] border border-white/[0.07] rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:border-[#4F6EF7]"
              />
            </div>

            {/* USDC Stake Amount */}
            <div>
              <label htmlFor="stake-amount-input" className="block text-xs font-bold text-[#94a3b8] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                USDC Escrow Stake
                <div className="relative group">
                  <HelpCircle className="h-3.5 w-3.5 text-[#94a3b8] hover:text-white cursor-pointer" />
                  <div className="absolute left-6 bottom-0 hidden group-hover:block bg-[#0d0f1a] border border-white/[0.07] p-3 rounded-lg text-[10px] w-56 leading-normal z-20 text-[#94a3b8]">
                    Minimum stake is 5 USDC. Higher stakes can attract senior reviewers faster. Stakes are fully returned if consensus favors your claim.
                  </div>
                </div>
              </label>
              <div className="relative">
                <input
                  id="stake-amount-input"
                  type="number"
                  name="stakeAmount"
                  min="5"
                  step="1"
                  value={form.stakeAmount}
                  onChange={handleChange}
                  className="w-full bg-white/[0.02] border border-white/[0.07] rounded-lg py-2.5 pl-4 pr-16 text-white font-mono"
                />
                <span className="absolute right-4 top-2.5 text-xs font-mono font-bold text-[#94a3b8] select-none">
                  USDC
                </span>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="text-[#F7476E] text-xs font-semibold bg-[#F7476E]/10 border border-[#F7476E]/20 p-3 rounded-lg">
                Error: {error}
              </div>
            )}

            {/* Action Button */}
            <div className="pt-4">
              <CountdownButton
                onComplete={handleComplete}
                disabled={!!validationError}
                label={`Stake ${form.stakeAmount || 0} USDC & File Dispute`}
                activeLabel="Signing Escrow Stake..."
                completedLabel="Dispute Created!"
              />
              {validationError && (
                <span className="text-[10px] text-[#94a3b8] block text-center mt-2 font-mono">
                  {validationError}
                </span>
              )}
            </div>
          </form>
        </div>
      </motion.div>
    </WalletGate>
  );
}
