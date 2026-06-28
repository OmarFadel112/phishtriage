# PhishTriage Windows — Troubleshooting Decision Tree

Use this guide if something goes wrong. Find your symptom and follow the flowchart.

---

## 🔴 CRITICAL: App Won't Start

### Symptom: "npm: command not found" or "'npm' is not recognized"

```
Are you in Command Prompt or PowerShell?
  ├─ YES, and I just installed Node.js
  │  └─ SOLUTION: Restart your computer. Windows needs to update PATH.
  │              Then try again.
  │
  └─ YES, but Node.js has been installed for a while
     ├─ Try: node --version
     │ └─ Got a version number?
     │   ├─ YES  → Weird. Try: npm --version
     │   │       If that fails → SOLUTION: Uninstall Node.js, reinstall from
     │   │       https://nodejs.org/
     │   │
     │   └─ NO   → SOLUTION: Node.js not in PATH. Uninstall and reinstall,
     │           making sure to check "Add to PATH" during setup.
     │
     └─ I'm using PowerShell
        └─ SOLUTION: Try opening **Command Prompt (cmd.exe)** instead.
                    PowerShell can have permission issues.
```

---

### Symptom: "npm install" fails with errors

```
What errors do you see?
  │
  ├─ "401 Unauthorized" or "403 Forbidden"
  │  └─ SOLUTION: npm registry is slow or blocked
  │     Try: npm cache clean --force
  │     Then: npm install
  │
  ├─ "EACCES: permission denied"
  │  └─ SOLUTION: Run Command Prompt or PowerShell **as Administrator**
  │     (Right-click → "Run as administrator")
  │
  ├─ "ERR! code ERESOLVE"
  │  └─ SOLUTION: Try: npm install --legacy-peer-deps
  │
  ├─ "module not found" or "npm ERR! peer dep missing"
  │  └─ SOLUTION: Delete node_modules and try again
  │     cmd: rmdir /s node_modules
  │     then: npm install
  │
  └─ Something else (long red text)
     └─ SOLUTION: Copy the error message, search it on Google or StackOverflow
```

---

### Symptom: "npm run dev" fails or hangs

```
What happens?
  │
  ├─ Hangs after showing "VITE ready in XXX ms"
  │  └─ SOLUTION: The app IS running. Open http://localhost:5173/ in your
  │     browser. If nothing loads, wait 5 seconds and try again.
  │
  ├─ Shows "Port 5173 already in use"
  │  └─ SOLUTION: Another app is using that port. Either:
  │     A) Close any other instances of PhishTriage
  │     B) Or run on a different port:
  │        npm run dev -- --port 3000
  │        Then go to http://localhost:3000/
  │
  ├─ Shows "EADDRINUSE" error
  │  └─ SOLUTION: Same as above — port is already in use.
  │
  └─ Shows "Error: Cannot find module"
     └─ SOLUTION: Dependencies aren't installed
        Run: npm install
        Then: npm run dev
```

---

## 🟡 WARNING: App Loads But Doesn't Work

### Symptom: Right pane stays empty / blank

```
Is the left pane (email input) working?
  │
  ├─ NO — nothing appears on the left either
  │  └─ SOLUTION: Browser can't load the app
  │     A) Hard refresh: Ctrl+Shift+R (or Cmd+Shift+R on Mac)
  │     B) Clear browser cache: Settings → Clear Browsing Data
  │     C) Try a different browser (Chrome, Edge, Firefox, Safari)
  │
  └─ YES — left pane works fine
     ├─ Did you paste an email?
     │  ├─ NO  → Paste an email first (click "LOAD SAMPLE" for a demo)
     │  │
     │  └─ YES → Click "⚡ RUN TRIAGE ANALYSIS"
     │          Did anything happen?
     │          ├─ Nothing at all
     │          │  └─ SOLUTION: Open F12 → Console tab, look for RED errors
     │          │              Copy the error, see section below
     │          │
     │          └─ Right pane shows a loading spinner / "analyzing..."
     │             └─ SOLUTION: Just wait! Gemini API is responding.
     │                          It typically takes 2–5 seconds.
```

---

### Symptom: "Analyzing..." spinner never stops

```
How long have you been waiting?
  │
  ├─ Less than 10 seconds
  │  └─ SOLUTION: Keep waiting. Gemini can be slow on the first call.
  │
  ├─ 10–30 seconds
  │  └─ SOLUTION: Check your internet connection. If you're offline,
  │     the request will eventually time out. Reconnect and try again.
  │
  └─ More than 30 seconds
     └─ SOLUTION: Something is stuck. Reload the page (F5 or Ctrl+R)
        Try again. If it keeps hanging:
        A) Check internet connection
        B) Check your Gemini API key (F12 → Console, look for errors)
        C) Try a shorter email (very long emails might time out)
```

