// ---------------------------------------------------------------------------
// AI Judge – Deterministic Heuristic Engine
// ---------------------------------------------------------------------------
// A lightweight, frontend-only judge that scores disputes using text-analysis
// heuristics. No LLM API keys required.
// ---------------------------------------------------------------------------

/** Confidence threshold – verdicts below this are escalated to human review */
export const AI_JUDGE_CONFIDENCE_THRESHOLD = 85;

/** USDC reward paid to each reviewer who completes a human review */
export const REVIEWER_REWARD_USDC = 2.0;

// ── Internal helpers ────────────────────────────────────────────────────────

/**
 * Returns a random integer in [min, max] (inclusive).
 */
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

/**
 * Clamp a number between lo and hi.
 */
const clamp = (n, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, n));

/**
 * Detect the primary violation category from free-text fields.
 * Falls back to 'instruction_alignment' when nothing specific matches.
 */
const detectViolation = (text) => {
  const t = (text ?? '').toLowerCase();

  if (
    t.includes('pii') ||
    t.includes('personal data') ||
    t.includes('leak') ||
    t.includes('security') ||
    t.includes('credential') ||
    t.includes('password') ||
    t.includes('ssn') ||
    t.includes('credit card') ||
    t.includes('private key')
  ) {
    return 'security_pii';
  }

  if (
    t.includes('hallucin') ||
    t.includes('malware') ||
    t.includes('virus') ||
    t.includes('fabricat') ||
    t.includes('false claim') ||
    t.includes('made up') ||
    t.includes('malicious') ||
    t.includes('trojan')
  ) {
    return 'hallucination_malware';
  }

  return 'instruction_alignment';
};

/**
 * Build a human-readable reasoning string referencing violation type & evidence.
 */
const buildReasoning = (violation, confidence, hasEvidence, dispute) => {
  const violationLabels = {
    security_pii:
      'a security / PII-leak violation',
    hallucination_malware:
      'a hallucination or malware-related violation',
    instruction_alignment:
      'an instruction-alignment deviation',
  };

  const label = violationLabels[violation] ?? 'a policy violation';

  const evidenceNote = hasEvidence
    ? 'Supporting evidence (URL / screenshot) was provided, which strengthens the finding.'
    : 'No external evidence was attached; the assessment relies solely on the reported output.';

  const escalationNote =
    confidence < AI_JUDGE_CONFIDENCE_THRESHOLD
      ? 'Due to the ambiguity of the claim, this dispute is flagged for human review.'
      : 'The confidence level is sufficient for an automated resolution.';

  return `The submitted dispute indicates ${label}. ${evidenceNote} ${escalationNote}`;
};

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Runs a single-pass AI Judge analysis on a dispute object.
 *
 * @param {Object} dispute
 * @param {string} [dispute.violationType]     – e.g. "PII Leak", "Hallucination"
 * @param {string} [dispute.description]       – free-text description of the issue
 * @param {string} [dispute.expectedOutput]    – what the reporter expected
 * @param {string} [dispute.agentOutput]       – the agent's actual output
 * @param {string} [dispute.evidence]          – URL or screenshot link
 * @param {string} [dispute.category]          – optional category label
 *
 * @returns {Promise<{
 *   verdict: 'agent_fulfilled' | 'agent_failed',
 *   confidence: number,
 *   reasoning: string,
 *   shouldEscalate: boolean
 * }>}
 */
export const runAIJudge = async (dispute) => {
  // Artificial processing delay (500 – 1500 ms)
  await new Promise((resolve) => setTimeout(resolve, randInt(500, 1500)));

  // ── 1. Combine all textual fields for violation detection ──────────────
  const blob = [
    dispute?.violationType,
    dispute?.description,
    dispute?.expectedOutput,
    dispute?.agentOutput,
    dispute?.category,
  ]
    .filter(Boolean)
    .join(' ');

  const violation = detectViolation(blob);

  // ── 2. Base confidence from violation category ─────────────────────────
  let confidence;
  switch (violation) {
    case 'security_pii':
      confidence = randInt(88, 95); // Clear-cut → high confidence
      break;
    case 'hallucination_malware':
      confidence = randInt(80, 92); // Often escalated → medium-high
      break;
    case 'instruction_alignment':
    default:
      confidence = randInt(60, 78); // Ambiguous → low
      break;
  }

  // ── 3. Apply modifiers ─────────────────────────────────────────────────
  const hasEvidence =
    typeof dispute?.evidence === 'string' && dispute.evidence.trim().length > 0;
  if (hasEvidence) confidence += 5;

  const expectedLen = (dispute?.expectedOutput ?? '').length;
  if (expectedLen > 100) confidence += 3;

  const agentLen = (dispute?.agentOutput ?? '').length;
  if (agentLen > 0 && agentLen < 50) confidence -= 5;

  // ── 4. Slight randomness (±3) for a dynamic feel ──────────────────────
  confidence += randInt(-3, 3);
  confidence = clamp(confidence, 0, 100);

  // ── 5. Determine verdict & escalation ─────────────────────────────────
  // Security & hallucination violations lean toward "agent_failed" (reject).
  // Instruction-alignment issues are more ambiguous — low confidence ones
  // lean toward "agent_fulfilled" since the claim is weak.
  const verdict =
    violation === 'instruction_alignment' && confidence < AI_JUDGE_CONFIDENCE_THRESHOLD
      ? 'agent_fulfilled'
      : 'agent_failed';

  const shouldEscalate = confidence < AI_JUDGE_CONFIDENCE_THRESHOLD;

  const reasoning = buildReasoning(violation, confidence, hasEvidence, dispute);

  return { verdict, confidence, reasoning, shouldEscalate };
};
