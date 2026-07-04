import { db, isFirebaseConfigured } from "./config";
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  addDoc, 
  query, 
  where 
} from "firebase/firestore";

// Seed Data definition
const DEFAULT_REVIEWERS = [
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
  if (localStorage.getItem("verdict_wallet_connected") === null) {
    localStorage.setItem("verdict_wallet_connected", "false");
  }
};

// Auto run on load if not using Firebase
if (!isFirebaseConfigured) {
  initializeMockDB();
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
  const isReviewer1 = addrLower === "0x75cc548C8C0470309754d8bB9e5F1E048C639AcB".toLowerCase();
  const isReviewer2 = false;
  const isReviewer3 = false;

  if (isReviewer1) {
    const reviewers = getMockItem("verdict_reviewers") || DEFAULT_REVIEWERS;
    const reviewer = reviewers.find(r => r.id === "rev_1") || DEFAULT_REVIEWERS[0];
    return { ...reviewer, role: "reviewer", balance: reviewer.earnings };
  }
  if (isReviewer2) {
    const reviewers = getMockItem("verdict_reviewers") || DEFAULT_REVIEWERS;
    const reviewer = reviewers.find(r => r.id === "rev_2") || DEFAULT_REVIEWERS[1];
    return { ...reviewer, role: "reviewer", balance: reviewer.earnings };
  }
  if (isReviewer3) {
    const reviewers = getMockItem("verdict_reviewers") || DEFAULT_REVIEWERS;
    const reviewer = reviewers.find(r => r.id === "rev_3") || DEFAULT_REVIEWERS[2];
    return { ...reviewer, role: "reviewer", balance: reviewer.earnings };
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
      const snap = await getDocs(collection(db, "disputes"));
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      console.error("Firestore getDisputes failed, falling back", e);
    }
  }
  return getMockItem("verdict_disputes");
};

export const getDisputeById = async (id) => {
  if (isFirebaseConfigured) {
    try {
      const docRef = doc(db, "disputes", id);
      const snap = await getDoc(docRef);
      if (snap.exists()) return { id: snap.id, ...snap.data() };
    } catch (e) {
      console.error("Firestore getDisputeById failed, falling back", e);
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
      const docRef = await addDoc(collection(db, "disputes"), newDispute);
      // Create transaction in Firestore too
      await addDoc(collection(db, "transactions"), {
        type: "stake",
        amount: parseFloat(stakeAmount),
        currency: "USDC",
        fromAddress: userAddress,
        toAddress: "0xVerdictEscrowContract",
        timestamp: new Date().toISOString(),
        disputeId: docRef.id,
        hash: txHash
      });
      return { id: docRef.id, ...newDispute };
    } catch (e) {
      console.error("Firestore createDispute failed, falling back", e);
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
      const docRef = doc(db, "disputes", disputeId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        const updatedVoters = [...new Set([...data.voters, reviewerId])];
        const updatedVotes = { ...data.votes, [reviewerId]: vote };
        const updatedJustifications = { ...data.justifications, [reviewerId]: justification };
        
        let consensus = null;
        let status = "pending";
        let resolvedAt = null;

        // If all 3 reviewers have voted, calculate consensus
        if (updatedVoters.length === 3) {
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

        await updateDoc(docRef, updateData);
        return { id: disputeId, ...data, ...updateData };
      }
    } catch (e) {
      console.error("Firestore submitVote failed, falling back", e);
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

  // Check Resolution Condition (All 3 voters participated)
  if (dispute.voters.length === 3) {
    dispute.status = "resolved";
    dispute.resolvedAt = new Date().toISOString();
    
    const votesVal = Object.values(dispute.votes);
    const approves = votesVal.filter(v => v === "approve").length;
    const rejects = votesVal.filter(v => v === "reject").length;
    dispute.consensus = approves > rejects ? "approve" : "reject";

    // Payout / Slashing Logic (x402 protocol rules)
    const creatorStake = dispute.stakeAmount;
    const totalReviewerStakes = 3.00; // 3 voters * 1 USDC
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

// ==========================================
// TRANSACTIONS COLLECTIONS
// ==========================================
export const getTransactions = async () => {
  if (isFirebaseConfigured) {
    try {
      const snap = await getDocs(collection(db, "transactions"));
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      console.error("Firestore getTransactions failed, falling back", e);
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
    // Write transaction logic for firebase...
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
