# ⚡ PhishTriage — SOC Email Triage Toolkit

A browser-based phishing email analysis tool. Paste any suspicious email and get a structured threat verdict in seconds — no installation required.

**[▶ Open PhishTriage](https://omarfadel112.github.io/phishtriage/)**


---

## What It Does

PhishTriage combines a **local rule-based engine** with **Google Gemini AI** to analyze suspicious emails the way a SOC analyst would.

### Analysis Pipeline

**Stage 1 — Local Rule Engine** (runs in your browser, instant):
- Detects sender domain mismatches (`From` vs `Return-Path` vs `Reply-To`)
- URL right-to-left parsing — reveals the true root domain hiding behind deceptive subdomains (e.g. `paypal.com.evil.ru` → true owner: `evil.ru`)
- Identifies URL shorteners (bit.ly, t.co, etc.)
- Checks for homoglyph substitutions and typosquatting

**Stage 2 — Gemini AI Layer** (calls Google's API, 2–5 seconds):
- 0–100 threat score
- Verdict: `Safe (Close)` / `Suspicious (Warn User)` / `Malicious (Block Domain & Escalate)`
- Attack type classification (BEC, Credential Phishing, TOAD, Quishing, etc.)
- Cognitive trigger mapping (Authority, Urgency, Fear, Greed, etc.)
- Specific IOCs and recommended SOC actions

### Two Views
- **⚙ SOC Technical View** — full forensic detail for security analysts
- **👤 Employee Checklist** — simplified red-flag list for non-technical staff

---

## How to Use

1. **Open the app** using the link above
2. **Enter your Gemini API key** in the top-right field
   - Get a free key at [aistudio.google.com](https://aistudio.google.com/)
   - Your key stays in your browser — it is never sent to any server except Google's
3. **Paste a suspicious email** into the left pane (include headers for best results)
4. Click **⚡ RUN TRIAGE ANALYSIS**
5. Review the verdict on the right, or switch to Employee Checklist
6. Click **⬇ EXPORT REPORT** to download a JSON incident report

---

## Getting Email Headers

**Gmail:** Open email → ⋮ → Show original → Copy all → Paste into PhishTriage

**Outlook:** Right-click email → Properties → Copy from "Internet headers"

**Apple Mail:** View → Message → All Headers → Copy → Paste

---

## Privacy & Security

- Emails are sent to Google's Gemini API for AI analysis. Strip PII before submitting if needed.
- Your Gemini API key is stored only in your browser session — never on any server.
- The rule-based analysis runs entirely in your browser with no external calls.

---

## Running Locally

```bash
git clone https://github.com/YOUR-USERNAME/YOUR-REPO-NAME.git
cd YOUR-REPO-NAME
npm install
npm run dev
```

Open `http://localhost:5173/` — requires Node.js 18+ and a Gemini API key.

---

## Tech Stack

React 18 · Vite 5 · Tailwind CSS 3 · Google Gemini 1.5 Flash · GitHub Pages

---

## License

MIT
