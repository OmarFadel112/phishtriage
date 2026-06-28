// ═══════════════════════════════════════════════════════════════════════════
//  src/utils/geminiApi.js
//  Gemini API Integration
//
//  Model: gemini-2.0-flash  (confirmed working on v1beta, June 2026)
//
//  If you hit a "model not found" error in future, replace GEMINI_MODEL with
//  any model from this list endpoint:
//  https://generativelanguage.googleapis.com/v1beta/models?key=YOUR_KEY
// ═══════════════════════════════════════════════════════════════════════════

const GEMINI_MODEL    = 'gemini-2.0-flash';
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const GEMINI_ENDPOINT = `${GEMINI_BASE_URL}/${GEMINI_MODEL}:generateContent`;

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
    "<specific, concrete IOC or red flag found in this email>"
  ],
  "recommendedActions": [
    "<specific, actionable SOC response step>"
  ],
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

export async function analyzeWithGemini(emailText, ruleData, apiKey) {
  const prompt = buildPrompt(emailText, ruleData);

  const requestBody = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.1,
      topP: 0.95,
      maxOutputTokens: 1500,
      responseMimeType: 'application/json',
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
        if (response.status === 400) errorMessage = `Bad request: ${errData.error.message}`;
        if (response.status === 401 || response.status === 403)
          errorMessage = 'Invalid or missing API key. Check the key you entered.';
        if (response.status === 429)
          errorMessage = 'Rate limit hit. Wait a moment then try again.';
        if (response.status === 404)
          errorMessage = `Model not found: ${GEMINI_MODEL}. Open src/utils/geminiApi.js and update GEMINI_MODEL.`;
      }
    } catch { /* use generic message */ }
    throw new Error(errorMessage);
  }

  const data = await response.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

  if (!rawText) {
    const finishReason = data?.candidates?.[0]?.finishReason;
    if (finishReason === 'SAFETY')
      throw new Error('Gemini blocked this request (safety filters). Strip personal data from the email and try again.');
    throw new Error('Empty response from Gemini API.');
  }

  const cleaned = rawText.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const jsonBlock = cleaned.match(/\{[\s\S]+\}/);
    if (jsonBlock) {
      try { return JSON.parse(jsonBlock[0]); } catch { /* fall through */ }
    }
    throw new Error('Could not parse Gemini response as JSON. Try again.');
  }
}
