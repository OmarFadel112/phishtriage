// ═══════════════════════════════════════════════════════════════════════════
//  src/utils/geminiApi.js
//  Gemini 1.5 Flash — Cognitive Analysis Engine
//
//  Sends the raw email text PLUS the pre-computed rule-based analysis to
//  Gemini. Providing structured pre-analysis data gives the model concrete
//  evidence anchors, reducing hallucination and improving verdict consistency.
//
//  Model: gemini-1.5-flash  (fast, cheap, excellent JSON instruction-following)
//  Endpoint: POST https://generativelanguage.googleapis.com/v1beta/models/
//            gemini-1.5-flash:generateContent?key={API_KEY}
//
//  responseMimeType: 'application/json' tells Gemini to output raw JSON —
//  no markdown fences, no preamble text. This is the most reliable way to
//  get clean, parseable JSON from the model.
// ═══════════════════════════════════════════════════════════════════════════

const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent';

// ───────────────────────────────────────────────────────────────────────────
//  PROMPT BUILDER
//  The prompt is structured in three sections:
//    1. Role + task framing
//    2. Raw email content
//    3. Pre-computed rule findings (JSON) to anchor the model's analysis
//  The output schema is explicitly specified so the model fills in each field
//  deterministically rather than choosing its own structure.
// ───────────────────────────────────────────────────────────────────────────
function buildPrompt(emailText, ruleData) {
  return `You are a Senior SOC Analyst and Threat Intelligence Specialist with 10 years of experience in email security, phishing detection, and Business Email Compromise (BEC) investigations.

Analyze the following email. I have already run a local rule-based pre-analysis — use those findings as supporting evidence for your cognitive assessment.

=== RAW EMAIL ===
${emailText}

=== RULE-BASED PRE-ANALYSIS (locally computed) ===
${JSON.stringify(ruleData, null, 2)}

Produce your threat assessment as a single JSON object. All string values must be concise and precise. Do NOT add markdown, code fences, or commentary outside the JSON object.

{
  "threatScore": <integer 0–100; 0 = completely benign, 100 = confirmed attack>,
  "verdict": "<MUST be exactly one of: Safe (Close) | Suspicious (Warn User) | Malicious (Block Domain & Escalate)>",
  "attackType": "<BEC | Credential Phishing | TOAD/Callback Scam | Quishing | Spear Phishing | CEO Fraud | Invoice Fraud | Malware Delivery | Account Takeover | Vishing Setup | Other>",
  "cognitiveTriggers": [
    "<list ONLY triggers actually present in the email body, from: Authority | Urgency | Fear | Greed | Curiosity | Social Proof | Scarcity | Reciprocity>"
  ],
  "reasoning": "<2–3 sentence forensic-level technical analysis. Name specific indicators. Explain why this verdict was reached.>",
  "indicators": [
    "<specific, concrete IOC or red flag found in this email — e.g. domain name, header field, phrase, structural anomaly>"
  ],
  "recommendedActions": [
    "<specific, actionable SOC response step — e.g. 'Block domain evil.ru at email gateway', 'Submit bit.ly/3xK9mPq to URLscan.io for detonation'>"
  ],
  "employeeChecklist": {
    "suspicious_sender": <true/false — sender address looks fake, spoofed, or mismatched>,
    "mismatched_domains": <true/false — display name does not match actual routing domain>,
    "urgent_language": <true/false — uses time pressure, threats, or URGENT framing>,
    "requests_credentials": <true/false — asks for passwords, logins, OTPs, or personal data>,
    "suspicious_links": <true/false — contains obfuscated, shortened, or trap URLs>,
    "unusual_attachments": <true/false — references attachments, QR codes, or embedded files>,
    "too_good_to_be_true": <true/false — offers prizes, unexpected refunds, or windfalls>,
    "generic_greeting": <true/false — uses "Dear Customer / User" instead of recipient name>
  }
}`;
}


// ───────────────────────────────────────────────────────────────────────────
//  GEMINI API CALL
//  Sends the constructed prompt to Gemini and parses the JSON response.
//  Throws descriptive errors so the UI can surface them directly to the user.
// ───────────────────────────────────────────────────────────────────────────
export async function analyzeWithGemini(emailText, ruleData, apiKey) {
  const prompt = buildPrompt(emailText, ruleData);

  const requestBody = {
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.1,        // Low temperature = deterministic, consistent JSON
      topP: 0.95,
      maxOutputTokens: 1500,
      responseMimeType: 'application/json', // Force raw JSON output (no fences)
    },
  };

  let response;
  try {
    response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });
  } catch (networkError) {
    throw new Error(`Network error — check your connection. (${networkError.message})`);
  }

  if (!response.ok) {
    let errorMessage = `Gemini API error (HTTP ${response.status})`;
    try {
      const errData = await response.json();
      if (errData?.error?.message) {
        errorMessage = errData.error.message;
        // Provide user-friendly messages for common errors
        if (response.status === 400) errorMessage = `Invalid request: ${errData.error.message}`;
        if (response.status === 401 || response.status === 403) errorMessage = 'Invalid or missing API key. Check your Gemini API key.';
        if (response.status === 429) errorMessage = 'Rate limit exceeded. Wait a moment and try again.';
      }
    } catch { /* use generic message */ }
    throw new Error(errorMessage);
  }

  const data = await response.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

  if (!rawText) {
    // Check for safety blocks
    const finishReason = data?.candidates?.[0]?.finishReason;
    if (finishReason === 'SAFETY') {
      throw new Error('Gemini blocked this request due to safety filters. Try removing any sensitive personal data from the email before submitting.');
    }
    throw new Error('Empty response from Gemini API.');
  }

  // ── JSON parsing with fallback ─────────────────────────────────────────
  // Even with responseMimeType: 'application/json', occasionally the model
  // wraps output in ```json fences. Strip them defensively.
  const cleaned = rawText.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    // Last-resort: try to extract a JSON object from within the response
    const jsonBlock = cleaned.match(/\{[\s\S]+\}/);
    if (jsonBlock) {
      try {
        return JSON.parse(jsonBlock[0]);
      } catch { /* fall through to throw */ }
    }
    throw new Error('Failed to parse Gemini response as JSON. The model may have returned an unexpected format — try again.');
  }
}
