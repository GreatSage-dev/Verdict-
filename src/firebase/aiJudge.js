// ---------------------------------------------------------------------------
// AI Judge – Real LLM-Powered Verdict Engine (Google Gemini)
// ---------------------------------------------------------------------------
// Calls Google Gemini 2.0 Flash to analyze dispute evidence and return
// a structured verdict with confidence score and reasoning.
// Falls back to insufficient_evidence/0 on any failure.
// ---------------------------------------------------------------------------

/** Confidence threshold – verdicts below this are escalated to human review */
export const AI_JUDGE_CONFIDENCE_THRESHOLD = 85;

/** USDC reward paid to each reviewer who completes a human review */
export const REVIEWER_REWARD_USDC = 2.0;

// ── API Key Detection ───────────────────────────────────────────────────────

const getGeminiKey = () => import.meta.env.VITE_GEMINI_API_KEY || '';

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

// ── User Message Builder ────────────────────────────────────────────────────

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

// ── Gemini API Call ─────────────────────────────────────────────────────────

/**
 * Call Google Gemini 2.0 Flash via the REST API.
 */
const callGemini = async (userMessage) => {
  const apiKey = getGeminiKey();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: SYSTEM_PROMPT }],
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: userMessage }],
        },
      ],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 512,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${errBody}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return text;
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
 * Runs a single-pass AI Judge analysis on a dispute object using Google Gemini.
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
  const apiKey = getGeminiKey();

  if (!apiKey) {
    console.warn('AI Judge: No Gemini API key found (set VITE_GEMINI_API_KEY in .env)');
    return {
      verdict: 'insufficient_evidence',
      confidence: 0,
      reasoning: 'No Gemini API key configured. Set VITE_GEMINI_API_KEY in your .env file to enable real AI Judge analysis. This dispute has been escalated to human review.',
      shouldEscalate: true,
      provider: 'none',
    };
  }

  try {
    console.log('AI Judge: Calling Gemini 2.0 Flash...');
    const userMessage = buildUserMessage(dispute);
    const rawResponse = await callGemini(userMessage);

    console.log('AI Judge: Raw Gemini response:', rawResponse);

    const { verdict, confidence, reasoning } = parseResponse(rawResponse);
    const shouldEscalate = confidence < AI_JUDGE_CONFIDENCE_THRESHOLD;

    return {
      verdict,
      confidence,
      reasoning,
      shouldEscalate,
      provider: 'gemini',
    };
  } catch (error) {
    console.error('AI Judge: Gemini call failed:', error);

    return {
      verdict: 'insufficient_evidence',
      confidence: 0,
      reasoning: `AI Judge analysis failed (Gemini): ${error.message}. This dispute has been escalated to human review as a safety measure.`,
      shouldEscalate: true,
      provider: 'gemini_error',
    };
  }
};
