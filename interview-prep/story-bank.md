# Story Bank — Master STAR+R Stories

This file accumulates your best interview stories over time. Each evaluation (Block F) adds new stories here. Instead of memorizing 100 answers, maintain 5-10 deep stories that you can bend to answer almost any behavioral question.

## How it works

1. Every time `/career-ops oferta` generates Block F (Interview Plan), new STAR+R stories get appended here
2. Before your next interview, review this file — your stories are already organized by theme
3. The "Big Three" questions can be answered with stories from this bank:
   - "Tell me about yourself" → combine 2-3 stories into a narrative
   - "Tell me about your most impactful project" → pick your highest-impact story
   - "Tell me about a conflict you resolved" → find a story with a Reflection

## Stories

<!-- Stories will be added here as you evaluate offers -->
<!-- Format:
### [Theme] Story Title
**Source:** Report #NNN — Company — Role
**S (Situation):** ...
**T (Task):** ...
**A (Action):** ...
**R (Result):** ...
**Reflection:** What I learned / what I'd do differently
**Best for questions about:** [list of question types this story answers]
-->

### [Incident Command] SEV-0 Incident Command at Sigma
**Source:** Report #016 — Ashby — Support Engineering Manager Americas
**S:** Enterprise customer data platform outage affecting multiple strategic accounts
**T:** Own the incident: coordinate Engineering, Product, CS; deliver real-time stakeholder updates
**A:** Set up war room, triaged root cause (Snowflake connection pool exhaustion), wrote exec-facing updates every 30 minutes, drove post-mortem
**R:** Resolved in <4 hours; post-mortem produced 3 runbook improvements; CSAT held above 4.8
**Reflection:** The update cadence matters as much as the fix — stakeholders tolerate downtime; they don't tolerate silence
**Best for questions about:** Escalation management, incident response, stakeholder communication under pressure, working with Engineering

### [Tooling / Systems Thinking] Python ML Forecasting Tool at Sigma
**Source:** Report #016 — Ashby — Support Engineering Manager Americas
**S:** Queue volume growing faster than headcount; staffing was reactive and often wrong
**T:** Build a capacity forecasting model to enable proactive planning
**A:** Designed and built Python ML forecasting app integrating ticket + chat volume signals; integrated into weekly staffing review
**R:** Accurately predicted volume spikes; enabled proactive staffing before two major product launches
**Reflection:** I'd have instrumented it for retraining from day one — the first version required manual updates when usage patterns shifted
**Best for questions about:** Data-driven decisions, tooling, proactive problem-solving, Python/technical depth

### [Process Building] Power BI Support Ops Hub at Benchmark
**Source:** Report #016 — Ashby — Support Engineering Manager Americas
**S:** No centralized ops data; leadership was flying blind on support performance metrics
**T:** Design and deliver an ops reporting platform from scratch
**A:** Built Power BI hub with Python pipelines integrating RingCentral API and Freshdesk; designed data model, built ETL, delivered executive dashboards
**R:** Became primary reporting layer for leadership; drove 38% resolution time reduction and 45% FRT improvement
**Reflection:** I built it solo first then handed off — next time I'd involve the consumers (leadership) in the data model design from the start
**Best for questions about:** Building from scratch, process design, cross-functional impact, data and metrics

### [Team Leadership] TSE Coaching Program at Sigma
**Source:** Report #016 — Ashby — Support Engineering Manager Americas
**S:** New TSEs joining fast; escalation rate too high because SEs weren't confident owning complex issues
**T:** Create a structured enablement path for technical competency
**A:** Designed onboarding runbooks, built shadowing framework, introduced weekly technical review sessions for complex escalations
**R:** Escalation rate dropped ~30% within 90 days; TSE-to-TSE peer learning emerged organically
**Reflection:** Mentoring works better when it's pull, not push — engineers who improved fastest were the ones who came to me with questions
**Best for questions about:** Team development, coaching, managing ICs, building culture

### [Cross-Functional] Supportability Feedback Loop at Benchmark
**Source:** Report #016 — Ashby — Support Engineering Manager Americas
**S:** Product bugs surfaced in support were taking months to reach Engineering with context intact
**T:** Build a structured feedback loop between Support and Engineering
**A:** Created a weekly "support signal" digest: top 5 patterns from tickets, tagged by product area, with reproduction steps; presented directly to Product/Engineering in standup
**R:** Time-to-acknowledge dropped from weeks to days; two features shipped directly from support signal data
**Reflection:** The key was making it easy for Engineering to act — a bug report with a Loom walkthrough gets fixed faster than a Jira ticket
**Best for questions about:** Cross-functional collaboration, influencing without authority, Engineering partnership

### [Builder / Independent Project] Jedana — Support Analytics Platform
**Source:** Report #016 — Ashby — Support Engineering Manager Americas
**S:** I wanted to prove I could build, not just manage — and wanted tooling that didn't exist for support teams
**T:** Build an end-to-end AI-powered support analytics platform independently
**A:** Designed REST API architecture, real-time KPI pipelines, AI-powered ticket QA automation, weighted agent performance metrics engine
**R:** Production app; used in real support workflows; demonstrates engineering literacy and product intuition combined
**Reflection:** Building alone forced me to make architectural decisions I'd normally defer — made me a much better Engineering partner because I understand the tradeoffs
**Best for questions about:** Systems thinking, ownership, technical depth, why you're different from other support managers
