import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSignTypedData } from "wagmi";
import { parseUnits, getAddress, hexToSignature } from "viem";
import { 
  ArrowLeft, 
  Clock, 
  CheckCircle, 
  ExternalLink, 
  ShieldAlert, 
  Scale, 
  MessageSquare, 
  ThumbsUp, 
  ThumbsDown, 
  Coins,
  PenTool
} from "lucide-react";
import { 
  getDisputeById, 
  getPersonaDetails, 
  submitVote, 
  truncateAddress, 
  getArcExplorerUrl,
  DEFAULT_REVIEWERS,
  REQUIRED_VOTES_FOR_CONSENSUS 
} from "../firebase/db";
import CountdownButton from "../components/CountdownButton";
import WalletGate from "../components/WalletGate";

// Protocol treasury address for reviewer nanopayments (checksummed)
const PROTOCOL_TREASURY = getAddress("0x89d22efdc476f57134371c80e1a686db156291c7");
const USDC_CONTRACT_ADDRESS = getAddress("0x3600000000000000000000000000000000000000");

// EIP-3009 transferWithAuthorization ABI
const transferWithAuthorizationABI = [
  {
    name: 'transferWithAuthorization',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'validAfter', type: 'uint256' },
      { name: 'validBefore', type: 'uint256' },
      { name: 'nonce', type: 'bytes32' },
      { name: 'v', type: 'uint8' },
      { name: 'r', type: 'bytes32' },
      { name: 's', type: 'bytes32' }
    ],
    outputs: []
  }
];

// EIP-712 domain for USDC on Arc Testnet (chainId 5042002)
const USDC_EIP712_DOMAIN = {
  name: 'USD Coin',
  version: '2',
  chainId: 5042002,
  verifyingContract: USDC_CONTRACT_ADDRESS
};

// EIP-712 types for TransferWithAuthorization (EIP-3009)
const TRANSFER_WITH_AUTHORIZATION_TYPES = {
  TransferWithAuthorization: [
    { name: 'from', type: 'address' },
    { name: 'to', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'validAfter', type: 'uint256' },
    { name: 'validBefore', type: 'uint256' },
    { name: 'nonce', type: 'bytes32' }
  ]
};

// Generate a random 32-byte nonce for EIP-3009 (non-sequential, per spec)
function generateEIP3009Nonce() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return '0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

