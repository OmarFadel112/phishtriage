// ═══════════════════════════════════════════════════════════════════════════
//  src/utils/analyzer.js
//  Rule-Based Local Analysis Engine
//
//  Runs entirely in the browser — zero API calls, zero latency.
//  Produces a pre-analysis payload that is injected into the Gemini prompt,
//  giving the LLM concrete, structured evidence rather than raw text alone.
// ═══════════════════════════════════════════════════════════════════════════


// ───────────────────────────────────────────────────────────────────────────
//  HEADER PARSER
//  Extracts From / Return-Path / Reply-To / Subject / Received headers and
//  detects "Sender Domain Mismatch" — the primary indicator of email spoofing.
//
//  MISMATCH LOGIC:
//    A legitimate email has consistent routing across all three header fields:
//      From:          "PayPal" <service@paypal.com>     ← display + actual sender
//      Return-Path:   <bounce@paypal.com>               ← where bounces go
//      Reply-To:      <no-reply@paypal.com>             ← where user replies go
//
//    A spoofed email typically shows:
//      From:          "PayPal" <service@paypal.com>     ← looks legitimate
//      Return-Path:   <noreply@evil-domain.ru>          ← attacker's actual server
//      Reply-To:      <support@phish-site.xyz>          ← attacker's reply catcher
//
//    The From header is trivially spoofable. Return-Path and Reply-To reveal
//    the true infrastructure because they're set by the sending mail server,
//    not the From header which the email client just renders as "display name".
// ───────────────────────────────────────────────────────────────────────────
export function parseHeaders(rawEmail) {
  const fields = {};

  // Parse key headers — only capture the first occurrence of each field
  rawEmail.split('\n').forEach((line) => {
    const match = line.match(/^(from|return-path|reply-to|subject|received):\s*(.+)/i);
    if (match && !fields[match[1].toLowerCase()]) {
      fields[match[1].toLowerCase()] = match[2].trim();
    }
  });

  // ── Extract the actual email address from the From field ──────────────
  // Handles both forms:
  //   "Display Name" <actual@email.com>   → extracts actual@email.com
  //   actual@email.com                    → extracts as-is
  const extractEmailAddress = (str) => {
    if (!str) return null;
    const angleMatch = str.match(/<([^>]+@[^>]+)>/);
    if (angleMatch) return angleMatch[1].trim();
    const bareMatch = str.match(/^([^\s<"]+@[^\s>]+)$/);
    return bareMatch ? bareMatch[1].trim() : null;
  };

  const extractDomain = (str) => {
    if (!str) return null;
    const match = str.match(/@([\w.\-]+)/);
    return match ? match[1].toLowerCase() : null;
  };

  const fromEmail = extractEmailAddress(fields['from']);
  const fromDomain = extractDomain(fromEmail);
  const returnPathDomain = extractDomain(fields['return-path']);
  const replyToDomain = extractDomain(fields['reply-to']);

  // ── Mismatch detection ────────────────────────────────────────────────
  const mismatches = [];

  if (fromDomain && returnPathDomain && fromDomain !== returnPathDomain) {
    mismatches.push(`From (${fromDomain}) ≠ Return-Path (${returnPathDomain})`);
  }
  if (fromDomain && replyToDomain && fromDomain !== replyToDomain) {
    mismatches.push(`From (${fromDomain}) ≠ Reply-To (${replyToDomain})`);
  }

  return {
    from: fields['from'] || null,
    returnPath: fields['return-path'] || null,
    replyTo: fields['reply-to'] || null,
    subject: fields['subject'] || null,
    received: fields['received'] || null,
    fromEmail,
    fromDomain,
    returnPathDomain,
    replyToDomain,
    domainMismatch: mismatches.length > 0,
    mismatches,
  };
}


// ───────────────────────────────────────────────────────────────────────────
//  URL DISSECTOR  —  Right-to-Left Domain Parsing
//
//  CORE CONCEPT: Domain authority is determined RIGHT-TO-LEFT.
//  The rightmost two labels (e.g. "evil.ru") are the REGISTRABLE domain —
//  the only part the attacker needs to own. Everything to the left is a
//  freely configurable subdomain prefix the attacker sets themselves.
//
//  ATTACK EXAMPLE:
//    URL:    https://paypal.com.secure-login.evil.ru/verify?token=abc
//    Human:  reads left-to-right, sees "paypal.com" → trusts it ← VICTIM
//    Parser: splits by '.', takes slice(-2) → 'evil.ru' ← TRUE OWNER
//            subdomainLabel = 'paypal.com.secure-login' ← deceptive prefix
//
//  RTL ALGORITHM:
//    hostname.split('.') → ['paypal', 'com', 'secure-login', 'evil', 'ru']
//    slice(-2).join('.') → 'evil.ru'          ← root domain (registered)
//    slice(0,-2).join('.')→ 'paypal.com.secure-login' ← fake subdomain
// ───────────────────────────────────────────────────────────────────────────

const URL_SHORTENERS = [
  'bit.ly', 't.co', 'tinyurl.com', 'ow.ly', 'is.gd', 'rb.gy',
  'cutt.ly', 'buff.ly', 'tiny.cc', 'goo.gl', 'rebrand.ly', 'short.link',
  'v.gd', 'clck.ru', 'smarturl.it', 'po.st',
];

// Brand names that should NEVER appear as subdomains of a different root domain.
// e.g. paypal.com is fine; paypal.verify-login.com is a subdomain trap.
const SUBDOMAIN_TRAP_BRANDS = [
  'paypal', 'microsoft', 'google', 'amazon', 'apple', 'netflix',
  'facebook', 'instagram', 'twitter', 'security', 'account',
  'login', 'verify', 'secure', 'banking', 'chase', 'wellsfargo',
  'citibank', 'outlook', 'dropbox', 'linkedin',
];

export function dissectUrl(rawUrl) {
  let normalized = rawUrl.trim();
  if (!/^https?:\/\//i.test(normalized)) normalized = 'https://' + normalized;

  const result = {
    original: rawUrl,
    hostname: '',
    rootDomain: '',     // ← the registrable domain (true owner) — always last 2 labels
    subdomainLabel: '', // ← everything left of the root (the deceptive part)
    path: '',
    isTrap: false,
    trapBrand: null,
    isShortener: false,
    visualIllusions: [],
    flags: [],
    valid: true,
  };

  try {
    const parsed = new URL(normalized);
    result.hostname = parsed.hostname.toLowerCase();
    result.path     = parsed.pathname;

    // ── RIGHT-TO-LEFT PARSE ─────────────────────────────────────────────
    const parts = result.hostname.split('.');
    result.rootDomain      = parts.slice(-2).join('.');   // true authority
    result.subdomainLabel  = parts.length > 2             // deceptive prefix
      ? parts.slice(0, -2).join('.')
      : '';

    // ── Shortener check ─────────────────────────────────────────────────
    result.isShortener = URL_SHORTENERS.some(
      (s) => result.hostname === s || result.hostname.endsWith('.' + s)
    );

    // ── Subdomain trap check ─────────────────────────────────────────────
    // A subdomain trap exists when the subdomain LABEL contains a brand name
    // but the root domain is a different (attacker-owned) domain.
    if (result.subdomainLabel) {
      const matchedBrand = SUBDOMAIN_TRAP_BRANDS.find((b) =>
        result.subdomainLabel.includes(b)
      );
      if (matchedBrand) {
        result.isTrap    = true;
        result.trapBrand = matchedBrand;
        result.flags.push(`Fake subdomain "${result.subdomainLabel}" mimics "${matchedBrand}"`);
      }
    }

    // ── Visual illusion check ────────────────────────────────────────────
    result.visualIllusions = checkVisualIllusions(result.hostname);

    if (result.isShortener) {
      result.flags.push('URL shortener hides the true destination domain');
    }

  } catch {
    result.valid = false;
    result.flags.push('Malformed or unparseable URL');
  }

  return result;
}

/** Extracts and dissects all URLs from a block of text. */
export function extractAndDissectUrls(text) {
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;
  const unique = [...new Set(text.match(urlRegex) || [])];
  return unique.map(dissectUrl);
}


// ───────────────────────────────────────────────────────────────────────────
//  URL SHORTENER EXPANDER  (Async Placeholder)
//
//  PURPOSE: Follow HTTP 301/302 redirect chains on shortened URLs to reveal
//  the hidden final destination (e.g. bit.ly/3xK9mPq → malicious-phish.ru/harvest).
//
//  WHY THIS MUST BE SERVER-SIDE:
//    Browser fetch() is subject to the Same-Origin Policy and CORS headers.
//    URL shorteners do NOT include Access-Control-Allow-Origin headers in their
//    redirect responses — they're designed for browsers, not for CORS preflight.
//    A direct browser fetch to bit.ly will be blocked with a CORS error.
//
//  PRODUCTION IMPLEMENTATION:
//    Deploy a server-side proxy endpoint, e.g.:
//      GET /api/expand?url=https://bit.ly/3xK9mPq
//    Server-side Node.js example using `got`:
//      const { url: finalUrl } = await got(shortUrl, { followRedirect: true });
//    Then pass finalUrl back to the client for display.
//
//  This function simulates the async flow and returns a placeholder result.
// ───────────────────────────────────────────────────────────────────────────
export async function expandUrlShortener(shortUrl) {
  // Simulate async network call
  await new Promise((resolve) => setTimeout(resolve, 900));

  return {
    original: shortUrl,
    expanded: null, // populated by real proxy call
    status: 'PROXY_REQUIRED',
    note: 'Requires server-side proxy to follow HTTP 301/302 redirects. CORS blocks browser-side expansion. Deploy /api/expand?url=... with Node.js got or axios (followRedirect: true).',
  };
}


// ───────────────────────────────────────────────────────────────────────────
//  VISUAL ILLUSION CHECKER
//  Detects two classes of domain deception:
//
//  1. HOMOGLYPH SUBSTITUTION
//     Unicode characters visually indistinguishable from ASCII equivalents.
//     Example: Cyrillic 'а' (U+0430) looks identical to Latin 'a' (U+0061).
//     A domain "pаypal.com" with Cyrillic 'а' passes visual inspection but
//     is a completely different domain in DNS.
//
//  2. TYPOSQUATTING
//     Deliberate misspellings of brand names designed to be registered as
//     domains and catch typo-prone visitors or evade keyword filters.
//     Detection: Levenshtein edit distance ≤ 2 from any known brand name.
//     Example: 'paypa1.com' → edit distance from 'paypal' = 1 → flagged.
//
//  LEVENSHTEIN DISTANCE:
//    Minimum number of single-character edits (insertions, deletions,
//    substitutions) needed to transform string A into string B.
//    A distance of 1–2 against a known brand with ≥ 4 chars = typosquat.
// ───────────────────────────────────────────────────────────────────────────

// Homoglyph map: Unicode lookalike → its ASCII equivalent
const HOMOGLYPH_MAP = {
  'а': 'a',  // Cyrillic
  'е': 'e',  // Cyrillic
  'о': 'o',  // Cyrillic
  'р': 'p',  // Cyrillic
  'с': 'c',  // Cyrillic
  'і': 'i',  // Cyrillic
  'ο': 'o',  // Greek omicron
  'υ': 'u',  // Greek upsilon
  'ν': 'v',  // Greek nu
  'ℓ': 'l',  // Script l
  'ı': 'i',  // Dotless i (Turkish)
};

// Known brands used as typosquat targets
const KNOWN_BRANDS = [
  'paypal', 'microsoft', 'google', 'amazon', 'apple', 'netflix',
  'facebook', 'instagram', 'linkedin', 'dropbox', 'outlook', 'chase',
];

/** Computes Levenshtein edit distance between two strings. */
function levenshteinDistance(a, b) {
  const dp = Array.from({ length: b.length + 1 }, (_, i) => [i]);
  dp[0] = Array.from({ length: a.length + 1 }, (_, i) => i);
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      dp[i][j] = b[i - 1] === a[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j - 1], dp[i][j - 1], dp[i - 1][j]);
    }
  }
  return dp[b.length][a.length];
}

export function checkVisualIllusions(domain) {
  const findings = [];
  const firstLabel = domain.split('.')[0]; // Only check the primary label

  // ── Homoglyph check ───────────────────────────────────────────────────
  for (const [glyph, ascii] of Object.entries(HOMOGLYPH_MAP)) {
    if (domain.includes(glyph)) {
      findings.push({
        type: 'homoglyph',
        detail: `'${glyph}' (Unicode) impersonates '${ascii}' (ASCII)`,
      });
    }
  }

  // ── Typosquat check ───────────────────────────────────────────────────
  for (const brand of KNOWN_BRANDS) {
    if (firstLabel === brand) continue; // Exact match — not a typosquat
    if (firstLabel.length < 4) continue; // Too short to be meaningful

    const dist = levenshteinDistance(firstLabel, brand);
    if (dist > 0 && dist <= 2) {
      findings.push({
        type: 'typosquat',
        detail: `'${firstLabel}' ≈ '${brand}' (edit distance: ${dist})`,
      });
    }

    // Check for brand embedded with insertions: pay-pal, pay_pal, paypa1
    const stripped = firstLabel.replace(/[-_0-9]/g, '');
    if (stripped !== brand && stripped.includes(brand) && stripped !== firstLabel) {
      findings.push({
        type: 'brand-insertion',
        detail: `'${brand}' embedded in '${firstLabel}' with obfuscating characters`,
      });
    }
  }

  return findings;
}


// ───────────────────────────────────────────────────────────────────────────
//  MAIN RULE ENGINE RUNNER
//  Orchestrates all rule-based checks and computes a pre-analysis risk score.
//  Score is capped at 65 so Gemini always has meaningful headroom to adjust
//  the final verdict based on email body content and context.
// ───────────────────────────────────────────────────────────────────────────
export function runRuleBasedAnalysis(emailText) {
  const headers = parseHeaders(emailText);
  const urls    = extractAndDissectUrls(emailText);
  const flags   = [];
  let ruleScore = 0;

  // ── Flag: Sender Domain Mismatch (weight: 35) ─────────────────────────
  if (headers.domainMismatch) {
    ruleScore += 35;
    flags.push({
      severity: 'critical',
      label: 'Sender Domain Mismatch',
      detail: headers.mismatches.join('; '),
    });
  }

  // ── Flag: Subdomain Trap URLs (weight: 15 per URL, max 30) ───────────
  const trapUrls = urls.filter((u) => u.isTrap);
  if (trapUrls.length > 0) {
    ruleScore += Math.min(30, 15 * trapUrls.length);
    flags.push({
      severity: 'critical',
      label: 'Subdomain Trap URLs',
      detail: `${trapUrls.length} URL(s) use brand-impersonating subdomain prefixes`,
    });
  }

  // ── Flag: URL Shorteners (weight: 10) ────────────────────────────────
  const shortUrls = urls.filter((u) => u.isShortener);
  if (shortUrls.length > 0) {
    ruleScore += 10;
    flags.push({
      severity: 'medium',
      label: 'URL Shortener Detected',
      detail: `${shortUrls.length} shortened URL(s) hide the true destination domain`,
    });
  }

  // ── Flag: Visual Illusions / Typosquatting (weight: 20) ──────────────
  const illusionUrls = urls.filter((u) => u.visualIllusions.length > 0);
  if (illusionUrls.length > 0) {
    ruleScore += 20;
    flags.push({
      severity: 'high',
      label: 'Visual Illusion / Typosquatting',
      detail: `Detected in: ${illusionUrls.map((u) => u.hostname).join(', ')}`,
    });
  }

  return {
    headers,
    urls,
    flags,
    ruleScore: Math.min(ruleScore, 65), // cap at 65 — Gemini adjusts the rest
  };
}
