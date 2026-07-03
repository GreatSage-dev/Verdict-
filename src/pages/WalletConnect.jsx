import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Wallet, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Copy, 
  ExternalLink, 
  PlusCircle, 
  Info,
  CheckCircle2
} from "lucide-react";
import { 
  getPersonaDetails, 
  getTransactions, 
  depositUSDC, 
  truncateAddress, 
  getArcExplorerUrl 
} from "../firebase/db";
import { useAccount } from "wagmi";
import WalletGate from "../components/WalletGate";

export default function WalletConnect() {
  const { address } = useAccount();
  const [persona, setPersona] = useState(() => getPersonaDetails(address));
  const [transactions, setTransactions] = useState([]);
  const [depositAmount, setDepositAmount] = useState("100");
  const [isDepositing, setIsDepositing] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [copiedTxId, setCopiedTxId] = useState(null);

  const fetchWalletData = async (userAddress) => {
    if (!userAddress) return;
    setPersona(getPersonaDetails(userAddress));
    const txs = await getTransactions();
    const currentAddress = userAddress.toLowerCase();
    const filteredTxs = txs.filter(
      tx => tx.fromAddress.toLowerCase() === currentAddress || 
            tx.toAddress.toLowerCase() === currentAddress
    ).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    setTransactions(filteredTxs);
  };

  useEffect(() => {
    fetchWalletData(address);
    const handleUpdate = () => fetchWalletData(address);
    window.addEventListener("verdictDbUpdated", handleUpdate);
    return () => {
      window.removeEventListener("verdictDbUpdated", handleUpdate);
    };
  }, [address]);

  const handleCopyAddress = (addr) => {
    if (!addr) return;
    navigator.clipboard.writeText(addr);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const handleCopyTxHash = (hash) => {
    navigator.clipboard.writeText(hash);
    setCopiedTxId(hash);
    setTimeout(() => setCopiedTxId(null), 2000);
  };

  const handleDeposit = async (e) => {
    e.preventDefault();
    if (!depositAmount || parseFloat(depositAmount) <= 0 || !address) return;
    setIsDepositing(true);
    setTimeout(async () => {
      await depositUSDC(depositAmount, address);
      setIsDepositing(false);
      setDepositAmount("100");
    }, 1500);
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
            <Wallet className="h-7 w-7 text-[#4F6EF7]" />
            Circle Programmable Wallet & Faucet
          </h1>
          <p className="font-body text-sm text-[#94a3b8] mt-2">
            Manage your USDC deposits, inspect Arc network transaction logs, and use the faucet to adjust your testnet balance.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Wallet Stats & Deposits */}
          <div className="lg:col-span-1 space-y-6">
            {/* Wallet Card */}
            <div className="bg-white/[0.04] backdrop-blur-md border border-white/[0.07] rounded-[14px] p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <Wallet className="h-28 w-28 text-white" />
              </div>

              <div className="flex justify-between items-start mb-6">
                <div>
                  <span className="font-body text-xs text-[#94a3b8] uppercase tracking-widest font-semibold">Programmable Wallet</span>
                  <h2 className="font-headline font-bold text-white text-lg mt-1">{persona.name}</h2>
                </div>
                <span className="text-2xl">{persona.avatar}</span>
              </div>

              <div className="mb-6">
                <span className="font-body text-xs text-[#94a3b8] block font-semibold">Balance</span>
                <span className="font-headline font-extrabold text-3xl text-white tracking-tight">
                  {persona.balance.toFixed(2)}{" "}
                  <span className="text-xs font-semibold text-[#4F6EF7] font-mono">USDC</span>
                </span>
              </div>

              <div className="pt-4 border-t border-white/[0.07] flex items-center justify-between">
                <div>
                  <span className="font-body text-[10px] text-[#94a3b8] uppercase block font-semibold">Wallet Address</span>
                  <span className="font-mono text-xs text-white select-all block mt-0.5">
                    {truncateAddress(persona.address)}
                  </span>
                </div>
                <button 
                  onClick={() => handleCopyAddress(persona.address)}
                  className="p-2 border border-white/[0.1] rounded-lg hover:border-primary/50 text-gray-400 hover:text-white transition-colors duration-200 cursor-pointer"
                  title="Copy Address"
                >
                  {copiedAddress ? <CheckCircle2 className="h-4 w-4 text-[#00D48B]" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Deposit Form */}
            <div className="bg-white/[0.04] backdrop-blur-md border border-white/[0.07] rounded-[14px] p-6 space-y-4">
              <h3 className="font-headline font-bold text-sm text-white tracking-wide flex items-center gap-2 uppercase">
                <PlusCircle className="h-4 w-4 text-[#4F6EF7]" />
                Deposit Testnet USDC
              </h3>
              <p className="font-body text-xs text-[#94a3b8]">
                Mock Circle programmable wallet deposit to test dispute stakes.
              </p>

              <form onSubmit={handleDeposit} className="space-y-4">
                <div>
                  <label htmlFor="deposit-amount-input" className="block text-xs font-body text-[#94a3b8] mb-1 font-semibold uppercase tracking-wider">USDC Amount</label>
                  <div className="relative">
                    <input
                      id="deposit-amount-input"
                      type="number"
                      min="1"
                      step="1"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      disabled={isDepositing}
                      className="w-full bg-white/[0.02] border border-white/[0.07] rounded-lg py-2.5 pl-4 pr-16 text-sm text-white font-mono"
                      placeholder="100"
                    />
                    <span className="absolute right-4 top-2.5 text-xs font-mono font-bold text-[#94a3b8] select-none">
                      USDC
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isDepositing}
                  className="w-full py-2.5 bg-[#4F6EF7] hover:bg-[#4F6EF7]/80 text-white rounded-lg font-body font-bold text-xs uppercase tracking-wider transition-colors duration-200 flex justify-center items-center cursor-pointer no-shadow"
                >
                  {isDepositing ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Signing Deposit...</span>
                    </div>
                  ) : (
                    "Initiate Circle Transfer"
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Right Column: Transaction Logs */}
          <div className="lg:col-span-2 space-y-6">
            {/* Protocol Info Panel */}
            <div className="bg-white/[0.04] backdrop-blur-md border border-white/[0.07] rounded-[14px] p-6 flex gap-4">
              <Info className="h-6 w-6 text-[#4F6EF7] shrink-0 mt-0.5" />
              <div className="space-y-1.5">
                <h3 className="font-headline font-bold text-sm text-white uppercase tracking-wider">x402 Nanopayments on Arc Network</h3>
                <p className="font-body text-xs text-[#94a3b8] leading-relaxed">
                  Verdict relies on <strong className="text-white">Circle x402 nanopayment channels</strong> deployed natively on the <strong className="text-white">Arc Blockchain Network</strong>. 
                  Submitters stake USDC to open AI audit cases. 3 expert reviewers stake 50 USDC each to vote. 
                  Stakes are aggregated and automatically settled via smart contract logic upon 3-reviewer consensus validation.
                </p>
              </div>
            </div>

            {/* Transactions List */}
            <div className="bg-white/[0.04] backdrop-blur-md border border-white/[0.07] rounded-[14px] overflow-hidden">
              <div className="px-6 py-4 border-b border-white/[0.07] flex justify-between items-center">
                <h3 className="font-headline font-bold text-sm text-white tracking-wide uppercase">
                  Simulated On-Chain Transaction Logs
                </h3>
                <span className="text-[10px] font-mono bg-white/[0.07] text-[#94a3b8] px-2 py-0.5 rounded uppercase font-semibold">
                  Arc Testnet
                </span>
              </div>

              {transactions.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <Wallet className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="font-body text-xs text-[#94a3b8]">No transactions recorded for this address yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-white/[0.07]">
                  {transactions.map((tx) => {
                    const isDeposit = tx.type === "deposit";
                    const isReward = tx.type === "reward";

                    return (
                      <div key={tx.id} className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors duration-200">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-lg border border-white/[0.07] ${
                            isDeposit || isReward 
                              ? "bg-[#00D48B]/10 border-[#00D48B]/20 text-[#00D48B]" 
                              : "bg-[#F7476E]/10 border-[#F7476E]/20 text-[#F7476E]"
                          }`}>
                            {isDeposit || isReward ? (
                              <ArrowDownLeft className="h-4 w-4" />
                            ) : (
                              <ArrowUpRight className="h-4 w-4" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-headline font-bold text-xs text-white uppercase tracking-wider">
                                {tx.type}
                              </span>
                              {tx.disputeId && (
                                <span className="text-[9px] font-mono bg-white/[0.07] text-[#94a3b8] px-1.5 py-0.5 rounded">
                                  ID: {tx.disputeId}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] font-body text-[#94a3b8] mt-1 block font-mono">
                              {new Date(tx.timestamp).toLocaleString()}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col md:items-end gap-1">
                          <span className={`font-mono text-sm font-bold ${
                            isDeposit || isReward ? "text-[#00D48B]" : "text-[#F7476E]"
                          }`}>
                            {isDeposit || isReward ? "+" : "-"}{tx.amount.toFixed(2)} USDC
                          </span>
                          
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-[10px] text-[#94a3b8]">
                              Tx: {truncateAddress(tx.hash)}
                            </span>
                            <button
                              onClick={() => handleCopyTxHash(tx.hash)}
                              className="text-gray-400 hover:text-white transition-colors duration-200 cursor-pointer"
                              title="Copy Tx Hash"
                            >
                              {copiedTxId === tx.hash ? (
                                <span className="text-[8px] text-[#00D48B] font-mono">Copied</span>
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                            <a
                              href={getArcExplorerUrl(tx.hash)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#4F6EF7] hover:text-[#4F6EF7]/80 flex items-center gap-0.5"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </WalletGate>
  );
}
