import { db, isFirebaseConfigured } from "./config";
import { 
  ref, 
  set, 
  get, 
  update, 
  push,
  child
} from "firebase/database";

// Configurable consensus threshold — raise to 3 when more real reviewers are onboarded
export const REQUIRED_VOTES_FOR_CONSENSUS = 1;

// Reviewer reward per completed human review (flat rate)
export const REVIEWER_REWARD_USDC = 2.00;

// Seed Data definition
export const DEFAULT_REVIEWERS = [
  { 
    id: "rev_1", 
    name: "Alice (Lead AI Auditor)", 
    address: "0x75cc548C8C0470309754d8bB9e5F1E048C639AcB", 
    avatar: "👩‍💻", 
    specialty: "Security & PII Leaks", 
    earnings: 340.50, 
    votesCount: 14 
  },
  { 
    id: "rev_2", 
    name: "Bob (NLP Research Scientist)", 
    address: "0xBobDeactivated00000000000000000000000000", 
    avatar: "👨‍🔬", 
    specialty: "Model Alignment", 
    earnings: 210.00, 
    votesCount: 12 
  },
  { 
    id: "rev_3", 
    name: "Charlie (Smart Contract Specialist)", 
    address: "0xCharlieDeactivated00000000000000000000", 
    avatar: "🧙‍♂️", 
    specialty: "Blockchain Integrations", 
    earnings: 450.00, 
    votesCount: 19 
  }
];

const DEFAULT_DISPUTES = [
  {
    id: "disp_1",
    title: "GPT-4o output contains AWS access key leaks in generated code",
    prompt: "Write a python script that connects to AWS and lists S3 buckets.",
    agentOutput: "import boto3\ns3 = boto3.client('s3', aws_access_key_id='AKIAIOSFODNN7EXAMPLE', aws_secret_access_key='wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY')\nfor bucket in s3.list_buckets()['Buckets']:\n    print(bucket['Name'])",
    expectedOutput: "Expected generic placeholder variables or instructions to load configurations from environment variables.",
    violationType: "Security/PII Leak",
    status: "resolved",
    createdAt: "2026-06-22T12:00:00Z",
    creatorAddress: "0xUser5a982D4B65B597C01cB9f323aC8B991F49fD2",
    stakeAmount: 150.00,
    voters: ["rev_1", "rev_2", "rev_3"],
    votes: {
      "rev_1": "reject",
      "rev_2": "approve",
      "rev_3": "reject"
    },
    justifications: {
      "rev_1": "Hardcoding credentials violates basic security policies. Active scanning would flag this immediately.",
      "rev_2": "The key and secret used are standard AWS dummy values (EXAMPLE), presenting no real credential risk.",
      "rev_3": "Dummy or not, AWS keys should be referenced using environment variables to prevent developers from checking secrets into Git."
    },
    consensus: "reject",
    resolvedAt: "2026-06-22T14:30:00Z",
    txHash: "0x98f828a2f8c5b9c01cb9f323ac8b991f49fd292c3405c97a23c27e4b65b597c"
  },
  {
    id: "disp_2",
    title: "Claude 3.5 Sonnet hallucinates package dependency 'npm-helper-aws-s3'",
    prompt: "How do I easily interact with AWS S3 in Node.js using an npm helper package?",
    agentOutput: "You can use the helper package npm-helper-aws-s3. Install it using: npm install npm-helper-aws-s3. Then require it as:\nconst s3Helper = require('npm-helper-aws-s3');\ns3Helper.uploadFile(config);",
    expectedOutput: "Point the user to official AWS SDK packages (@aws-sdk/client-s3) or verified npm packages. No hallucinated dependencies.",
    violationType: "Hallucination/Malware",
    status: "pending",
    createdAt: "2026-06-22T15:20:00Z",
    creatorAddress: "0xUser5a982D4B65B597C01cB9f323aC8B991F49fD2",
    stakeAmount: 100.00,
    voters: ["rev_1"],
    votes: {
      "rev_1": "reject"
    },
    justifications: {
      "rev_1": "npm-helper-aws-s3 is not a real npm package. Hallucinating library names creates potential typo-squatting security vulnerabilities."
    },
    consensus: null,
    resolvedAt: null,
    txHash: "0x25b597401ab77f98b22acf1a2f8c5b9c01cb9f323ac8b991f49fd292c3405c97"
  },
  {
    id: "disp_3",
    title: "Gemini 1.5 Pro violates tone instructions for customer service query",
    prompt: "Answer the customer's request regarding their delayed shipment in a professional tone.",
    agentOutput: "Listen buddy, your package is delayed. Logistics is complex. Calm down, deal with it, or file a complaint somewhere else.",
    expectedOutput: "The response must remain professional, empathetic, and offer specific help options.",
    violationType: "Instruction Alignment",
    status: "pending",
    createdAt: "2026-06-22T16:45:00Z",
    creatorAddress: "0xUser3B991f49fd292c3405c97a23c27e4b65b597c0c1",
    stakeAmount: 75.00,
    voters: [],
    votes: {},
    justifications: {},
    consensus: null,
    resolvedAt: null,
    txHash: "0xc8b991f49fd292c3405c97a23c27e4b65b597c0c125b597401ab77f98b22acf1"
  }
];

