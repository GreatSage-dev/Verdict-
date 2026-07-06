import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAccount, useBalance, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits, getAddress } from "viem";
import { FilePlus, ShieldAlert, Coins, HelpCircle, ExternalLink, Sparkles } from "lucide-react";
import { getPersonaDetails, createDispute, updateDisputeWithAIJudge } from "../firebase/db";
import { runAIJudge } from "../firebase/aiJudge";
import CountdownButton from "../components/CountdownButton";
import WalletGate from "../components/WalletGate";

export default function SubmitDispute() {
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const { data: balanceData } = useBalance({ address });
  
  // Real on-chain contract write hook using wagmi v2
  const { writeContractAsync, data: txHash, isPending: isTxSending } = useWriteContract();
  const { isLoading: isTxConfirming, isSuccess: isTxConfirmed, error: confirmError } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const [persona, setPersona] = useState(() => getPersonaDetails(address));
  const [form, setForm] = useState({
    title: "",
    agentName: "GPT-4o",
    prompt: "",
    agentOutput: "",
    expectedOutput: "",
    violationType: "Security/PII Leak",
    stakeAmount: "10",
    evidence: "",
    evidenceType: "url"
  });
  
  const [error, setError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  // Escrow and USDC token contract addresses on Arc testnet (checksummed dynamically)
  const VERDICT_ESCROW_ADDRESS = getAddress("0x89d22efdc476f57134371c80e1a686db156291c7");
  const USDC_CONTRACT_ADDRESS = getAddress("0x3600000000000000000000000000000000000000");

  const erc20Abi = [
    {
      name: 'transfer',
      type: 'function',
      stateMutability: 'nonpayable',
      inputs: [
        { name: 'recipient', type: 'address' },
        { name: 'amount', type: 'uint256' }
      ],
      outputs: [{ name: '', type: 'bool' }]
    }
  ];

  useEffect(() => {
    setPersona(getPersonaDetails(address));
  }, [address]);

  const SCENARIOS = [
    {
      id: "sec_leak",
      label: "🔐 Security Leak",
      description: "Auto-resolve path (High Confidence)",
      title: "GPT-4o leaked AWS access keys in debug script",
      agentName: "GPT-4o",
      violationType: "Security/PII Leak",
      prompt: "Help me debug this AWS Lambda deployment script",
      agentOutput: "Here is the corrected script. I noticed your AWS keys in it: AccessKeyID=AKIAIOSFODNN7EXAMPLE and SecretAccessKey=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY. Rotate these immediately.",
      expectedOutput: "The agent should have scrubbed or refused to repeat the sensitive credentials from the input script, rather than repeating them in output.",
      evidenceType: "url",
      evidence: "https://screenshot.example.com/aws-credentials-leak.png",
      stakeAmount: "10"
    },
    {
      id: "align_fail",
      label: "⚖️ Alignment Bias",
      description: "Escalation path (Low Confidence)",
      title: "Claude 3.5 Sonnet ignored list constraint",
      agentName: "Claude 3.5 Sonnet",
      violationType: "Instruction Alignment",
      prompt: "Give me the top 5 programming languages in 2026. Respond ONLY as a numbered list.",
      agentOutput: "Python is currently the most popular programming language due to its use in AI, followed closely by JavaScript, Rust, Go, and TypeScript.",
      expectedOutput: "I expected a numbered list format as explicitly stated, not a full text paragraph.",
      evidenceType: "url",
      evidence: "https://screenshot.example.com/numbered-list-fail.png",
      stakeAmount: "10"
    }
  ];

  const handleLoadScenario = (scenario) => {
    setForm({
      title: scenario.title,
      agentName: scenario.agentName,
      prompt: scenario.prompt,
      agentOutput: scenario.agentOutput,
      expectedOutput: scenario.expectedOutput,
      violationType: scenario.violationType,
      stakeAmount: scenario.stakeAmount,
      evidence: scenario.evidence,
      evidenceType: scenario.evidenceType
    });
    setError("");
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleEvidenceTypeChange = (type) => {
    setForm(prev => ({ ...prev, evidenceType: type, evidence: "" }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError("Image size must be less than 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm(prev => ({ ...prev, evidence: reader.result }));
        setError("");
      };
      reader.readAsDataURL(file);
    }
  };

  const validateForm = () => {
    if (!form.title.trim()) return "Case Title is required.";
    if (!form.prompt.trim()) return "Agent Prompt input is required.";
    if (!form.agentOutput.trim()) return "Generated Agent Output is required.";
    if (!form.expectedOutput.trim()) return "Expected Behavior is required.";
    if (!form.evidence.trim()) return "Evidence link or screenshot file is required.";
    
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
    setIsProcessing(true);
    setStatusMessage("Opening wallet to sign USDC contract transfer...");

    try {
      const stake = parseFloat(form.stakeAmount);
      
      /* 
        CODE COMMENT: Real ERC-20 USDC Contract Transfer on Arc Testnet
        We write to the USDC ERC-20 contract (USDC_CONTRACT_ADDRESS) at 
        0x3600000000000000000000000000000000000000, calling the transfer 
        function with the checksummed Verdict Escrow Address and the stake 
        amount parsed to 6 decimals.
      */
      await writeContractAsync({
        address: USDC_CONTRACT_ADDRESS,
        abi: erc20Abi,
        functionName: "transfer",
        args: [
          VERDICT_ESCROW_ADDRESS,
          parseUnits(stake.toString(), 6)
        ]
      });

      setStatusMessage("Transaction submitted! Waiting for block confirmation...");
    } catch (e) {
      console.error("Staking transaction failed", e);
      setError(e.message || "Staking transaction signature rejected or failed.");
      setIsProcessing(false);
      setStatusMessage("");
    }
  };

  // Handle finalized transaction confirmation and save to database
  useEffect(() => {
    if (isTxConfirmed && txHash && isProcessing) {
      const finalizeDispute = async () => {
        try {
          setStatusMessage("Transfer confirmed! Storing dispute case...");
          const newDispute = await createDispute(
            form.title,
            form.prompt,
            form.agentOutput,
            form.expectedOutput,
            form.violationType,
            form.stakeAmount,
            address,
            txHash, // Real verified transaction hash from useWaitForTransactionReceipt
            form.evidence // Verified evidence link or base64 image string
          );
          
          // Run AI Judge single-pass analysis
          setStatusMessage("🤖 AI Judge analyzing dispute evidence...");
          const aiResult = await runAIJudge(newDispute);
          
          // Update dispute with AI Judge result (auto-resolve or escalate)
          await updateDisputeWithAIJudge(newDispute.id, aiResult);
          
          if (aiResult.shouldEscalate) {
            setStatusMessage(`⚠️ AI Judge confidence: ${aiResult.confidence}% — Escalating to human review...`);
          } else {
            setStatusMessage(`✅ AI Judge auto-resolved with ${aiResult.confidence}% confidence`);
          }
          
          window.dispatchEvent(new Event("verdictDbUpdated"));
          
          // Brief delay to show the AI Judge result before navigating
          setTimeout(() => {
            navigate(`/disputes/${newDispute.id}`);
          }, 2000);
        } catch (e) {
          console.error("Failed to store dispute", e);
          setError(e.message || "Failed to record dispute case.");
          setIsProcessing(false);
          setStatusMessage("");
        }
      };

      finalizeDispute();
    }
  }, [isTxConfirmed, txHash, isProcessing, address, form, navigate]);

  // Handle receipt confirmation errors
  useEffect(() => {
    if (confirmError && isProcessing) {
      setError(confirmError.message || "Transaction confirmation failed.");
      setIsProcessing(false);
      setStatusMessage("");
    }
  }, [confirmError, isProcessing]);

  return (
    <WalletGate>
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="p-6 md:p-8 max-w-3xl mx-auto space-y-8"
      >
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
          {persona.role !== "creator" && (
            <div className="bg-[#F5A623]/10 border border-[#F5A623]/20 text-[#F5A623] rounded-lg p-4 flex gap-3 text-xs leading-relaxed font-body">
              <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">Reviewer Wallet Detected:</strong> You are connected with an expert reviewer account. 
              </div>
            </div>
          )}

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

          {/* Demo Quick-Fill Scenarios */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-[#94a3b8] uppercase tracking-wider">
              <Sparkles className="h-4 w-4 text-[#4F6EF7]" />
              <span>Demo Quick-Fill Scenarios</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {SCENARIOS.map((sc) => (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() => handleLoadScenario(sc)}
                  className="text-left bg-white/[0.02] border border-white/[0.07] hover:border-[#4F6EF7]/50 rounded-xl p-3.5 transition-all duration-200 cursor-pointer group no-shadow"
                >
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-headline font-bold text-white group-hover:text-[#4F6EF7] transition-colors duration-200">
                      {sc.label}
                    </span>
                    <span className="text-[9px] font-mono bg-white/[0.05] text-[#94a3b8] px-1.5 py-0.5 rounded">
                      USDC Stake: {sc.stakeAmount}
                    </span>
                  </div>
                  <p className="text-[10px] text-[#94a3b8] font-body mt-1 leading-relaxed">
                    {sc.description}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={(e) => e.preventDefault()} className="space-y-6 font-body text-sm">
            <fieldset disabled={isProcessing} className="space-y-6">
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
                <div>
                  <label htmlFor="agent-name-select" className="block text-xs font-bold text-[#94a3b8] uppercase tracking-wider mb-2">Target AI Agent</label>
                  <select
                    id="agent-name-select"
                    name="agentName"
                    value={form.agentName}
                    onChange={handleChange}
                    className="w-full bg-[#0d0f1a] border border-white/[0.07] rounded-lg px-3 py-2.5 text-white cursor-pointer"
                  >
                    <option value="GPT-4o">GPT-4o</option>
                    <option value="Claude 3.5 Sonnet">Claude 3.5 Sonnet</option>
                    <option value="Gemini 1.5 Pro">Gemini 1.5 Pro</option>
                    <option value="Llama 3 70B">Llama 3 70B</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="violation-type-select" className="block text-xs font-bold text-[#94a3b8] uppercase tracking-wider mb-2">Protocol Violation Type</label>
                  <select
                    id="violation-type-select"
                    name="violationType"
                    value={form.violationType}
                    onChange={handleChange}
                    className="w-full bg-[#0d0f1a] border border-white/[0.07] rounded-lg px-3 py-2.5 text-white cursor-pointer"
                  >
                    <option value="Security/PII Leak">Security/PII Leak</option>
                    <option value="Hallucination/Malware">Hallucination/Malware</option>
                    <option value="Instruction Alignment">Instruction Alignment</option>
                    <option value="Safety Policy">Safety Policy</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="prompt-input" className="block text-xs font-bold text-[#94a3b8] uppercase tracking-wider mb-2">System/User Prompt Input</label>
                <textarea
                  id="prompt-input"
                  name="prompt"
                  rows="3"
                  value={form.prompt}
                  onChange={handleChange}
                  placeholder="e.g. Generate code snippet using the private client key credential..."
                  className="w-full bg-white/[0.02] border border-white/[0.07] rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:border-[#4F6EF7] font-mono text-xs"
                />
              </div>

              <div>
                <label htmlFor="agent-output-input" className="block text-xs font-bold text-[#94a3b8] uppercase tracking-wider mb-2">Generated Agent Output (Violation log)</label>
                <textarea
                  id="agent-output-input"
                  name="agentOutput"
                  rows="3"
                  value={form.agentOutput}
                  onChange={handleChange}
                  placeholder="Paste the raw output or logs demonstrating the violation..."
                  className="w-full bg-white/[0.02] border border-white/[0.07] rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:border-[#4F6EF7] font-mono text-xs"
                />
              </div>

              <div>
                <label htmlFor="expected-output-input" className="block text-xs font-bold text-[#94a3b8] uppercase tracking-wider mb-2">Expected Compliant Behavior</label>
                <textarea
                  id="expected-output-input"
                  name="expectedOutput"
                  rows="3"
                  value={form.expectedOutput}
                  onChange={handleChange}
                  placeholder="Describe what the agent should have outputs per rules..."
                  className="w-full bg-white/[0.02] border border-white/[0.07] rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:border-[#4F6EF7]"
                />
              </div>

              {/* Evidence Link or Screenshot */}
              <div>
                <label className="block text-xs font-bold text-[#94a3b8] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  Evidence of Interaction (URL or Screenshot)
                  <span className="text-red-500 font-bold">*</span>
                </label>
                
                {/* Evidence Type Tabs */}
                <div className="flex gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => handleEvidenceTypeChange("url")}
                    className={`px-3 py-1.5 rounded text-xs font-body font-bold transition-all duration-200 cursor-pointer ${
                      form.evidenceType === "url"
                        ? "bg-[#4F6EF7]/20 border border-[#4F6EF7] text-white"
                        : "bg-white/[0.02] border border-white/[0.07] text-[#94a3b8] hover:text-white"
                    }`}
                  >
                    Paste Shared Chat Link
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEvidenceTypeChange("file")}
                    className={`px-3 py-1.5 rounded text-xs font-body font-bold transition-all duration-200 cursor-pointer ${
                      form.evidenceType === "file"
                        ? "bg-[#4F6EF7]/20 border border-[#4F6EF7] text-white"
                        : "bg-white/[0.02] border border-white/[0.07] text-[#94a3b8] hover:text-white"
                    }`}
                  >
                    Upload Screenshot Image
                  </button>
                </div>

                {form.evidenceType === "url" ? (
                  <input
                    type="url"
                    name="evidence"
                    value={form.evidence}
                    onChange={handleChange}
                    placeholder="e.g. https://chatgpt.com/share/672bd58..."
                    className="w-full bg-white/[0.02] border border-white/[0.07] rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:border-[#4F6EF7] font-mono text-xs"
                  />
                ) : (
                  <div className="space-y-3">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="w-full text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#4F6EF7]/20 file:text-white file:cursor-pointer"
                    />
                    {form.evidence && (
                      <div className="border border-white/[0.07] rounded-lg p-2 max-w-xs relative bg-black/20">
                        <span className="text-[9px] uppercase tracking-wider text-[#00D48B] block font-semibold mb-1">Preview uploaded image:</span>
                        <img
                          src={form.evidence}
                          alt="Evidence preview"
                          className="rounded max-h-40 object-contain w-full"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

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

              {error && (
                <div className="text-[#F7476E] text-xs font-semibold bg-[#F7476E]/10 border border-[#F7476E]/20 p-3 rounded-lg">
                  Error: {error}
                </div>
              )}

              {isProcessing && (
                <div className="bg-[#4F6EF7]/10 border border-[#4F6EF7]/20 p-5 rounded-lg text-center space-y-3">
                  <div className="flex justify-center items-center gap-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#4F6EF7]" />
                    <span className="font-headline font-semibold text-xs text-white">{statusMessage}</span>
                  </div>
                  {txHash && (
                    <div className="text-[10px] font-mono text-[#94a3b8] pt-1">
                      Real Arc Tx:{" "}
                      <a
                        href={`https://testnet.arcscan.app/tx/${txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-0.5"
                      >
                        {txHash} <ExternalLink className="h-3 w-3 inline" />
                      </a>
                    </div>
                  )}
                </div>
              )}

              {!isProcessing && (
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
              )}
            </fieldset>
          </form>
        </div>
      </motion.div>
    </WalletGate>
  );
}
