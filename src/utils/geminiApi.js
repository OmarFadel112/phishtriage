// ═══════════════════════════════════════════════════════════════════════════
//  src/utils/geminiApi.js
//
//  Uses the stable v1 endpoint (not v1beta) — more broadly available
//  across regions and API key tiers.
//
//  responseMimeType removed — it is a v1beta-only feature and can silently
//  cause 429/400 errors on v1. JSON output is enforced through the prompt
//  instead, which works on every model and endpoint version.
// ═══════════════════════════════════════════════════════════════════════════

// Change this if you need to switch models without touching anything else.
// Confirmed free-tier models (June 2026):
//   gemini-2.0-flash        ← default, fast, best for this tool
//   gemini-2.0-flash-lite   ← higher RPM, slightly less capable
//   gemini-2.5-flash        ← newest, best quality, same free tier
export const DEFAULT_MODEL = 'gemini-2.0-flash';

// v1 (stable) — not v1beta — works across more regions and key tiers
const BASE_URL = 'https://generativelanguage.googleapis.com/v1/models';

function buildPrompt(emailText, ruleData) {
  return `You are a Senior SOC Analyst specializing in email threat intelligence and phishing forensics.

Analyze the email and pre-computed rule findings below. Your response must be a single raw JSON object — no markdown, no code fences, no text before or after the JSON.

=== RAW EMAIL ===
${emailText}

=== RULE-BASED PRE-ANALYSIS ===
${JSON.stringify(ruleData, null, 2)}

Return exactly this JSON structure:
{
  "threatScore": <integer 0-100>,
  "verdict": "<exactly one of: Safe (Close) | Suspicious (Warn User) | Malicious (Block Domain & Escalate)>",
  "attackType": "<BEC | Credential Phishing | TOAD/Callback Scam | Quishing | Spear Phishing | CEO Fraud | Invoice Fraud | Malware Delivery | Account Takeover | Other>",
  "cognitiveTriggers": ["<Authority | Urgency | Fear | Greed | Curiosity | Social Proof | Scarcity>"],
  "reasoning": "<2-3 sentence forensic analysis>",
  "indicators": ["<specific IOC found in this email>"],
  "recommendedActions": ["<specific SOC response step>"],
  "employeeChecklist": {
    "suspicious_sender": <true/false>,
    "mismatched_domains": <true/false>,
    "urgent_language": <true/false>,
    "requests_credentials": <true/false>,
    "suspicious_links": <true/false>,
    "unusual_attachments": <true/false>,
    "too_good_to_be_true": <true/false>,
    "generic_greeting": <true/false>
  }
}`;
}

export async function analyzeWithGemini(emailText, ruleData, apiKey, model = DEFAULT_MODEL) {
  const endpoint = `${BASE_URL}/${model}:generateContent?key=${apiKey}`;

  const requestBody = {
    contents: [{ parts: [{ text: buildPrompt(emailText, ruleData) }] }],
    generationConfig: {
      temperature: 0.1,
      topP: 0.95,
      maxOutputTokens: 1500,
    },
  };

  let response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });
  } catch (networkError) {
    throw new Error(`Network error — check your connection. (${networkError.message})`);
  }

  // Always parse the error body so we show Google's actual message,
  // not a generic label that hides what really went wrong.
  if (!response.ok) {
    let googleMessage = `HTTP ${response.status}`;
    try {
      const errData = await response.json();
      googleMessage = errData?.error?.message || googleMessage;
    } catch { /* body wasn't JSON, keep status code */ }

    // Append a human-readable hint without replacing the real message.
    let hint = '';
    if (response.status === 400)
      hint = 'Check your API key format and that the model name is correct.';
    else if (response.status === 401 || response.status === 403)
      hint = 'API key is invalid or lacks permission. Verify it at aistudio.google.com.';
    else if (response.status === 404)
      hint = `Model "${model}" not found — try a different model from the selector.`;
    else if (response.status === 429)
      hint = 'Quota hit — try a different model, wait 60 s, or check your daily limit at aistudio.google.com.';
    else if (response.status >= 500)
      hint = 'Google server error — wait a moment and try again.';

    throw new Error(hint ? `${googleMessage}\n\n${hint}` : googleMessage);
  }

  const data = await response.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

  if (!rawText) {
    const reason = data?.candidates?.[0]?.finishReason;
    if (reason === 'SAFETY')
      throw new Error('Gemini blocked the request (safety filter). Strip any PII from the email and try again.');
    throw new Error(`Empty response from Gemini (finishReason: ${reason ?? 'unknown'}).`);
  }

  // Strip any accidental markdown fences and parse
  const cleaned = rawText.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]+\}/);
    if (match) {
      try { return JSON.parse(match[0]); } catch { /* fall through */ }
    }
    throw new Error('Could not parse Gemini response as JSON. Try again.');
  }
}
