// ---------------------------------------------------------------------------
// AI Judge – Real LLM-Powered Verdict Engine
// ---------------------------------------------------------------------------
// Calls Anthropic Claude or OpenAI GPT to analyze dispute evidence and return
// a structured verdict with confidence score and reasoning.
// Falls back to insufficient_evidence/0 on any failure.
// ---------------------------------------------------------------------------

/** Confidence threshold – verdicts below this are escalated to human review */
export const AI_JUDGE_CONFIDENCE_THRESHOLD = 85;

/** USDC reward paid to each reviewer who completes a human review */
export const REVIEWER_REWARD_USDC = 2.0;

// ── API Key Detection ───────────────────────────────────────────────────────

const getAnthropicKey = () => import.meta.env.VITE_ANTHROPIC_API_KEY || '';
const getOpenAIKey = () => import.meta.env.VITE_OPENAI_API_KEY || '';

/**
 * Determine which LLM provider is available.
 * Priority: Anthropic > OpenAI
 */
const getProvider = () => {
  if (getAnthropicKey()) return 'anthropic';
  if (getOpenAIKey()) return 'openai';
  return null;
};

// ── System Prompt ───────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an impartial AI Judge for a dispute resolution protocol called Verdict. Your role is to analyze submitted evidence of AI agent misbehavior and render a verdict.

You will receive:
- The violation type alleged by the submitter
- The original prompt given to the AI agent
- The agent's actual output (the disputed content)
- What the submitter expected the agent to produce
- Any supporting evidence (URL or description)

Your task:
1. Carefully analyze whether the agent's output actually constitutes the alleged violation.
2. Compare the agent's output against the expected behavior.
3. Assess the quality and completeness of the evidence provided.

CRITICAL RULES FOR CONFIDENCE SCORING:
- Lower confidence (below 85) when evidence is thin, vague, or contradictory.
- Lower confidence when the alleged violation is subjective or debatable.
- Lower confidence when the agent output could reasonably be interpreted as fulfilling the prompt.
- Higher confidence (85+) only when the violation is clear-cut with strong supporting evidence.
- A confidence of 0 means you cannot make any determination at all.
- A confidence of 95+ should be reserved for unambiguous, well-documented violations.

You MUST respond with ONLY valid JSON in this exact format, nothing else:
{
  "verdict": "agent_fulfilled" | "agent_failed" | "insufficient_evidence",
  "confidence": <number 0-100>,
  "reasoning": "<2-3 sentences citing specific details from the evidence>"
}

Verdict meanings:
- "agent_failed": The agent clearly violated the expected behavior or policy.
- "agent_fulfilled": The agent's output is acceptable and does not constitute a violation.
- "insufficient_evidence": The provided evidence is too thin or contradictory to make a determination.

Do NOT include any text outside the JSON object. Do NOT use markdown code blocks. Return ONLY the raw JSON.`;

// ── LLM API Calls ───────────────────────────────────────────────────────────

/**
 * Build the user message from dispute fields.
 */
const buildUserMessage = (dispute) => {
  const parts = [
    `## Dispute Analysis Request`,
    ``,
    `**Violation Type Alleged:** ${dispute.violationType || 'Unspecified'}`,
    ``,
    `**Original Prompt Given to Agent:**`,
    dispute.prompt || '[Not provided]',
    ``,
    `**Agent's Actual Output (Disputed Content):**`,
    dispute.agentOutput || '[Not provided]',
    ``,
    `**Expected Behavior (What Submitter Expected):**`,
    dispute.expectedOutput || '[Not provided]',
    ``,
    `**Supporting Evidence:**`,
    dispute.evidence
      ? (dispute.evidence.startsWith('data:') 
          ? '[Screenshot/image attached by submitter]' 
          : dispute.evidence)
      : '[No evidence provided]',
    ``,
    `**Dispute Title:** ${dispute.title || 'Untitled'}`,
    ``,
    `Analyze this dispute and return your verdict as JSON.`,
  ];
  return parts.join('\n');
};

/**
 * Call Anthropic Claude API.
 */
const callAnthropic = async (userMessage) => {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': getAnthropicKey(),
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Anthropic API error ${response.status}: ${errBody}`);
  }

  const data = await response.json();
  return data.content?.[0]?.text || '';
};

/**
 * Call OpenAI Chat Completions API.
 */
const callOpenAI = async (userMessage) => {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getOpenAIKey()}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 512,
      temperature: 0.3,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${errBody}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
};

// ── Response Parser ─────────────────────────────────────────────────────────

/**
 * Parse the LLM response text into a structured verdict object.
 * Handles markdown code blocks, extra whitespace, etc.
 */
const parseResponse = (raw) => {
  // Strip markdown code fences if present
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }

  const parsed = JSON.parse(cleaned);

  // Validate required fields
  const validVerdicts = ['agent_fulfilled', 'agent_failed', 'insufficient_evidence'];
  if (!validVerdicts.includes(parsed.verdict)) {
    throw new Error(`Invalid verdict: ${parsed.verdict}`);
  }

  const confidence = Math.round(Number(parsed.confidence));
  if (isNaN(confidence) || confidence < 0 || confidence > 100) {
    throw new Error(`Invalid confidence: ${parsed.confidence}`);
  }

  if (typeof parsed.reasoning !== 'string' || parsed.reasoning.length < 10) {
    throw new Error(`Invalid reasoning: too short or not a string`);
  }

  return {
    verdict: parsed.verdict,
    confidence,
    reasoning: parsed.reasoning,
  };
};

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Runs a single-pass AI Judge analysis on a dispute object using a real LLM.
 *
 * @param {Object} dispute - The dispute to analyze
 * @returns {Promise<{
 *   verdict: 'agent_fulfilled' | 'agent_failed' | 'insufficient_evidence',
 *   confidence: number,
 *   reasoning: string,
 *   shouldEscalate: boolean,
 *   provider: string
 * }>}
 */
export const runAIJudge = async (dispute) => {
  const provider = getProvider();

  if (!provider) {
    console.warn('AI Judge: No LLM API key found (set VITE_ANTHROPIC_API_KEY or VITE_OPENAI_API_KEY in .env)');
    return {
      verdict: 'insufficient_evidence',
      confidence: 0,
      reasoning: 'No LLM API key configured. Set VITE_ANTHROPIC_API_KEY or VITE_OPENAI_API_KEY in your .env file to enable real AI Judge analysis. This dispute has been escalated to human review.',
      shouldEscalate: true,
      provider: 'none',
    };
  }

  try {
    console.log(`AI Judge: Calling ${provider} API...`);
    const userMessage = buildUserMessage(dispute);

    let rawResponse;
    if (provider === 'anthropic') {
      rawResponse = await callAnthropic(userMessage);
    } else {
      rawResponse = await callOpenAI(userMessage);
    }

    console.log(`AI Judge: Raw response from ${provider}:`, rawResponse);

    const { verdict, confidence, reasoning } = parseResponse(rawResponse);
    const shouldEscalate = confidence < AI_JUDGE_CONFIDENCE_THRESHOLD;

    return {
      verdict,
      confidence,
      reasoning,
      shouldEscalate,
      provider,
    };
  } catch (error) {
    console.error(`AI Judge: ${provider} call failed:`, error);

    return {
      verdict: 'insufficient_evidence',
      confidence: 0,
      reasoning: `AI Judge analysis failed (${provider}): ${error.message}. This dispute has been escalated to human review as a safety measure.`,
      shouldEscalate: true,
      provider: `${provider}_error`,
    };
  }
};
