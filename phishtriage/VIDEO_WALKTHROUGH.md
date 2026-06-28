# PhishTriage Windows Setup — Step-by-Step Video Walkthrough

Follow along as if I'm sitting next to you, walking you through each step.

---

## 🎬 Part 1: Prerequisites Check (2 minutes)

### What You Need
- Windows 10 or 11
- Internet connection
- Administrator access (for setup, not everyday use)
- ~500 MB free disk space
- About 20 minutes total

### Do You Have Node.js?

Open **Command Prompt**:
1. Press **Win+R** (Run dialog appears)
2. Type: `cmd`
3. Press **Enter**

A black window opens. Now type:
```
node --version
```

**Expected:** You see something like `v18.17.0`

**If you see "command not found" or "is not recognized":**
- Go to https://nodejs.org/
- Click the big **LTS** button (download the stable version)
- Run the installer
- Accept everything, keep defaults
- **Restart your computer**
- Try `node --version` again

---

## 🎬 Part 2: Extract the Project (1 minute)

### Unzip the File

1. Find `phishtriage-soc-toolkit.zip` (probably in Downloads)
2. Right-click it
3. Select **"Extract All..."**
4. Choose where to save (e.g., `C:\Users\YourName\Documents\`)
5. Click **"Extract"**

You now have a folder called `phishtriage/` with all the source code inside.

### Open Command Prompt in That Folder

1. Open Windows Explorer
2. Navigate to the `phishtriage/` folder
3. Click the address bar at the top (the path)
4. Delete everything and type: `cmd`
5. Press **Enter**

A Command Prompt window opens **in** the phishtriage folder. Perfect!

---

## 🎬 Part 3: Install Dependencies (2–3 minutes)

### The Command

You're in the Command Prompt, in the `phishtriage/` folder. Type:

```
npm install
```

Press **Enter** and **wait**. You'll see a lot of green text scrolling. This is normal. It's downloading ~400 packages from the internet.

### What to Expect

```
added 250 packages in 1m 23s
```

You should see a message like that at the end. This means success! ✓

### If You See Red Errors

```
npm ERR! code ERESOLVE
npm ERR! ERESOLVE unable to resolve dependency tree
```

Try this instead:
```
npm install --legacy-peer-deps
```

This tells npm to install even if there are minor version conflicts (safe for this project).

---

## 🎬 Part 4: Get Your Gemini API Key (2 minutes)

### Open Google AI Studio

1. Go to https://aistudio.google.com/ in your browser
2. Sign in with your Google account (or create a free one)
3. Look for a button that says **"Get API key"** or **"Create API key"**
4. Click it

A small window appears with your API key. It looks like:
```
AIzaSy... (followed by many characters)
```

### Copy the Key

1. Click **"Copy"** button (or manually select and Ctrl+C)
2. The key is now in your clipboard
3. **Keep it secret** — don't share it anywhere

---

## 🎬 Part 5: (Optional) Create .env File (1 minute)

You can paste the key every time you use the app, OR save it in a `.env` file.

### Option A: Use the Helper Scripts

**If you have PowerShell:**
1. Right-click the `phishtriage/` folder
2. Select "Open PowerShell window here"
3. Run: `powershell -ExecutionPolicy Bypass -File setup-helper.ps1`
4. The script will ask if you want to add your API key
5. Paste it, and you're done!

**If you prefer Command Prompt:**
1. You're already in Command Prompt in the `phishtriage/` folder
2. Run: `setup-helper.cmd`
3. Follow the prompts

### Option B: Manual

1. In the `phishtriage/` folder, create a new file
2. Name it: `.env`
   - **Tip for Windows:** Open VS Code → File → New File → type `.env` → Save
   - Or use Command Prompt: `copy .env.example .env`
3. Open `.env` in a text editor (right-click → Edit)
4. Add this line:
   ```
   VITE_GEMINI_API_KEY=AIzaSy...paste_your_key_here...
   ```
5. Save the file

Now the app will auto-load your key every time it starts.

---

## 🎬 Part 6: Start the App (1 minute)

### The Command

In your Command Prompt (still in the `phishtriage/` folder), type:

```
npm run dev
```

Press **Enter** and wait ~5 seconds. You should see:

```
  VITE v5.4.10  ready in 234 ms

  ➜  Local:   http://localhost:5173/
  ➜  press h + enter to show help
```

**The app is now running!**

### Open in Your Browser

Click the link `http://localhost:5173/` or:
1. Open a browser (Chrome, Edge, Firefox)
2. Type in the address bar: `http://localhost:5173/`
3. Press Enter

**The PhishTriage dashboard should load!** You'll see:
- Left pane: "📧 RAW EMAIL INPUT" (empty text area)
- Right pane: "AWAITING EMAIL INPUT" (empty dashboard)
- Top: Logo + API key input field

---

## 🎬 Part 7: Test with Sample Email (3 minutes)

### Load the Sample

1. In the left pane, click the **"LOAD SAMPLE"** button
2. An email instantly appears (if nothing happens, wait 2 seconds)

The email has obvious phishing indicators:
- Mismatched sender domains
- Subdomain trap URLs
- Shortened URLs
- Typosquatted domain

### Run the Analysis

1. Click **"⚡ RUN TRIAGE ANALYSIS"** button
2. If you haven't set your API key, paste it in the top right field now
3. Click the button again

### Watch the Two-Stage Pipeline

**Stage 1 (instant — <1 second):**
- Right pane shows: "⚡ Running rule engine…"
- Flags appear: "Sender Domain Mismatch", "Subdomain Trap URLs", etc.
- Threat gauge starts to fill

**Stage 2 (2–5 seconds):**
- Right pane shows: "🧠 Contacting Gemini API…"
- The threat gauge completes (should be red/critical)
- Final verdict appears: **🚨 Malicious (Block Domain & Escalate)**
- Attack type shows: e.g., "Credential Phishing"
- Recommended actions appear

### Expected Final Results

- **Threat Score:** 75–90 (red)
- **Verdict:** 🚨 Malicious (Block Domain & Escalate)
- **Attack Type:** Credential Phishing
- **Flags:** 
  - ⚠ Sender Domain Mismatch
  - ⚠ Subdomain Trap URLs
  - ⚠ URL Shortener Detected
- **URL Dissection:** Shows `paypal.com` as DECEPTIVE SUBDOMAIN, `mailservices-hub.xyz` as TRUE ROOT DOMAIN
- **Header Forensics:** Shows From, Return-Path, Reply-To with mismatches highlighted in red

**If you see all this: Your setup is working perfectly! ✓**

---

## 🎬 Part 8: Test Other Views (2 minutes)

### Switch to Employee Checklist

1. On the right pane, click **"👤 EMPLOYEE CHECKLIST"** button
2. The view changes to a simplified red-flag checklist
3. You see 8 items like:
   - 🔴 Suspicious sender address
   - 🔴 Display name doesn't match the domain
   - 🔴 Creates urgency or threatens consequences
   - etc.

This is designed for non-technical employees. It's a clearer warning than the technical view.

### Switch Back to Technical View

Click **"⚙ SOC TECHNICAL VIEW"** to see all the forensic details again.

---

## 🎬 Part 9: Export a Report (1 minute)

### Download JSON Report

1. Make sure you've run an analysis (you should have done this above)
2. In the top right, click **"⬇ EXPORT REPORT"** button
3. A file like `phishtriage-report-1234567890.json` downloads to your Downloads folder

### Open the Report

1. Find the file in your Downloads
2. Right-click it → Open with → Notepad (or VS Code)
3. You see a JSON structure:
   ```json
   {
     "metadata": {...},
     "summary": {...},
     "analysis": {...},
     "technicalFindings": {...},
     "rawEmail": "..."
   }
   ```

This is the **complete triage report** ready to share with your security team.

---

## 🎬 Part 10: Test with a Real Email (Optional, 2 minutes)

### Get Real Email Headers

**From Outlook:**
1. Right-click an email in Outlook
2. Select **"Message Options"** or **"Properties"**
3. Look for **"Internet Headers"** or **"Message Properties"**
4. Copy everything

**From Gmail:**
1. Open an email
2. Click the **⋮ (three dots)** menu
3. Click **"Show original"**
4. Copy the full content

### Test It

1. Click "CLEAR" button in the left pane (clear the sample email)
2. Paste the real email
3. Click "⚡ RUN TRIAGE ANALYSIS"
4. See if the analysis makes sense

**For a legitimate email:**
- Threat score should be 0–30 (green)
- Verdict should be "✅ Safe (Close)"

**For a suspicious email:**
- Threat score should be 40–70 (amber)
- Verdict should be "⚠️ Suspicious (Warn User)"

---

## 🎬 Part 11: Troubleshooting (If Needed)

### Nothing appears on the right after clicking RUN

1. Wait 10 seconds (Gemini API can be slow)
2. Check your internet connection
3. Open F12 (Developer Tools), go to Console tab, look for red errors
4. See **TROUBLESHOOTING_FLOWCHART.md** for detailed fixes

### API key errors

1. Go back to https://aistudio.google.com/
2. Create a new API key (delete the old one)
3. Copy the entire key carefully (no extra spaces)
4. Paste it in the "GEMINI KEY" field
5. Try again

### Port 5173 is already in use

Another app is using it. Run:
```
npm run dev -- --port 3000
```

Then open http://localhost:3000/ instead.

---

## 🎬 Part 12: Daily Use

### To start the app each day:

1. Open Command Prompt
2. Navigate to the `phishtriage/` folder (or open it there directly)
3. Type: `npm run dev`
4. Open http://localhost:5173/
5. Paste suspect emails and analyze

### To stop the app:

Press **Ctrl+C** in the Command Prompt.

---

## 🎬 Advanced: Deploy to a Server

Once you're comfortable, you can deploy PhishTriage to a web server so your whole team can use it:

```bash
npm run build
```

This creates a `dist/` folder with optimized files. Upload this to any web server (Vercel, Netlify, AWS, Azure, etc.).

See the main **README.md** for details.

---

## ✅ Success Checklist

By now, you should be able to check off all of these:

- ✅ Installed Node.js and npm
- ✅ Extracted the project
- ✅ Ran `npm install`
- ✅ Got a Gemini API key
- ✅ Started the app with `npm run dev`
- ✅ Opened http://localhost:5173/
- ✅ Loaded a sample email
- ✅ Ran the analysis
- ✅ Saw rule flags appear instantly
- ✅ Saw threat gauge fill
- ✅ Saw final verdict from Gemini (2–5 seconds)
- ✅ Switched to employee checklist view
- ✅ Downloaded and opened a JSON report
- ✅ No errors in F12 Console
- ✅ Can paste custom emails and analyze them

If you've checked all 15 items, **you're done!** PhishTriage is fully operational. 🎉

---

## 🚀 What's Next?

1. **Use it**: Start analyzing suspicious emails from your inbox
2. **Share it**: Deploy to a web server for your team
3. **Customize**: Modify the sample email, adjust the UI colors, add your org's branding
4. **Integrate**: Set up the URL expansion proxy (see README.md) for better shortener detection
5. **Learn**: Read through the code to understand the rule engine and Gemini integration

Enjoy! 🛡️