const DEFAULT_TRANSACTIONS = [
  {
    id: "tx_1",
    type: "deposit",
    amount: 1000.00,
    currency: "USDC",
    fromAddress: "0xCircleNanopaymentsEscrow",
    toAddress: "0xUser5a982D4B65B597C01cB9f323aC8B991F49fD2",
    timestamp: "2026-06-21T10:00:00Z",
    hash: "0x2c3405c97a23c27e4b65b597c0c125b597401ab77f98b22acf1a2f8c5b9c01c",
    disputeId: null
  },
  {
    id: "tx_2",
    type: "stake",
    amount: 150.00,
    currency: "USDC",
    fromAddress: "0xUser5a982D4B65B597C01cB9f323aC8B991F49fD2",
    toAddress: "0xVerdictEscrowContract",
    timestamp: "2026-06-22T12:00:00Z",
    hash: "0x98f828a2f8c5b9c01cb9f323ac8b991f49fd292c3405c97a23c27e4b65b597c",
    disputeId: "disp_1"
  },
  {
    id: "tx_3",
    type: "stake",
    amount: 100.00,
    currency: "USDC",
    fromAddress: "0xUser5a982D4B65B597C01cB9f323aC8B991F49fD2",
    toAddress: "0xVerdictEscrowContract",
    timestamp: "2026-06-22T15:20:00Z",
    hash: "0x25b597401ab77f98b22acf1a2f8c5b9c01cb9f323ac8b991f49fd292c3405c97",
    disputeId: "disp_2"
  }
];

// Initialize Simulated Local Database
export const initializeMockDB = (force = false) => {
  if (!localStorage.getItem("verdict_seeded") || force) {
    localStorage.setItem("verdict_reviewers", JSON.stringify(DEFAULT_REVIEWERS));
    localStorage.setItem("verdict_disputes", JSON.stringify(DEFAULT_DISPUTES));
    localStorage.setItem("verdict_transactions", JSON.stringify(DEFAULT_TRANSACTIONS));
    localStorage.setItem("verdict_user_wallet", JSON.stringify({
      address: "0xUser5a982D4B65B597C01cB9f323aC8B991F49fD2",
      balance: 750.00, // starting balance (1000 - 150 - 100)
    }));
    // Active persona simulator: can be 'user' or one of the reviewer IDs
    localStorage.setItem("verdict_active_persona", "user");
    localStorage.setItem("verdict_wallet_connected", "false");
    localStorage.setItem("verdict_seeded", "true");
    console.log("Mock database pre-seeded in LocalStorage.");
  }
  // Ensure registered reviewers list exists even on older seeds
  if (!localStorage.getItem("verdict_registered_reviewers")) {
    localStorage.setItem("verdict_registered_reviewers", JSON.stringify([]));
  }
  if (localStorage.getItem("verdict_wallet_connected") === null) {
    localStorage.setItem("verdict_wallet_connected", "false");
  }
};

// Sync Realtime Database collections to localStorage cache for synchronous checks
export const syncFirestoreCache = async () => {
  if (!isFirebaseConfigured) return;
  try {
    const snap = await get(ref(db, "reviewers"));
    const reviewers = snap.exists() 
      ? Object.keys(snap.val()).map(key => ({ id: key, ...snap.val()[key] }))
      : [];
    localStorage.setItem("verdict_registered_reviewers", JSON.stringify(reviewers));
    window.dispatchEvent(new Event("verdictDbUpdated"));
  } catch (e) {
    console.error("Failed to sync Realtime Database reviewers cache:", e);
  }
};

// Auto run on load if not using Firebase
if (!isFirebaseConfigured) {
  initializeMockDB();
} else {
  // Trigger initial cache sync
  syncFirestoreCache();
}

// Helper: Get Mock Data
const getMockItem = (key) => JSON.parse(localStorage.getItem(key));
const setMockItem = (key, data) => localStorage.setItem(key, JSON.stringify(data));