---

### Symptom: See an error in the right pane

```
What's the error message?
  │
  ├─ "Invalid or missing API key" or "401 Unauthorized"
  │  └─ Your Gemini API key is wrong or missing
  │     SOLUTION:
  │     1) Go to https://aistudio.google.com/
  │     2) Get a fresh API key (delete old one if needed)
  │     3) Copy the full key (no extra spaces)
  │     4) Paste it in the "GEMINI KEY" field at the top right
  │     5) Try again
  │
  ├─ "Rate limit exceeded" or "429"
  │  └─ SOLUTION: You've sent too many requests too fast. Wait 30 seconds
  │              and try again.
  │
  ├─ "Network error" or "Failed to fetch"
  │  └─ SOLUTION: Internet connection problem
  │     A) Check you're connected to WiFi/ethernet
  │     B) Try pinging Google: ping google.com (in Command Prompt)
  │     C) If pinging works but app still fails, firewall might be
  │        blocking. Try turning off antivirus/firewall temporarily.
  │
  ├─ "Failed to parse Gemini response as JSON"
  │  └─ SOLUTION: Gemini API returned something unexpected
  │     A) Try again (might be a transient issue)
  │     B) Try with a simpler email
  │     C) If it keeps happening, try a different API key
  │
  └─ Something else
     └─ SOLUTION: Open F12 → Console tab, copy the exact error,
                 search it on Google or ask for help
```

---

### Symptom: See red errors in F12 Console

```
How to check:
  1) Press F12 (or Ctrl+Shift+I)
  2) Click the "Console" tab
  3) Look for RED text starting with "Error:" or with a red 🔴 icon

What's the error?
  │
  ├─ Something about "CORS" or "Access-Control"
  │  └─ SOLUTION: API request blocked by browser security policy
  │     Usually means wrong domain or network issue.
  │     A) If you're running locally, make sure you're at
  │        http://localhost:5173/ (not an IP address)
  │     B) If you're on a network, check if a proxy/firewall is
  │        blocking requests to generativelanguage.googleapis.com
  │
  ├─ "Cannot read property X of undefined" or "is not a function"
  │  └─ SOLUTION: Bug in the code (rare)
  │     A) Hard refresh: Ctrl+Shift+R
  │     B) Delete browser cache
  │     C) Try a different browser
  │
  ├─ "Failed to fetch" / "net::ERR_"
  │  └─ SOLUTION: Network / connectivity issue
  │     A) Check internet connection
  │     B) Try from a different browser
  │     C) Try from a different computer (to isolate the issue)
  │
  └─ Something about "localhost" or "connection refused"
     └─ SOLUTION: Dev server isn't running
        A) Is the Command Prompt running npm still open?
        B) Try: npm run dev again
        C) Make sure npm isn't showing errors
```

---

## 🟢 YELLOW: Analysis Works But Seems Wrong

### Symptom: Threat score seems too high / too low

```
Is the analysis completely wrong?
  │
  ├─ Using the sample email
  │  └─ Sample email should score ~75–85 (red) — it's full of phishing tactics
  │     If you see green (low score), something is wrong
  │     SOLUTION: Try clearing your browser cache (Ctrl+Shift+Delete)
  │              and reloading the page
  │
  └─ Using a real email
     └─ Threat scores are subjective. Gemini might score conservatively.
        This is OK — the verdict (Safe/Suspicious/Malicious) is more important
        than the exact number.
```

---

### Symptom: Verdict doesn't match the flags

```
Example: Many critical flags, but verdict is "Safe"
  │
  └─ SOLUTION: The rule engine and Gemini sometimes disagree. That's OK.
     The Gemini verdict (cognitive analysis) is the final word.
     If you think it's wrong, you can:
     A) Try rephrasing the email slightly and re-analyzing
     B) Export the report and share it with your team for review
     C) Use this as training data to improve prompts
```

---

### Symptom: URL dissection doesn't show flags

