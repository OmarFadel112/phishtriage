// ═══════════════════════════════════════════════════════════════════════════
//  src/utils/geminiApi.js
//  Uses the stable v1 endpoint (not v1beta).
//  responseMimeType removed — v1beta-only, causes errors on v1.
//  JSON output enforced through the prompt instead.
// ═══════════════════════════════════════════════════════════════════════════

export const DEFAULT_MODEL = 'gemini-2.0-flash';
const BASE_URL = 'https://generativelanguage.googleapis.com/v1/models';

function buildPrompt(emailText, ruleData) {
  return `You are a Senior SOC Analyst specializing in email threat intelligence and phishing forensics.

Analyze the email and pre-computed rule findings below. Return ONLY a valid JSON object. Do not include markdown formatting, backticks, or conversational text.

=== RAW EMAIL ===
${emailText}

=== RULE-BASED PRE-ANALYSIS ===
${JSON.stringify(ruleData, null, 2)}

Return exactly this JSON structure (replace the example values with your actual analysis):
{
  "threatScore": 95,
  "verdict": "Malicious (Block Domain & Escalate)",
  "attackType": "Credential Phishing",
  "cognitiveTriggers": ["Urgency", "Fear"],
  "reasoning": "2-3 sentence forensic analysis goes here.",
  "indicators": ["malicious-domain.com", "fake-sso-link"],
  "recommendedActions": ["Block sender", "Reset user password"],
  "employeeChecklist": {
    "suspicious_sender": true,
    "mismatched_domains": true,
    "urgent_language": true,
    "requests_credentials": true,
    "suspicious_links": true,
    "unusual_attachments": false,
    "too_good_to_be_true": false,
    "generic_greeting": false
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
  } catch (networkErr) {
    throw new Error(`Network error — check your connection.\n\nDetails: ${networkErr.message}`);
  }

  if (!response.ok) {
    // ── Always show Google's real error message verbatim ──────────────────
    // Never replace it with a generic label — the raw message contains the
    // quota type, error code, and region info needed for diagnosis.
    let googleMessage = `HTTP ${response.status}`;
    let googleStatus  = '';
    try {
      const errData  = await response.json();
      googleMessage  = errData?.error?.message  || googleMessage;
      googleStatus   = errData?.error?.status   || '';
    } catch { /* body wasn't JSON */ }

    // Append a short actionable hint BELOW the real message, not instead of it
    const hints = {
      400: '→ Check the model name in the selector and that your API key format is correct.',
      401: '→ API key rejected. Verify it at aistudio.google.com/app/apikey.',
      403: '→ API key lacks permission. Verify it at aistudio.google.com/app/apikey.',
      404: `→ Model "${model}" not found on this endpoint. Try a different model from the dropdown.`,
      429: '→ Quota or rate limit hit. Check your usage at aistudio.google.com → quotas. Try a different model or wait for the quota window to reset.',
      500: '→ Google server error — wait a moment and try again.',
      503: '→ Google service temporarily unavailable — wait a moment and try again.',
    };
    const hint = hints[response.status] || '';

    // Format: real Google message first, then hint, then status code for debugging
    const displayMessage = [
      googleMessage,
      hint,
      googleStatus ? `[Status code: ${googleStatus} / HTTP ${response.status}]` : `[HTTP ${response.status}]`,
    ].filter(Boolean).join('\n\n');

    throw new Error(displayMessage);
  }

  const data    = await response.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

  if (!rawText) {
    const reason = data?.candidates?.[0]?.finishReason;
    if (reason === 'SAFETY')
      throw new Error('Gemini blocked the request (safety filter).\n\nTry removing personal data from the email before submitting.');
    throw new Error(`Empty response from Gemini.\n\nfinishReason: ${reason ?? 'unknown'}`);
  }

 // 1. Aggressively isolate the JSON brackets
  // This ignores any "Here is your JSON:" text or markdown backticks
  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  
  if (!jsonMatch) {
      console.error("Raw Gemini Output:", rawText);
      throw new Error('Gemini response did not contain a recognizable JSON object.');
  }

  // 2. Parse the isolated block
  try {
    return JSON.parse(jsonMatch[0]);
  } catch (parseError) {
    console.error("Raw Gemini Output:", rawText);
    throw new Error('Could not parse Gemini response. The model generated invalid JSON syntax. Try again.');
  }
}