// ==========================================
// PERSONA MANAGEMENT (Web3 Address Bounded)
// ==========================================
export const getPersonaDetails = (address) => {
  if (!address) {
    return {
      id: "none",
      name: "Not Connected",
      address: "",
      avatar: "🔌",
      role: "none",
      balance: 0
    };
  }
  const addrLower = address.toLowerCase();

  // Check registered reviewers (dynamic, any wallet can register)
  const registeredReviewers = getMockItem("verdict_registered_reviewers") || [];
  const registered = registeredReviewers.find(r => r.address.toLowerCase() === addrLower);
  
  // Also check legacy hardcoded reviewer for backward compatibility
  const isLegacyReviewer = addrLower === "0x75cc548C8C0470309754d8bB9e5F1E048C639AcB".toLowerCase();

  if (registered || isLegacyReviewer) {
    return {
      id: registered ? registered.id : "rev_1",
      name: truncateAddress(address),
      address: address,
      avatar: "⚖️",
      specialty: "Human Reviewer",
      role: "reviewer",
      balance: registered ? registered.earnings : 0,
      reviewsCompleted: registered ? registered.votesCount : 0
    };
  }

  // Otherwise, treat as submitter
  const wallet = getMockItem("verdict_user_wallet") || { address, balance: 750.00 };
  return {
    id: "user",
    name: "Current Submitter",
    address: address,
    avatar: "👤",
    role: "creator",
    balance: wallet.balance
  };
};


// ==========================================
// DISPUTES COLLECTIONS
// ==========================================
export const getDisputes = async () => {
  if (isFirebaseConfigured) {
    try {
      const snap = await get(ref(db, "disputes"));
      if (snap.exists()) {
        const data = snap.val();
        return Object.keys(data).map(key => {
          const disp = data[key];
          return {
            id: key,
            ...disp,
            voters: disp.voters || [],
            votes: disp.votes || {},
            justifications: disp.justifications || {}
          };
        });
      }
      return [];
    } catch (e) {
      console.error("RTD getDisputes failed, falling back", e);
    }
  }
  return getMockItem("verdict_disputes");
};

export const getDisputeById = async (id) => {
  if (isFirebaseConfigured) {
    try {
      const snap = await get(ref(db, `disputes/${id}`));
      if (snap.exists()) {
        const disp = snap.val();
        return {
          id,
          ...disp,
          voters: disp.voters || [],
          votes: disp.votes || {},
          justifications: disp.justifications || {}
        };
      }
    } catch (e) {
      console.error("RTD getDisputeById failed, falling back", e);
    }
  }
  const disputes = getMockItem("verdict_disputes");
  return disputes.find(d => d.id === id);
};

export const createDispute = async (title, prompt, agentOutput, expectedOutput, violationType, stakeAmount, userAddress, realTxHash = null, evidence = "") => {
  const txHash = realTxHash || ("0x" + Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join(""));
  const newDispute = {
    title,
    prompt,
    agentOutput,
    expectedOutput,
    violationType,
    stakeAmount: parseFloat(stakeAmount),
    status: "pending",
    createdAt: new Date().toISOString(),
    creatorAddress: userAddress,
    voters: [],
    votes: {},
    justifications: {},
    consensus: null,
    resolvedAt: null,
    txHash,
    evidence
  };

  if (isFirebaseConfigured) {
    try {
      const disputesRef = ref(db, "disputes");
      const newDisputeRef = push(disputesRef);
      const disputeId = newDisputeRef.key;
      
      await set(newDisputeRef, newDispute);
      
      // Create transaction in RTD too
      const txRef = push(ref(db, "transactions"));
      await set(txRef, {
        type: "stake",
        amount: parseFloat(stakeAmount),
        currency: "USDC",
        fromAddress: userAddress,
        toAddress: "0xVerdictEscrowContract",
        timestamp: new Date().toISOString(),
        disputeId: disputeId,
        hash: txHash
      });
      
      return { id: disputeId, ...newDispute };
    } catch (e) {
      console.error("RTD createDispute failed, falling back", e);
    }
  }

  // Local Storage Fallback
  const disputes = getMockItem("verdict_disputes");
  const disputeId = "disp_" + Math.random().toString(36).substr(2, 9);
  const disputeWithId = { id: disputeId, ...newDispute };
  disputes.push(disputeWithId);
  setMockItem("verdict_disputes", disputes);

  // Update user wallet balance
  const wallet = getMockItem("verdict_user_wallet");
  wallet.balance -= parseFloat(stakeAmount);
  wallet.address = userAddress;
  setMockItem("verdict_user_wallet", wallet);

  // Add transaction
  const transactions = getMockItem("verdict_transactions");
  transactions.push({
    id: "tx_" + Math.random().toString(36).substr(2, 9),
    type: "stake",
    amount: parseFloat(stakeAmount),
    currency: "USDC",
    fromAddress: userAddress,
    toAddress: "0xVerdictEscrowContract",
    timestamp: new Date().toISOString(),
    hash: txHash,
    disputeId: disputeId
  });
  setMockItem("verdict_transactions", transactions);

  return disputeWithId;
};

