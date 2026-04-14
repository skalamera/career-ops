# Mode: offer — Full Evaluation A-F

When the candidate pastes an offer (text or URL), always deliver all 6 blocks:

## Step 0 — Archetype Detection

Classify the offer into one of the archetypes (see `_shared.md`). If hybrid, indicate the 2 closest. This determines:
- Which proof points to prioritize in Block B
- How to rewrite the summary in Block E
- Which STAR stories to prepare in Block F

## Block A — Role Summary

Table with:
- Detected archetype
- Domain (platform/agentic/LLMOps/ML/enterprise)
- Function (build/consult/manage/deploy)
- Seniority
- Remote (full/hybrid/onsite)
- Team size (if mentioned)
- TL;DR in 1 sentence

## Block B — CV Match

Read `cv.md`. Create a table with each JD requirement mapped to exact lines from the CV.

**Adapted by archetype:**
- If Technical Support Manager → prioritize team leadership, CSAT, coaching proof points
- If Support Engineering Manager → prioritize technical depth (APIs, integrations), escalation ownership
- If Support Operations Manager → prioritize tooling automation, forecasting, workflow design
- If Technical Support Director → prioritize org design, multi-team leadership, cross-functional strategy
- If Support Engineering Director → prioritize platform support at scale, incident command, technical credibility

**Gaps section** with a mitigation strategy for each. For each gap:
1. Is it a hard blocker or a nice-to-have?
2. Can the candidate demonstrate adjacent experience?
3. Is there a portfolio project that covers this gap?
4. Concrete mitigation plan (cover letter phrase, quick project, etc.)

## Block C — Level & Strategy

1. **Detected level** in the JD vs. **candidate's natural level for that archetype**
2. **"Sell senior without lying" plan**: specific phrases adapted to the archetype, concrete achievements to highlight, how to position the leadership + builder angle as an advantage
3. **"If they downlevel me" plan**: accept if comp is fair, negotiate 6-month review, clear promotion criteria

## Block D — Comp & Demand

Use WebSearch for:
- Current salaries for the role (Glassdoor, Levels.fyi, Blind)
- Company's compensation reputation
- Role demand trend

Table with data and cited sources. If no data available, say so instead of inventing.

## Block E — Customization Plan

| # | Section | Current state | Proposed change | Why |
|---|---------|---------------|-----------------|-----|
| 1 | Summary | ... | ... | ... |
| ... | ... | ... | ... | ... |

Top 5 CV changes + Top 5 LinkedIn changes to maximize match.

## Block F — Interview Plan

6-10 STAR+R stories mapped to JD requirements (STAR + **Reflection**):

| # | JD Requirement | STAR+R Story | S | T | A | R | Reflection |
|---|----------------|--------------|---|---|---|---|------------|

The **Reflection** column captures what was learned or what would be done differently. This signals seniority — junior candidates describe what happened, senior candidates extract lessons.

**Story Bank:** If `interview-prep/story-bank.md` exists, check if any of these stories are already there. If not, append new ones. Over time this builds a reusable bank of 5-10 master stories that can be adapted to any interview question.

**Selected and framed by archetype:**
- Technical Support Manager → emphasize team leadership, CSAT ownership, player-coach style
- Support Engineering Manager → emphasize technical decisions, escalation ownership, eng partnership
- Support Operations Manager → emphasize tooling automation, forecasting, workflow design
- Technical Support Director → emphasize org design, cross-functional strategy, exec communication
- Support Engineering Director → emphasize platform support at scale, incident command, technical credibility

Also include:
- 1 recommended case study (which project to present and how)
- Red-flag questions and how to handle them (e.g., "why did you leave?", "do you have direct reports?")

---

## Post-Evaluation

**ALWAYS** after generating blocks A-F:

### 1. Save report .md

Save the full evaluation to `reports/{###}-{company-slug}-{YYYY-MM-DD}.md`.

- `{###}` = next sequential number (3 digits, zero-padded)
- `{company-slug}` = company name in lowercase, no spaces (use hyphens)
- `{YYYY-MM-DD}` = current date

**Report format:**

```markdown
# Evaluation: {Company} — {Role}

**Date:** {YYYY-MM-DD}
**Archetype:** {detected}
**Score:** {X/5}
**URL:** {job posting URL}
**PDF:** {path or pending}

---

## A) Role Summary
(full content of Block A)

## B) CV Match
(full content of Block B)

## C) Level & Strategy
(full content of Block C)

## D) Comp & Demand
(full content of Block D)

## E) Customization Plan
(full content of Block E)

## F) Interview Plan
(full content of Block F)

## G) Draft Application Answers
(only if score >= 4.5 — draft answers for the application form)

---

## Extracted Keywords
(list of 15-20 JD keywords for ATS optimization)
```

### 2. Register in tracker

**ALWAYS** register in `data/applications.md`:
- Next sequential number
- Current date
- Company
- Role
- Score: average match (1-5)
- Status: `Evaluated`
- PDF: ❌ (or ✅ if auto-pipeline generated PDF)
- Report: relative link to report .md (e.g., `[001](reports/001-company-2026-01-01.md)`)

**Tracker format:**

```markdown
| # | Date | Company | Role | Score | Status | PDF | Report |
```
