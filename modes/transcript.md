# Mode: transcript — Interview Transcript Analysis

When the user pastes an interview transcript, run the full analysis pipeline.

## Step 0 — Identify Application

Match the transcript to a tracked application:
- If the user specifies a number (e.g., "#085"), use that directly
- Otherwise, match by company name + role from context
- Confirm the match with the user before proceeding
- Read `data/applications.md` to verify the entry exists

## Step 1 — Save Transcript

Save to `transcripts/{###}-{company-slug}-round-{N}-{YYYY-MM-DD}.md`

**Determine round number:**
- From the Status column: "Round 1" → round 1, "Round 2" → round 2, etc.
- If status is "Applied" or "Evaluated", this is likely round 1 — update status to "Round 1"
- If status already shows a round, the new transcript is for that round
- If the user says "round 2" or "second interview", use that
- If ambiguous, ask the user

**File format:**

```markdown
# Transcript: {Company} — {Role} (Round {N})

**Application:** #{###}
**Date:** YYYY-MM-DD
**Round:** {N}
**Interviewer(s):** {from Interview notes column or user-provided}

---

{pasted transcript text}
```

## Step 2 — Gather Context

Read ALL of the following before analysis:

1. `data/applications.md` — the tracker row for this application
2. `reports/{###}-*.md` — the full evaluation report (Blocks A-F)
3. All files matching `transcripts/{###}-*` — prior transcripts for this application
4. `cv.md` — candidate's CV
5. `config/profile.yml` — targets and comp expectations
6. `interview-prep/story-bank.md` — prepared STAR+R stories

## Step 3 — Analyze and Calculate Likelihood

Evaluate the transcript against all gathered context.

### From the report

- **Block B (CV Match):** Were gaps probed in the interview? How did the candidate handle them?
- **Block C (Level & Strategy):** Did the interview confirm or challenge the level read?
- **Block D (Comp & Demand):** Was compensation discussed? Any alignment/misalignment signals?

### From the transcript itself

**Positive signals (increase %):**
- Interviewer enthusiasm, energy, extended discussion time
- Discussion of next steps, timeline, additional rounds
- "When can you start?" or logistics/onboarding talk
- Comp/benefits discussion initiated by the company
- Team introductions, project specifics, "you'd work on X"
- Interviewer sharing internal challenges (trust signal)
- Candidate successfully addressed known gaps from Block B
- Strong use of prepared STAR stories from story bank

**Negative signals (decrease %):**
- Hedging language: "we have several strong candidates," "we'll get back to you"
- No mention of next steps at all
- Known gaps probed without satisfactory answer
- Interview felt short or rushed (ended early)
- Comp misalignment surfaced in conversation
- Culture/values misfit signals
- Interviewer disengagement (short responses, no follow-ups)
- Overqualified or underqualified concerns raised

### From prior transcripts (if any)

- Is momentum building or declining across rounds?
- Are new concerns emerging or old ones being resolved?
- Consistency of positive/negative signals round over round

### Baseline by round

| Stage | Baseline Range |
|-------|---------------|
| Round 1 (recruiter screen) | 15–25% |
| Round 2 (hiring manager) | 25–40% |
| Round 3 (panel/technical) | 40–60% |
| Round 4 (exec/final) | 55–75% |
| Round 5 (offer imminent) | 70–85% |

Start from baseline, then adjust up or down based on signal analysis. Be calibrated — if the transcript has weak signals, say so. The user needs actionable truth, not optimism.

## Step 4 — Output

Display the analysis to the user:

```
### Likelihood: {N}%

**Signals driving this estimate:**
- [+] {positive signal with specific transcript quote/evidence}
- [+] {positive signal}
- [-] {negative signal with specific transcript quote/evidence}
- [-] {negative signal}

**Momentum vs prior rounds:** (only if prior transcripts exist)
{How signals have changed — building, declining, or steady}

**Recommendations for next round:**
- {Specific thing to prepare based on what came up}
- {Gap to address proactively}
- {Question to ask the interviewer}
```

## Step 5 — Update Tracker

Edit `data/applications.md`:
- Set column 12 (Likelihood) to `{N}%` for this application's row
- If status should advance (e.g., "Applied" → "Round 1"), update status too

## Step 6 — Append to Report

Add a new section to the existing report file at `reports/{###}-*.md`:

```markdown
## {next letter}) Interview Analysis — Round {N}

**Date:** YYYY-MM-DD
**Interviewer(s):** {names}
**Likelihood:** {N}%

### Signals
- [+] {signal}
- [-] {signal}

### Momentum
{comparison with prior rounds}

### Recommendations
- {prep item}
```

Use the next available letter after the existing sections (typically G or H if G exists for draft answers).

## Step 7 — Update Story Bank (if applicable)

If the interview surfaced new STAR-worthy stories or validated existing ones, update `interview-prep/story-bank.md`:
- Mark stories that were successfully used: add `✅ Used in {Company} Round {N}` 
- Add new stories that emerged naturally during the interview