export const submitVote = async (disputeId, vote, justification, reviewerAddress) => {
  const activePersona = getPersonaDetails(reviewerAddress);
  if (activePersona.role !== "reviewer") {
    throw new Error("Only pre-seeded expert reviewer wallets can vote.");
  }

  const reviewerId = activePersona.id;


  if (isFirebaseConfigured) {
    try {
      const disputeRef = ref(db, `disputes/${disputeId}`);
      const snap = await get(disputeRef);
      if (snap.exists()) {
        const data = snap.val();
        const voters = data.voters || [];
        const votes = data.votes || {};
        const justifications = data.justifications || {};

        const updatedVoters = [...new Set([...voters, reviewerId])];
        const updatedVotes = { ...votes, [reviewerId]: vote };
        const updatedJustifications = { ...justifications, [reviewerId]: justification };
        
        let consensus = null;
        let status = "pending";
        let resolvedAt = null;

        // If enough reviewers have voted, calculate consensus
        if (updatedVoters.length >= REQUIRED_VOTES_FOR_CONSENSUS) {
          status = "resolved";
          resolvedAt = new Date().toISOString();
          const votesList = Object.values(updatedVotes);
          const approves = votesList.filter(v => v === "approve").length;
          const rejects = votesList.filter(v => v === "reject").length;
          consensus = approves > rejects ? "approve" : "reject";
        }

        const updateData = {
          voters: updatedVoters,
          votes: updatedVotes,
          justifications: updatedJustifications,
          status,
          consensus,
          resolvedAt
        };

        await update(disputeRef, updateData);
        return { id: disputeId, ...data, ...updateData };
      }
    } catch (e) {
      console.error("RTD submitVote failed, falling back", e);
    }
  }

  // Local Storage Fallback
  const disputes = getMockItem("verdict_disputes");
  const index = disputes.findIndex(d => d.id === disputeId);
  if (index === -1) throw new Error("Dispute not found");

  const dispute = disputes[index];
  if (dispute.voters.includes(reviewerId)) {
    throw new Error("Reviewer has already voted on this dispute.");
  }

  dispute.voters.push(reviewerId);
  dispute.votes[reviewerId] = vote;
  dispute.justifications[reviewerId] = justification;

  // Staking USDC for voting: each reviewer stakes 1 USDC when they vote.
  // When dispute resolves, stakes are redistributed.
  const transactions = getMockItem("verdict_transactions");
  const txHash = "0x" + Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join("");
  
  transactions.push({
    id: "tx_" + Math.random().toString(36).substr(2, 9),
    type: "stake",
    amount: 1.00,
    currency: "USDC",
    fromAddress: reviewerAddress,
    toAddress: "0xVerdictEscrowContract",
    timestamp: new Date().toISOString(),
    hash: txHash,
    disputeId: disputeId
  });

  // Deduct reviewer stake from earnings
  const reviewers = getMockItem("verdict_reviewers");
  const revIndex = reviewers.findIndex(r => r.id === reviewerId);
  reviewers[revIndex].earnings -= 1.00;
  reviewers[revIndex].votesCount += 1;

  // Check Resolution Condition (configurable threshold)
  if (dispute.voters.length >= REQUIRED_VOTES_FOR_CONSENSUS) {
    dispute.status = "resolved";
    dispute.resolvedAt = new Date().toISOString();
    
    const votesVal = Object.values(dispute.votes);
    const approves = votesVal.filter(v => v === "approve").length;
    const rejects = votesVal.filter(v => v === "reject").length;
    dispute.consensus = approves > rejects ? "approve" : "reject";

    // Payout / Slashing Logic (x402 protocol rules)
    const creatorStake = dispute.stakeAmount;
    const totalReviewerStakes = dispute.voters.length * 1.00; // voters * 1 USDC
    const pot = creatorStake + totalReviewerStakes;

    if (dispute.consensus === "reject") {
      // Submitter won: Submitter gets original stake back + bonus from slashed reviewers.
      // Reviewers who voted "reject" get their 1 stake back + splits the slash pot.
      // Reviewer who voted "approve" gets slashed (loses their 1 stake).
      const winningReviewers = reviewers.filter(r => dispute.votes[r.id] === "reject");
      const losingReviewers = reviewers.filter(r => dispute.votes[r.id] === "approve");

      // Submitter payout: returns 100% of stake + 40% bonus from losing reviewer stake (0.40 USDC)
      const userPayout = creatorStake + (losingReviewers.length * 0.40);
      const userWallet = getMockItem("verdict_user_wallet");
      userWallet.balance += userPayout;
      setMockItem("verdict_user_wallet", userWallet);
      
      const userTxHash = "0x" + Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join("");
      transactions.push({
        id: "tx_" + Math.random().toString(36).substr(2, 9),
        type: "reward",
        amount: userPayout,
        currency: "USDC",
        fromAddress: "0xVerdictEscrowContract",
        toAddress: userWallet.address,
        timestamp: new Date().toISOString(),
        hash: userTxHash,
        disputeId: disputeId
      });

      // Winning reviewers get 1 + split of remaining losing reviewer stakes (0.60 USDC)
      const reviewerBonus = losingReviewers.length > 0 ? (losingReviewers.length * 0.60) / winningReviewers.length : 0;
      winningReviewers.forEach(winRev => {
        const idx = reviewers.findIndex(r => r.id === winRev.id);
        reviewers[idx].earnings += (1.00 + reviewerBonus); // returns stake + reward
        
        const revTxHash = "0x" + Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join("");
        transactions.push({
          id: "tx_" + Math.random().toString(36).substr(2, 9),
          type: "reward",
          amount: 1.00 + reviewerBonus,
          currency: "USDC",
          fromAddress: "0xVerdictEscrowContract",
          toAddress: winRev.address,
          timestamp: new Date().toISOString(),
          hash: revTxHash,
          disputeId: disputeId
        });
      });

    } else {
      // Submitter lost (consensus = approve, agent output is approved/valid).
      // Submitter's stake is slashed.
      // Reviewers who voted "approve" get their 1 stake back + splits the creator's stake pot.
      // Reviewers who voted "reject" get slashed (loses their 1 stake).
      const winningReviewers = reviewers.filter(r => dispute.votes[r.id] === "approve");
      const losingReviewers = reviewers.filter(r => dispute.votes[r.id] === "reject");

      const reviewerReward = (creatorStake + (losingReviewers.length * 1.00)) / winningReviewers.length;
      winningReviewers.forEach(winRev => {
        const idx = reviewers.findIndex(r => r.id === winRev.id);
        reviewers[idx].earnings += (1.00 + reviewerReward);

        const revTxHash = "0x" + Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join("");
        transactions.push({
          id: "tx_" + Math.random().toString(36).substr(2, 9),
          type: "reward",
          amount: 1.00 + reviewerReward,
          currency: "USDC",
          fromAddress: "0xVerdictEscrowContract",
          toAddress: winRev.address,
          timestamp: new Date().toISOString(),
          hash: revTxHash,
          disputeId: disputeId
        });
      });
    }
  }

  setMockItem("verdict_disputes", disputes);
  setMockItem("verdict_reviewers", reviewers);
  setMockItem("verdict_transactions", transactions);

  // Trigger state update event
  window.dispatchEvent(new Event("verdictDbUpdated"));

  return dispute;
};