```
What URLs are in your email?
  │
  ├─ No URLs
  │  └─ SOLUTION: The tool can't flag URLs if there aren't any.
  │     Try the sample email (has multiple URLs)
  │
  ├─ URLs look normal (e.g., https://google.com)
  │  └─ SOLUTION: Normal URLs don't get flagged. The tool flags:
  │     • Shortened URLs (bit.ly, t.co)
  │     • Subdomain traps (paypal.com.evil.ru)
  │     • Typosquats (paypa1.com)
  │     • Homoglyphs (Unicode tricks)
  │
  └─ URLs with those tricks, but no flags shown
     └─ SOLUTION: Possible bug. Try:
        A) Reload the page (F5)
        B) Try the sample email (guaranteed to have flags)
        C) Check F12 Console for errors
```

---

### Symptom: Export doesn't work

```
What happens when you click "⬇ EXPORT REPORT"?
  │
  ├─ Nothing happens
  │  └─ SOLUTION: Make sure you've run an analysis first
  │     (the button only appears after you have results)
  │     Try: LOAD SAMPLE → RUN ANALYSIS → wait for results
  │          → now EXPORT REPORT should appear and work
  │
  ├─ File downloads but won't open
  │  └─ SOLUTION: Try opening with VS Code or Notepad:
  │     A) Right-click the JSON file → Open with → Choose an app
  │     B) Pick VS Code or Notepad
  │     C) If it opens as gibberish, the file might be corrupted
  │        → Try exporting again
  │
  └─ Downloaded file is empty or tiny
     └─ SOLUTION: Something went wrong with the export
        A) Try again (might be a fluke)
        B) Reload the page and re-run analysis
        C) Try a different email
```

---

## 🔧 ADVANCED: Performance & Optimization

### Symptom: App feels slow

```
Where is it slow?
  │
  ├─ Takes a long time to load http://localhost:5173/
  │  └─ SOLUTION: Vite is building. This happens on first load.
  │     Subsequent loads are fast. Wait 10 seconds.
  │
  ├─ Rule engine is slow (right pane takes >2 seconds to show flags)
  │  └─ This shouldn't happen. Rule engine is instant.
  │     SOLUTION: Check F12 Console for errors, or try:
  │     A) Close other browser tabs
  │     B) Restart npm run dev
  │     C) Try a shorter email
  │
  └─ Gemini analysis is slow (>10 seconds)
     └─ SOLUTION: That's normal during high-traffic times. Gemini is free
        and can queue requests. Either:
        A) Wait patiently
        B) Close the app and come back in a few minutes
```

---

### Symptom: Browser tab crashes / becomes unresponsive

```
What were you doing?
  │
  ├─ Analyzing a very long email (>50KB)
  │  └─ SOLUTION: The rule engine has to parse lots of URLs and headers.
  │     Try a shorter email, or break it into chunks.
  │
  ├─ Opened DevTools (F12) and it froze
  │  └─ SOLUTION: DevTools can slow down browsers.
  │     Close it: Press F12 again
  │
  └─ Just random crashes
     └─ SOLUTION: Browser memory leak (rare). Try:
        A) Close the tab and reopen http://localhost:5173/
        B) Restart your browser
        C) Try a different browser
```

---

## 📞 When to Get Help

If you've tried all the solutions above and it **still doesn't work**, gather this info:

1. **Windows version:** Settings → System → About → Windows version
2. **Node.js version:** `node --version`
3. **npm version:** `npm --version`
4. **Exact error message:** Copy-paste from Console (F12) or Command Prompt
5. **What you did:** Step-by-step what you were trying when it failed
6. **Screenshot:** A screenshot of the error (helpful for visual bugs)

Then share this with:
- Your team lead
- A colleague who's good with tech
- A Stack Overflow question (search first, might already be answered)

---

## 🎓 Quick Sanity Checks

Before assuming something is broken:

- ✅ Is Node.js installed? (`node --version`)
- ✅ Is npm installed? (`npm --version`)
- ✅ Are you in the `phishtriage` folder? (Look for `package.json`)
- ✅ Did you run `npm install`? (Look for `node_modules/` folder)
- ✅ Is the dev server running? (Should say "VITE ready" in Command Prompt)
- ✅ Are you opening the right URL? (http://localhost:5173/, not another port)
- ✅ Is your internet working? (Try opening google.com)
- ✅ Do you have a valid Gemini API key? (From https://aistudio.google.com/)
- ✅ Did you paste an email before clicking "RUN ANALYSIS"?
- ✅ Are you waiting long enough? (Gemini can take 2–5 seconds)

If all of these are green ✅, the app should work!

---

**Still stuck? Read WINDOWS_SETUP_GUIDE.md for detailed step-by-step instructions.**