export default function DisputeDetail() {
  const { id } = useParams();
  const { address } = useAccount();
  const [dispute, setDispute] = useState(null);
  const [persona, setPersona] = useState(() => getPersonaDetails(address));
  const [voteSelection, setVoteSelection] = useState(null);
  const [justification, setJustification] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // EIP-3009 nanopayment state
  const [isVoting, setIsVoting] = useState(false);
  const [voteStatusMessage, setVoteStatusMessage] = useState("");
  const [confirmedVoteTxHash, setConfirmedVoteTxHash] = useState(null);

  // Wagmi hooks for EIP-3009 flow
  const { signTypedDataAsync } = useSignTypedData();
  const { writeContractAsync, data: voteTxHash } = useWriteContract();
  const { isSuccess: isVoteTxConfirmed, error: voteConfirmError } = useWaitForTransactionReceipt({
    hash: voteTxHash,
  });

  // Pending vote data (saved while waiting for tx confirmation)
  const [pendingVote, setPendingVote] = useState(null);

  const loadDispute = async () => {
    const data = await getDisputeById(id);
    setDispute(data);
  };

  useEffect(() => {
    loadDispute();
    setPersona(getPersonaDetails(address));
  }, [id, address]);

  useEffect(() => {
    const handleDb = () => {
      loadDispute();
      setPersona(getPersonaDetails(address));
    };
    window.addEventListener("verdictDbUpdated", handleDb);
    return () => {
      window.removeEventListener("verdictDbUpdated", handleDb);
    };
  }, [address]);

  const handleVoteSubmit = async () => {
    if (!voteSelection) {
      setError("Please select either Approve or Reject.");
      return;
    }
    if (!justification.trim() || justification.trim().length < 10) {
      setError("Please write a detailed justification (minimum 10 characters).");
      return;
    }

    setError("");
    setIsVoting(true);

    try {
      // === STEP 1: EIP-3009 Off-chain Signature (GASLESS for reviewer) ===
      setVoteStatusMessage("Step 1/2: Sign payment authorization (gasless)...");

      const nonce = generateEIP3009Nonce();
      const nanopaymentAmount = parseUnits("0.01", 6); // $0.01 USDC
      const validAfter = 0n; // valid immediately
      const validBefore = BigInt(Math.floor(Date.now() / 1000) + 3600); // expires in 1 hour

      const message = {
        from: address,
        to: PROTOCOL_TREASURY,
        value: nanopaymentAmount,
        validAfter,
        validBefore,
        nonce
      };

      // Sign EIP-712 typed data — MetaMask shows a signature popup (no gas)
      const signature = await signTypedDataAsync({
        domain: USDC_EIP712_DOMAIN,
        types: TRANSFER_WITH_AUTHORIZATION_TYPES,
        primaryType: 'TransferWithAuthorization',
        message
      });

      // Split signature into v, r, s for the contract call
      const { v, r, s } = hexToSignature(signature);

      // === STEP 2: Submit authorization on-chain ===
      setVoteStatusMessage("Step 2/2: Submitting authorization on-chain...");

      await writeContractAsync({
        address: USDC_CONTRACT_ADDRESS,
        abi: transferWithAuthorizationABI,
        functionName: 'transferWithAuthorization',
        args: [
          address,           // from (signer)
          PROTOCOL_TREASURY, // to (protocol treasury)
          nanopaymentAmount, // value ($0.01 USDC)
          validAfter,        // validAfter (0 = immediate)
          validBefore,       // validBefore (1 hour window)
          nonce,             // random 32-byte nonce
          Number(v),         // signature v
          r,                 // signature r
          s                  // signature s
        ]
      });

      // Save vote data to finalize after tx confirmation
      setPendingVote({ vote: voteSelection, justification });
      setVoteStatusMessage("Authorization submitted! Waiting for block confirmation...");
    } catch (e) {
      console.error("EIP-3009 nanopayment failed", e);
      const msg = e?.shortMessage || e?.message || "Nanopayment authorization failed.";
      setError(msg);
      setIsVoting(false);
      setVoteStatusMessage("");
    }
  };

  // Step 3: After on-chain confirmation, record the vote in the database
  useEffect(() => {
    if (isVoteTxConfirmed && voteTxHash && pendingVote && isVoting) {
      const finalizeVote = async () => {
        try {
          setVoteStatusMessage("Payment settled! Recording vote...");
          await submitVote(dispute.id, pendingVote.vote, pendingVote.justification, address);
          
          setConfirmedVoteTxHash(voteTxHash);
          setSuccess(true);
          setVoteSelection(null);
          setJustification("");
          setPendingVote(null);
          setIsVoting(false);
          setVoteStatusMessage("");
          setTimeout(() => setSuccess(false), 10000);
        } catch (e) {
          setError(e.message || "Failed to record vote.");
          setIsVoting(false);
          setVoteStatusMessage("");
          setPendingVote(null);
        }
      };
      finalizeVote();
    }
  }, [isVoteTxConfirmed, voteTxHash, pendingVote, isVoting]);

  // Handle on-chain confirmation errors
  useEffect(() => {
    if (voteConfirmError && isVoting) {
      setError(voteConfirmError.shortMessage || voteConfirmError.message || "Authorization settlement failed.");
      setIsVoting(false);
      setVoteStatusMessage("");
      setPendingVote(null);
    }
  }, [voteConfirmError, isVoting]);


  if (!dispute) {
    return (
      <div className="p-8 text-center text-[#94a3b8] font-body">
        <Scale className="h-8 w-8 text-[#4F6EF7] animate-spin mx-auto mb-3" />
        <span>Loading dispute details...</span>
      </div>
    );
  }

  const isResolved = dispute.status === "resolved";
  const userHasVoted = dispute.voters.includes(persona.id);
  const isReviewerPersona = persona.role === "reviewer";

  // Build reviewer lookup from actual DEFAULT_REVIEWERS data
  const reviewersMap = {};
  DEFAULT_REVIEWERS.forEach(r => {
    reviewersMap[r.id] = {
      name: r.address && r.address.startsWith("0x") && !r.address.includes("Deactivated")
        ? truncateAddress(r.address)
        : r.name,
      avatar: r.avatar,
      specialty: r.specialty
    };
  });

  return (
    <WalletGate>
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="p-6 md:p-8 max-w-5xl mx-auto space-y-8"
      >
        {/* Back Button & Explorer link */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Link 
            to="/disputes" 
            className="flex items-center space-x-2 text-xs font-body font-semibold text-[#94a3b8] hover:text-white transition-colors duration-200"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to disputes board</span>
          </Link>
          <a 
            href={getArcExplorerUrl(dispute.txHash)} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center space-x-1 text-xs font-mono text-[#4F6EF7] hover:text-[#4F6EF7]/80"
          >
            <span>Staking Tx: {truncateAddress(dispute.txHash)}</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        {/* Ruling Reveal Banner */}
        <AnimatePresence>
          {isResolved && (
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              transition={{ type: "spring", stiffness: 100, damping: 15 }}
              className={`border rounded-xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 overflow-hidden relative no-shadow ${
                dispute.consensus === "reject" 
                  ? "bg-[#F7476E]/10 border-[#F7476E]/30 text-[#F7476E]" 
                  : "bg-[#00D48B]/10 border-[#00D48B]/30 text-[#00D48B]"
              }`}
            >
              <div className="absolute inset-0 bg-grid opacity-5 pointer-events-none" />
              <div className="flex items-center space-x-4 z-10">
                <span className="text-4xl">⚖️</span>
                <div>
                  <h2 className="font-headline font-extrabold text-lg md:text-xl uppercase tracking-wider">
                    RULING ESTABLISHED: CASE {dispute.consensus === "reject" ? "REJECTED" : "APPROVED"}
                  </h2>
                  <p className="font-body text-xs text-[#94a3b8] mt-1 max-w-xl">
                    {dispute.consensus === "reject" 
                      ? "The expert jury ruled 2-1 in favor of the Submitter. Hardcoding of AWS credentials was found to be a severe security protocol leak. Stake funds redistributed." 
                      : "The expert jury ruled that the AI outputs did not violate protocol instructions. The Submitter stake escrow was slashed and distributed to reviewers."
                    }
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 z-10">
                <span className="font-mono text-2xl font-black">
                  {Object.values(dispute.votes).filter(v => v === "reject").length} R - {Object.values(dispute.votes).filter(v => v === "approve").length} A
                </span>
                <span className="text-xs font-body bg-white/[0.07] text-[#94a3b8] px-3 py-1 rounded-full font-semibold">
                  Consensus Secured
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase flex items-center gap-1 ${
              isResolved 
                ? "bg-[#00D48B]/10 border-[#00D48B]/20 text-[#00D48B]" 
                : "bg-[#F5A623]/10 border-[#F5A623]/20 text-[#F5A623] animate-pulse-pending"
            }`}>
              {isResolved ? <CheckCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
              {dispute.status}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-white/[0.07] pt-4 text-xs font-body">
            <div>
              <span className="text-[#94a3b8] block uppercase text-[10px] font-semibold">Staked Escrow</span>
              <span className="text-white font-mono font-bold text-sm mt-0.5 block">
                {dispute.stakeAmount.toFixed(2)} USDC
              </span>
            </div>
            <div>
              <span className="text-[#94a3b8] block uppercase text-[10px] font-semibold">Review Status</span>
              <span className="text-white font-mono font-bold text-sm mt-0.5 block">
                {dispute.voters.length} / {REQUIRED_VOTES_FOR_CONSENSUS} Reviewers
              </span>
            </div>
            <div>
              <span className="text-[#94a3b8] block uppercase text-[10px] font-semibold">Submitted Date</span>
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

        {/* Compare Output Section */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Parameters / Prompt */}
          <div className="bg-white/[0.04] backdrop-blur-md border border-white/[0.07] rounded-[14px] p-6 space-y-4">
            <h3 className="font-headline font-bold text-xs text-white uppercase tracking-wider border-b border-white/[0.07] pb-2">
              AI Agent Input Parameters (Prompt)
            </h3>
            <div className="bg-white/[0.02] border border-white/[0.07] rounded-lg p-4 font-mono text-xs text-[#94a3b8] whitespace-pre-wrap max-h-42 overflow-y-auto">
              {dispute.prompt}
            </div>
          </div>

          {/* Expected Behavior */}
          <div className="bg-white/[0.04] backdrop-blur-md border border-white/[0.07] rounded-[14px] p-6 space-y-4">
            <h3 className="font-headline font-bold text-xs text-white uppercase tracking-wider border-b border-white/[0.07] pb-2">
              Expected Behavior / Rules Violated
            </h3>
            <div className="bg-white/[0.02] border border-white/[0.07] rounded-lg p-4 font-body text-xs text-[#94a3b8] whitespace-pre-wrap max-h-42 overflow-y-auto">
              {dispute.expectedOutput}
            </div>
          </div>

          {/* Generated Model Output */}
          <div className="lg:col-span-2 bg-white/[0.04] backdrop-blur-md border border-white/[0.07] rounded-[14px] p-6 space-y-4">
            <h3 className="font-headline font-bold text-xs text-white uppercase tracking-wider border-b border-white/[0.07] pb-2">
              Generated Agent Output (Disputed Code / Text)
            </h3>
            <pre className="bg-white/[0.02] border border-white/[0.07] rounded-lg p-4 font-mono text-xs text-red-400 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-96">
              <code>{dispute.agentOutput}</code>
            </pre>
          </div>

          {/* Evidence Verification */}
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
                      className="text-sm font-mono text-primary hover:underline break-all block"
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
                    <span>View Shared Chat</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Reviewer Panels (Justifications) */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Columns: Historical Reviews */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="font-headline font-bold text-sm text-white uppercase tracking-wider flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-[#4F6EF7]" />
              Jury Justifications ({dispute.voters.length})
            </h2>

            {dispute.voters.length === 0 ? (
              <div className="bg-white/[0.04] border border-white/[0.07] rounded-[14px] p-8 text-center">
                <Scale className="h-6 w-6 text-gray-400 mx-auto mb-2 animate-pulse-pending" />
                <p className="font-body text-xs text-[#94a3b8]">Jury is currently analyzing the claim. No votes cast yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {dispute.voters.map((voterId) => {
                  const voterDetails = reviewersMap[voterId];
                  const vote = dispute.votes[voterId];
                  const comment = dispute.justifications[voterId];
                  const voteLabel = vote === "approve" ? "APPROVE MODEL" : "REJECT MODEL";
                  const isVoterReject = vote === "reject";

                  return (
                    <div key={voterId} className="bg-white/[0.04] border border-white/[0.07] rounded-[14px] p-5 space-y-3">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-3">
                          <span className="text-xl">{voterDetails?.avatar}</span>
                          <div>
                            <div className="font-headline font-bold text-xs text-white">
                              {voterDetails?.name}
                            </div>
                            <span className="font-mono text-[9px] text-[#94a3b8]">
                              Specialist: {voterDetails?.specialty}
                            </span>
                          </div>
                        </div>
                        <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${
                          isVoterReject 
                            ? "bg-[#F7476E]/10 border-[#F7476E]/20 text-[#F7476E]" 
                            : "bg-[#00D48B]/10 border-[#00D48B]/20 text-[#00D48B]"
                        }`}>
                          {voteLabel}
                        </span>
                      </div>
                      <p className="font-body text-xs text-[#94a3b8] leading-relaxed pl-1">
                        "{comment}"
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Vote Panel */}
          <div className="space-y-6">
            <h2 className="font-headline font-bold text-sm text-white uppercase tracking-wider flex items-center gap-2">
              <Scale className="h-4 w-4 text-[#4F6EF7]" />
              Dispute Resolution Workspace
            </h2>

            <div className="bg-white/[0.04] border border-white/[0.07] rounded-[14px] p-6 space-y-6">
              {isResolved ? (
                <div className="text-center py-6 space-y-3 font-body">
                  <CheckCircle className="h-8 w-8 text-[#00D48B] mx-auto" />
                  <h3 className="font-headline font-bold text-xs text-white uppercase tracking-wide">
                    Escrow Settled
                  </h3>
                  <p className="text-xs text-[#94a3b8] leading-relaxed">
                    This dispute has completed voting and has been resolved on the Arc testnet blockchain. 
                    Staking contracts are locked.
                  </p>
                </div>
              ) : userHasVoted ? (
                <div className="text-center py-6 space-y-3 font-body">
                  <CheckCircle className="h-8 w-8 text-[#4F6EF7] mx-auto" />
                  <h3 className="font-headline font-bold text-xs text-white uppercase tracking-wide">
                    Vote Cast
                  </h3>
                  <p className="text-xs text-[#94a3b8] leading-relaxed">
                    You have successfully cast your review. The case is pending responses from remaining jury members.
                  </p>
                </div>
              ) : !isReviewerPersona ? (
                <div className="space-y-4 font-body">
                  <div className="bg-white/[0.02] border border-white/[0.07] p-4 rounded-lg flex items-start gap-3">
                    <ShieldAlert className="h-4 w-4 text-[#F5A623] shrink-0 mt-0.5" />
                    <p className="text-xs text-[#94a3b8] leading-relaxed">
                      You are currently connected as a <strong className="text-white">Submitter</strong>. 
                      Only pre-seeded expert reviewer wallets can vote on active AI agent disputes.
                    </p>
                  </div>
                  
                  <div className="bg-white/[0.02] border border-white/[0.07] p-4 rounded-lg space-y-2">
                    <p className="text-[10px] text-white font-bold">
                      💡 Testing Expert Reviews:
                    </p>
                    <p className="text-[10px] text-[#94a3b8] leading-relaxed">
                      To vote, connect your browser wallet with the authorized reviewer address:
                    </p>
                    <ul className="text-[10px] text-[#94a3b8] font-mono space-y-1 mt-1 pl-2 list-disc">
                      <li>Reviewer: 0x75cc548C8C0470309754d8bB9e5F1E048C639AcB</li>
                    </ul>
                  </div>
                </div>
              ) : (
                // Active Voting Workspace for Reviewers
                <div className="space-y-6 font-body">
                  <div className="bg-white/[0.02] border border-white/[0.07] p-3 rounded-lg space-y-1.5">
                    <div className="flex items-center gap-2 text-xs">
                      <PenTool className="h-4 w-4 text-[#4F6EF7]" />
                      <span className="text-[#94a3b8]">EIP-3009 Nanopayment: <strong className="text-white">$0.01 USDC</strong> per vote</span>
                    </div>
                    <p className="text-[9px] text-[#94a3b8]/70 leading-relaxed pl-6">
                      Step 1: Gasless off-chain signature (no gas fee) → Step 2: On-chain settlement via <code className="text-[#4F6EF7]/80">transferWithAuthorization</code>
                    </p>
                  </div>

                  {/* EIP-3009 flow in progress */}
                  {isVoting && (
                    <div className="bg-[#4F6EF7]/5 border border-[#4F6EF7]/20 rounded-lg p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Scale className="h-4 w-4 text-[#4F6EF7] animate-spin" />
                        <span className="text-xs text-white font-semibold">{voteStatusMessage}</span>
                      </div>
                      {voteTxHash && (
                        <a
                          href={getArcExplorerUrl(voteTxHash)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] font-mono text-[#4F6EF7] hover:underline flex items-center gap-1 break-all"
                        >
                          Settlement Tx: {voteTxHash}
                          <ExternalLink className="h-3 w-3 shrink-0" />
                        </a>
                      )}
                    </div>
                  )}

                  <fieldset disabled={isVoting} className="space-y-6">
                    <div className="space-y-2">
                      <span className="block text-xs font-bold text-[#94a3b8] uppercase tracking-wider">Cast Verdict</span>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => setVoteSelection("approve")}
                          className={`py-2 px-3 border rounded-lg flex items-center justify-center gap-2 font-headline text-xs font-semibold uppercase tracking-wider transition-colors duration-200 cursor-pointer ${
                            voteSelection === "approve" 
                              ? "bg-[#00D48B]/10 border-[#00D48B] text-[#00D48B]" 
                              : "bg-white/[0.02] border-white/[0.07] text-[#94a3b8] hover:text-white"
                          }`}
                        >
                          <ThumbsUp className="h-4 w-4" />
                          Approve Agent
                        </button>
                        <button
                          onClick={() => setVoteSelection("reject")}
                          className={`py-2 px-3 border rounded-lg flex items-center justify-center gap-2 font-headline text-xs font-semibold uppercase tracking-wider transition-colors duration-200 cursor-pointer ${
                            voteSelection === "reject" 
                              ? "bg-[#F7476E]/10 border-[#F7476E] text-[#F7476E]" 
                              : "bg-white/[0.02] border-white/[0.07] text-[#94a3b8] hover:text-white"
                          }`}
                        >
                          <ThumbsDown className="h-4 w-4" />
                          Reject Agent
                        </button>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="vote-justification-textarea" className="block text-xs font-bold text-[#94a3b8] uppercase tracking-wider mb-2">
                        Review Justification
                      </label>
                      <textarea
                        id="vote-justification-textarea"
                        rows="4"
                        value={justification}
                        onChange={(e) => setJustification(e.target.value)}
                        placeholder="Provide professional technical reasoning for your vote (min. 10 chars)..."
                        className="w-full bg-white/[0.02] border border-white/[0.07] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:border-[#4F6EF7]"
                      />
                    </div>

                    {error && (
                      <div className="text-[#F7476E] text-[11px] font-semibold bg-[#F7476E]/10 border border-[#F7476E]/20 p-2.5 rounded-lg">
                        {error}
                      </div>
                    )}

                    {success && (
                      <div className="bg-[#00D48B]/10 border border-[#00D48B]/20 p-3 rounded-lg space-y-2">
                        <div className="text-[#00D48B] text-[11px] font-semibold">
                          ✅ Vote registered via EIP-3009 transferWithAuthorization!
                        </div>
                        {confirmedVoteTxHash && (
                          <a
                            href={getArcExplorerUrl(confirmedVoteTxHash)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] font-mono text-[#4F6EF7] hover:underline flex items-center gap-1 break-all"
                          >
                            Settlement Tx: {confirmedVoteTxHash}
                            <ExternalLink className="h-3 w-3 shrink-0" />
                          </a>
                        )}
                      </div>
                    )}

                    <CountdownButton
                      onComplete={handleVoteSubmit}
                      disabled={!voteSelection || justification.trim().length < 10 || isVoting}
                      label={voteSelection === "approve" ? "Hold to Sign & Cast Approve" : voteSelection === "reject" ? "Hold to Sign & Cast Reject" : "Hold to Sign & Cast Vote"}
                      activeLabel="Signing EIP-3009 Authorization..."
                      completedLabel="Vote Cast!"
                      colorClass={voteSelection === "approve" ? "bg-[#00D48B]" : voteSelection === "reject" ? "bg-[#F7476E]" : "bg-[#4F6EF7]"}
                    />
                  </fieldset>
                </div>
              )}
            </div>
          </div>
        </section>
      </motion.div>
    </WalletGate>
  );
}