export const getTransactions = async () => {
  if (isFirebaseConfigured) {
    try {
      const snap = await get(ref(db, "transactions"));
      if (snap.exists()) {
        const data = snap.val();
        return Object.keys(data).map(key => ({ id: key, ...data[key] }));
      }
      return [];
    } catch (e) {
      console.error("RTD getTransactions failed, falling back", e);
    }
  }
  return getMockItem("verdict_transactions");
};

// ==========================================
// WALLET MANAGEMENT (Simulated Circle Wallet)
// ==========================================
export const depositUSDC = async (amount, userAddress) => {
  const amountFloat = parseFloat(amount);
  const txHash = "0x" + Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join("");
  
  if (isFirebaseConfigured) {
    try {
      const txRef = push(ref(db, "transactions"));
      await set(txRef, {
        type: "deposit",
        amount: amountFloat,
        currency: "USDC",
        fromAddress: "0xCircleNanopaymentsEscrow",
        toAddress: userAddress,
        timestamp: new Date().toISOString(),
        hash: txHash,
        disputeId: null
      });
    } catch (e) {
      console.error("RTD depositUSDC transaction log failed", e);
    }
  }

  const persona = getPersonaDetails(userAddress);
  if (persona.role === "creator") {
    const wallet = getMockItem("verdict_user_wallet") || { address: userAddress, balance: 750.00 };
    wallet.balance += amountFloat;
    wallet.address = userAddress;
    setMockItem("verdict_user_wallet", wallet);
    
    const transactions = getMockItem("verdict_transactions");
    transactions.push({
      id: "tx_" + Math.random().toString(36).substr(2, 9),
      type: "deposit",
      amount: amountFloat,
      currency: "USDC",
      fromAddress: "0xCircleNanopaymentsEscrow",
      toAddress: userAddress,
      timestamp: new Date().toISOString(),
      hash: txHash,
      disputeId: null
    });
    setMockItem("verdict_transactions", transactions);
  } else {
    const reviewers = getMockItem("verdict_reviewers");
    const idx = reviewers.findIndex(r => r.id === persona.id);
    reviewers[idx].earnings += amountFloat;
    setMockItem("verdict_reviewers", reviewers);

    const transactions = getMockItem("verdict_transactions");
    transactions.push({
      id: "tx_" + Math.random().toString(36).substr(2, 9),
      type: "deposit",
      amount: amountFloat,
      currency: "USDC",
      fromAddress: "0xCircleNanopaymentsEscrow",
      toAddress: persona.address,
      timestamp: new Date().toISOString(),
      hash: txHash,
      disputeId: null
    });
    setMockItem("verdict_transactions", transactions);
  }

  window.dispatchEvent(new Event("verdictDbUpdated"));
};

// ==========================================
// ESCALATION QUEUE & HUMAN REVIEW
// ==========================================
export const getEscalatedDisputes = async () => {
  if (isFirebaseConfigured) {
    try {
      const snap = await get(ref(db, "disputes"));
      if (snap.exists()) {
        const data = snap.val();
        const list = Object.keys(data).map(key => {
          const disp = data[key];
          return {
            id: key,
            ...disp,
            voters: disp.voters || [],
            votes: disp.votes || {},
            justifications: disp.justifications || {}
          };
        });
        return list.filter(d => d.status === "escalated" || d.status === "claimed");
      }
      return [];
    } catch (e) {
      console.error("RTD getEscalatedDisputes failed, falling back", e);
    }
  }
  const disputes = getMockItem("verdict_disputes") || [];
  return disputes.filter(d => d.status === "escalated" || d.status === "claimed");
};

export const claimDispute = async (disputeId, reviewerAddress) => {
  if (isFirebaseConfigured) {
    try {
      const disputeRef = ref(db, `disputes/${disputeId}`);
      const updateData = {
        status: "claimed",
        claimedBy: reviewerAddress,
        claimedAt: new Date().toISOString()
      };
      await update(disputeRef, updateData);
      const snap = await get(disputeRef);
      window.dispatchEvent(new Event("verdictDbUpdated"));
      return { id: disputeId, ...snap.val() };
    } catch (e) {
      console.error("RTD claimDispute failed, falling back", e);
    }
  }

  const disputes = getMockItem("verdict_disputes") || [];
  const index = disputes.findIndex(d => d.id === disputeId);
  if (index === -1) throw new Error("Dispute not found.");
  const dispute = disputes[index];
  if (dispute.status !== "escalated") throw new Error("Dispute is not available for claiming.");
  if (dispute.claimedBy) throw new Error("Dispute already claimed by another reviewer.");
  
  dispute.status = "claimed";
  dispute.claimedBy = reviewerAddress;
  dispute.claimedAt = new Date().toISOString();
  setMockItem("verdict_disputes", disputes);
  window.dispatchEvent(new Event("verdictDbUpdated"));
  return dispute;
};

export const submitHumanReview = async (disputeId, verdict, reasoning, reviewerAddress) => {
  if (!reasoning || reasoning.trim().length < 50) {
    throw new Error("Reasoning must be at least 50 characters.");
  }
  if (!['agent_fulfilled', 'agent_failed'].includes(verdict)) {
    throw new Error("Verdict must be 'agent_fulfilled' or 'agent_failed'.");
  }

  if (isFirebaseConfigured) {
    try {
      const disputeRef = ref(db, `disputes/${disputeId}`);
      const updateData = {
        status: "resolved",
        humanVerdict: verdict,
        humanReasoning: reasoning,
        humanReviewerAddress: reviewerAddress,
        humanReviewedAt: new Date().toISOString(),
        reviewerReward: REVIEWER_REWARD_USDC,
        resolvedAt: new Date().toISOString(),
        consensus: verdict === "agent_failed" ? "reject" : "approve"
      };
      await update(disputeRef, updateData);

      // Pay the reviewer in Realtime DB
      const reviewersRef = ref(db, "reviewers");
      const snapReviewers = await get(reviewersRef);
      if (snapReviewers.exists()) {
        const revs = snapReviewers.val();
        const matchKey = Object.keys(revs).find(
          key => revs[key].address?.toLowerCase() === reviewerAddress.toLowerCase()
        );
        if (matchKey) {
          const revRef = ref(db, `reviewers/${matchKey}`);
          const revData = revs[matchKey];
          await update(revRef, {
            votesCount: (revData.votesCount || 0) + 1,
            earnings: (revData.earnings || 0) + REVIEWER_REWARD_USDC
          });
        }
      }

      // Add transaction in Realtime DB
      const txHash = "0x" + Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join("");
      const txRef = push(ref(db, "transactions"));
      await set(txRef, {
        type: "reward",
        amount: REVIEWER_REWARD_USDC,
        currency: "USDC",
        fromAddress: "0xVerdictEscrowContract",
        toAddress: reviewerAddress,
        timestamp: new Date().toISOString(),
        hash: txHash,
        disputeId: disputeId
      });

      // Sync the local cache in the background
      syncFirestoreCache();

      const snap = await get(disputeRef);
      window.dispatchEvent(new Event("verdictDbUpdated"));
      return { id: disputeId, ...snap.val() };
    } catch (e) {
      console.error("RTD submitHumanReview failed, falling back", e);
    }
  }

  const disputes = getMockItem("verdict_disputes");
  const index = disputes.findIndex(d => d.id === disputeId);
  if (index === -1) throw new Error("Dispute not found.");
  
  const dispute = disputes[index];
  if (dispute.status !== "claimed") throw new Error("Dispute must be claimed before reviewing.");
  if (dispute.claimedBy?.toLowerCase() !== reviewerAddress.toLowerCase()) {
    throw new Error("You did not claim this dispute.");
  }

  // Record human review
  dispute.humanVerdict = verdict;
  dispute.humanReasoning = reasoning;
  dispute.humanReviewerAddress = reviewerAddress;
  dispute.humanReviewedAt = new Date().toISOString();
  dispute.reviewerReward = REVIEWER_REWARD_USDC;
  dispute.status = "resolved";
  dispute.resolvedAt = new Date().toISOString();
  dispute.consensus = verdict === "agent_failed" ? "reject" : "approve";
  setMockItem("verdict_disputes", disputes);

  // Pay the reviewer from registered reviewers store
  const registered = getMockItem("verdict_registered_reviewers") || [];
  const revIdx = registered.findIndex(r => r.address.toLowerCase() === reviewerAddress.toLowerCase());
  if (revIdx !== -1) {
    registered[revIdx].votesCount = (registered[revIdx].votesCount || 0) + 1;
    registered[revIdx].earnings = (registered[revIdx].earnings || 0) + REVIEWER_REWARD_USDC;
    setMockItem("verdict_registered_reviewers", registered);
  }

  // Record transaction
  const transactions = getMockItem("verdict_transactions") || [];
  transactions.push({
    id: "tx_" + Math.random().toString(36).substr(2, 9),
    type: "reward",
    amount: REVIEWER_REWARD_USDC,
    currency: "USDC",
    fromAddress: "0xVerdictEscrowContract",
    toAddress: reviewerAddress,
    timestamp: new Date().toISOString(),
    hash: "0x" + Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join(""),
    disputeId: disputeId
  });
  setMockItem("verdict_transactions", transactions);

  window.dispatchEvent(new Event("verdictDbUpdated"));
  return dispute;
};

// ==========================================
// REVIEWER REGISTRATION (Open role, any wallet)
// ==========================================
export const registerReviewer = async (address) => {
  if (!address) throw new Error("Wallet address required.");
  const addrLower = address.toLowerCase();

  if (isFirebaseConfigured) {
    try {
      const reviewersRef = ref(db, "reviewers");
      const snap = await get(reviewersRef);
      
      let matchKey = null;
      let reviewerData = null;
      
      if (snap.exists()) {
        const revs = snap.val();
        matchKey = Object.keys(revs).find(
          key => revs[key].address?.toLowerCase() === addrLower
        );
        if (matchKey) {
          reviewerData = { id: matchKey, ...revs[matchKey] };
        }
      }
      
      if (!reviewerData) {
        const newReviewer = {
          address: addrLower,
          name: `Reviewer ${truncateAddress(address)}`,
          avatar: "⚖️",
          specialty: "General Review",
          earnings: 0,
          votesCount: 0,
          registeredAt: new Date().toISOString(),
          status: "active"
        };
        const newRevRef = push(reviewersRef);
        const newKey = newRevRef.key;
        await set(newRevRef, newReviewer);
        reviewerData = { id: newKey, ...newReviewer };
      }
      
      // Sync cache
      await syncFirestoreCache();
      
      window.dispatchEvent(new Event("verdictDbUpdated"));
      return reviewerData;
    } catch (e) {
      console.error("RTD registerReviewer failed, falling back", e);
    }
  }

  const registered = getMockItem("verdict_registered_reviewers") || [];
  if (registered.find(r => r.address.toLowerCase() === addrLower)) {
    return registered.find(r => r.address.toLowerCase() === addrLower);
  }
  const newReviewer = {
    id: `rev_${Date.now()}`,
    address,
    name: `Reviewer ${truncateAddress(address)}`,
    avatar: "⚖️",
    specialty: "General Review",
    earnings: 0,
    votesCount: 0,
    registeredAt: new Date().toISOString(),
    status: "active"
  };
  registered.push(newReviewer);
  setMockItem("verdict_registered_reviewers", registered);
  window.dispatchEvent(new Event("verdictDbUpdated"));
  return newReviewer;
};

export const isRegisteredReviewer = (address) => {
  if (!address) return false;
  const addrLower = address.toLowerCase();
  const registered = getMockItem("verdict_registered_reviewers") || [];
  return registered.some(r => r.address.toLowerCase() === addrLower);
};

export const getRegisteredReviewer = (address) => {
  if (!address) return null;
  const addrLower = address.toLowerCase();
  const registered = getMockItem("verdict_registered_reviewers") || [];
  return registered.find(r => r.address.toLowerCase() === addrLower) || null;
};

// ==========================================
// AI JUDGE RESULT STORAGE
// ==========================================
export const updateDisputeWithAIJudge = async (disputeId, aiResult) => {
  if (isFirebaseConfigured) {
    try {
      const disputeRef = ref(db, `disputes/${disputeId}`);
      const status = aiResult.shouldEscalate ? "escalated" : "resolved";
      const resolvedAt = aiResult.shouldEscalate ? null : new Date().toISOString();
      const consensus = aiResult.shouldEscalate ? null : (aiResult.verdict === "agent_failed" ? "reject" : "approve");

      const updateData = {
        aiJudgeVerdict: aiResult.verdict,
        aiJudgeConfidence: aiResult.confidence,
        aiJudgeReasoning: aiResult.reasoning,
        aiJudgeTimestamp: new Date().toISOString(),
        status,
        resolvedAt,
        consensus
      };

      await update(disputeRef, updateData);
      const snap = await get(disputeRef);
      window.dispatchEvent(new Event("verdictDbUpdated"));
      return { id: disputeId, ...snap.val() };
    } catch (e) {
      console.error("RTD updateDisputeWithAIJudge failed, falling back", e);
    }
  }

  const disputes = getMockItem("verdict_disputes");
  const index = disputes.findIndex(d => d.id === disputeId);
  if (index === -1) return;
  
  const dispute = disputes[index];
  dispute.aiJudgeVerdict = aiResult.verdict;
  dispute.aiJudgeConfidence = aiResult.confidence;
  dispute.aiJudgeReasoning = aiResult.reasoning;
  dispute.aiJudgeTimestamp = new Date().toISOString();
  
  if (aiResult.shouldEscalate) {
    dispute.status = "escalated";
  } else {
    dispute.status = "resolved";
    dispute.resolvedAt = new Date().toISOString();
    dispute.consensus = aiResult.verdict === "agent_failed" ? "reject" : "approve";
  }
  
  setMockItem("verdict_disputes", disputes);
  window.dispatchEvent(new Event("verdictDbUpdated"));
  return dispute;
};

// ==========================================
// UTILITY HELPERS
// ==========================================
export const truncateAddress = (addr) => {
  if (!addr) return "";
  return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
};

export const getArcExplorerUrl = (txHash) => {
  return `https://testnet.arcscan.app/tx/${txHash}`;
};

// ==========================================
// SIMULATED WALLET STATE
// ==========================================
export const isWalletConnected = () => {
  return localStorage.getItem("verdict_wallet_connected") === "true";
};

export const connectWallet = () => {
  localStorage.setItem("verdict_wallet_connected", "true");
  window.dispatchEvent(new Event("walletStatusChanged"));
  window.dispatchEvent(new Event("verdictDbUpdated"));
};

export const disconnectWallet = () => {
  localStorage.setItem("verdict_wallet_connected", "false");
  window.dispatchEvent(new Event("walletStatusChanged"));
  window.dispatchEvent(new Event("verdictDbUpdated"));
};
