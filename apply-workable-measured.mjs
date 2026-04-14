#!/usr/bin/env node
/**
 * apply-workable-measured.mjs
 * Fills the Measured "Head of Customer Support & Technical Operations"
 * application on Workable and stops before Submit for user review.
 *
 * Role: Head of Customer Support & Technical Operations
 * URL:  https://apply.workable.com/measured/j/7563EB958A
 */

import { chromium } from 'playwright';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

const RESUME_PATH = resolve(__dirname, 'output/cv-skalamera-measured-2026-04-06.pdf');
const APPLY_URL   = 'https://apply.workable.com/measured/j/7563EB958A';

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Cover letter (no em dashes, concise, metric-led) ──────────────────────────
const COVER_LETTER = `I currently run enterprise analytics support at Sigma Computing, where I achieved a 4.84/5 CSAT and a 23-second average live-chat first response time across a data-intensive SaaS customer base, the same profile Measured serves. At Benchmark Education I built the operational infrastructure that drove a 38% reduction in resolution time while managing 15 agents and a 5-person offshore vendor team.

What sets me apart for this role is the technical operations side: I built a Python ML forecasting app to predict queue demand, a cross-platform Power BI Support Operations Hub connecting Freshdesk, Zendesk, Intercom, and Salesforce, and AI-assisted ticket triage tooling. I do not just manage support teams; I build the systems that make them excellent at scale.

Measured's data-driven approach to marketing measurement mirrors how I think about support operations: every metric has a causal story, and the infrastructure should surface it clearly. I would welcome the chance to bring this to your team.`;

// ── Tailored long-form answers ─────────────────────────────────────────────────
const ANSWERS = {

  // "Why Measured?" / motivation
  why: `Measured solves a problem I find genuinely compelling: attribution and incrementality measurement in a world where signal is fragmented and marketers are under pressure to justify spend. The technical rigor behind media mix modeling, holdout testing, and causal inference is exactly the kind of product that creates a sophisticated, data-literate customer base, which is the environment where I do my best support operations work. I built tooling to help a data analytics platform serve enterprise customers with complex, multi-system environments. Measured's customers are likely the same profile: smart, demanding, and highly invested in getting the analysis right. That is where I want to be.`,

  // Leadership / team management
  leadership: `At Benchmark Education I built and led a 15-person support team plus a 5-person offshore vendor, designing the QA framework, coaching cadence, and capacity model from scratch. At Sigma Computing I manage enterprise analytics support with full ownership of SLA design, workforce planning, and escalation protocols. I use data to drive the team: queue health dashboards updated in real time, weekly performance reviews tied to individual metrics, and a structured feedback loop from tickets into the product roadmap. My style is direct and metric-grounded. I set clear expectations, give specific feedback, and create systems so the team can self-correct without waiting for me.`,

  // Technical / tooling depth
  technical: `I have built operational tooling that most support leaders buy off the shelf. At Benchmark Education I created a Power BI Support Operations Hub that unified Freshdesk, Zendesk, Intercom, and Salesforce into a single metrics layer, the same visibility a company like Measured needs across a complex customer data stack. At Sigma Computing I built a Python ML forecasting app to predict inbound queue volume and a Slack-integrated shift report that delivers regional TSE metrics every evening. I also built AI-assisted triage tooling to route and pre-classify tickets before agents see them. I am comfortable working directly with APIs, writing the automation, and owning the infrastructure end-to-end.`,

  // Metrics / CSAT
  metrics: `At Sigma Computing: 4.84/5 CSAT, 23-second average live-chat first response time, approximately 1.1-hour average time to resolve. At Benchmark Education: 98%+ CSAT annually, 38% reduction in resolution time, 45% improvement in first response time, 32% improvement in average handling time, across a 15-agent team and 5-person offshore vendor. I won a Gold Stevie Award at the 2025 American Business Awards for customer service excellence. The common thread is building systems: forecasting models, QA rubrics, SLA tiers, and dashboards that keep the team accountable without adding overhead.`,

  // Cross-functional / stakeholder management
  crossfunctional: `Support operations only improves when product, engineering, and CS are aligned on what the data says. At Sigma I run a weekly ticket-to-roadmap review where the top recurring issues feed directly into the product team's backlog prioritization. At Benchmark I led cross-functional projects connecting support data into Salesforce for the CS and renewals teams so they had early warning signals on at-risk accounts. I communicate upward in business terms: retention risk, CSAT trend, cost per resolution, not just ticket volume. And I communicate laterally in operational terms: what we need from engineering, what the data shows about product gaps.`,

  // Salary expectation
  salary: `$150,000 - $175,000`,
};

// ── Helper: get the label text nearest to an element ──────────────────────────
async function getNearestLabel(page, elHandle) {
  return page.evaluate(el => {
    // Check for aria-label or placeholder first
    if (el.getAttribute('aria-label')) return el.getAttribute('aria-label');
    if (el.getAttribute('placeholder')) return el.getAttribute('placeholder');

    // Walk up to find a label
    let node = el.parentElement;
    for (let i = 0; i < 6; i++) {
      if (!node) break;
      // label[for] pointing to this element
      if (el.id) {
        const lf = document.querySelector(`label[for="${el.id}"]`);
        if (lf) return lf.textContent.trim();
      }
      const label = node.querySelector('label');
      if (label && label.textContent.trim()) return label.textContent.trim();
      // data attributes sometimes carry the question
      if (node.getAttribute('data-ui')) return node.getAttribute('data-ui');
      node = node.parentElement;
    }
    return el.name || el.id || '';
  }, elHandle);
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function run() {
  console.log('\nChecking resume PDF...');
  if (!existsSync(RESUME_PATH)) {
    console.error(`ERROR: Resume not found at ${RESUME_PATH}`);
    process.exit(1);
  }
  console.log(`Resume: ${RESUME_PATH}`);

  console.log('\nLaunching visible browser...');
  const browser = await chromium.launch({
    headless: false,
    slowMo: 60,
    args: ['--start-maximized', '--disable-blink-features=AutomationControlled'],
  });

  const context = await browser.newContext({ viewport: null });
  const page    = await context.newPage();

  console.log(`Navigating to ${APPLY_URL} ...`);
  await page.goto(APPLY_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await sleep(2500);

  // ── Verify the job is still open ──────────────────────────────────────────
  const bodyText = await page.innerText('body').catch(() => '');
  const hasApplyButton = await page.locator('button:has-text("Apply"), a:has-text("Apply"), [data-ui="apply-button"]').first().isVisible({ timeout: 3000 }).catch(() => false);
  const isClosed = /position.*filled|no longer accepting|job.*closed|not available/i.test(bodyText);

  if (isClosed || (!hasApplyButton && bodyText.length < 200)) {
    console.error('\nSTOP: This job appears to be closed. No form found.');
    await browser.close();
    process.exit(0);
  }

  console.log('Job is active. Looking for "Apply" button...');

  // Click the Apply / Apply Now button if present (Workable landing page)
  const applyBtn = page.locator('a:has-text("Apply for this job"), button:has-text("Apply for this job"), a:has-text("Apply Now"), button:has-text("Apply Now"), [data-ui="apply-button"]').first();
  if (await applyBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
    console.log('Clicking Apply button...');
    await applyBtn.click();
    await sleep(2500);
  }

  console.log('\nFilling form fields...\n');

  // ── Standard text inputs ──────────────────────────────────────────────────

  // First name
  const firstNameSelectors = [
    'input[name="firstname"]', 'input[id*="first"]', 'input[placeholder*="First"]',
    'input[autocomplete="given-name"]',
  ];
  for (const sel of firstNameSelectors) {
    const el = page.locator(sel).first();
    if (await el.isVisible({ timeout: 1000 }).catch(() => false)) {
      await el.fill('Stephen');
      console.log('First name: Stephen');
      break;
    }
  }

  // Last name
  const lastNameSelectors = [
    'input[name="lastname"]', 'input[id*="last"]', 'input[placeholder*="Last"]',
    'input[autocomplete="family-name"]',
  ];
  for (const sel of lastNameSelectors) {
    const el = page.locator(sel).first();
    if (await el.isVisible({ timeout: 1000 }).catch(() => false)) {
      await el.fill('Skalamera');
      console.log('Last name: Skalamera');
      break;
    }
  }

  // Email
  const emailSelectors = [
    'input[type="email"]', 'input[name="email"]', 'input[id*="email"]',
    'input[autocomplete="email"]',
  ];
  for (const sel of emailSelectors) {
    const el = page.locator(sel).first();
    if (await el.isVisible({ timeout: 1000 }).catch(() => false)) {
      await el.fill('skalamera@gmail.com');
      console.log('Email: skalamera@gmail.com');
      break;
    }
  }

  // Phone
  const phoneSelectors = [
    'input[type="tel"]', 'input[name="phone"]', 'input[id*="phone"]',
    'input[placeholder*="Phone"]', 'input[autocomplete="tel"]',
  ];
  for (const sel of phoneSelectors) {
    const el = page.locator(sel).first();
    if (await el.isVisible({ timeout: 1000 }).catch(() => false)) {
      await el.fill('+14436241226');
      console.log('Phone: +14436241226');
      break;
    }
  }

  // LinkedIn
  const linkedinSelectors = [
    'input[name*="linkedin"]', 'input[id*="linkedin"]', 'input[placeholder*="linkedin"]',
    'input[placeholder*="LinkedIn"]',
  ];
  for (const sel of linkedinSelectors) {
    const el = page.locator(sel).first();
    if (await el.isVisible({ timeout: 1000 }).catch(() => false)) {
      await el.fill('https://linkedin.com/in/skalamera');
      console.log('LinkedIn: https://linkedin.com/in/skalamera');
      break;
    }
  }

  // Location / City
  const locationSelectors = [
    'input[name*="location"]', 'input[id*="location"]', 'input[placeholder*="City"]',
    'input[placeholder*="Location"]', 'input[name*="city"]',
  ];
  for (const sel of locationSelectors) {
    const el = page.locator(sel).first();
    if (await el.isVisible({ timeout: 1000 }).catch(() => false)) {
      await el.fill('New York, NY');
      console.log('Location: New York, NY');
      // Workable often shows a dropdown after typing — wait and pick first option
      await sleep(1200);
      const suggestion = page.locator('[role="option"], [class*="suggestion"], [class*="autocomplete"]').first();
      if (await suggestion.isVisible({ timeout: 1500 }).catch(() => false)) {
        await suggestion.click();
        console.log('  -> autocomplete suggestion selected');
      }
      break;
    }
  }

  await sleep(500);

  // ── Resume upload ─────────────────────────────────────────────────────────
  const fileInputs = page.locator('input[type="file"]');
  const fileCount  = await fileInputs.count().catch(() => 0);
  console.log(`\nFound ${fileCount} file input(s)`);

  if (fileCount > 0) {
    const resumeInput = fileInputs.first();
    await resumeInput.setInputFiles(RESUME_PATH);
    console.log('Resume uploaded: cv-skalamera-measured-2026-04-06.pdf');
    await sleep(2000);
  }

  // ── All visible text inputs (catch-all for misc fields) ───────────────────
  await sleep(500);
  const allInputs = page.locator('input[type="text"], input[type="url"], input:not([type])');
  const inputCount = await allInputs.count().catch(() => 0);
  console.log(`\nScanning ${inputCount} text inputs for unrecognized fields...`);

  for (let i = 0; i < inputCount; i++) {
    const inp = allInputs.nth(i);
    if (!await inp.isVisible({ timeout: 400 }).catch(() => false)) continue;
    const val = await inp.inputValue().catch(() => '');
    if (val) continue; // already filled

    const handle = await inp.elementHandle().catch(() => null);
    if (!handle) continue;
    const label = (await getNearestLabel(page, handle)).toLowerCase();

    if (!label) continue;

    if (label.includes('salary') || label.includes('compensation') || label.includes('expected')) {
      await inp.fill('150000');
      console.log(`Salary field ("${label}"): 150000`);
    } else if (label.includes('website') || label.includes('portfolio')) {
      await inp.fill('https://linkedin.com/in/skalamera');
      console.log(`Website/portfolio ("${label}"): LinkedIn`);
    } else if (label.includes('github')) {
      // skip — no relevant GitHub
    } else {
      console.log(`  Unrecognized text input: "${label}" — check browser`);
    }
  }

  // ── Dropdowns / selects ────────────────────────────────────────────────────
  const selects = page.locator('select');
  const selCount = await selects.count().catch(() => 0);
  console.log(`\nFound ${selCount} <select> dropdown(s)`);

  for (let i = 0; i < selCount; i++) {
    const sel = selects.nth(i);
    if (!await sel.isVisible({ timeout: 400 }).catch(() => false)) continue;

    const handle = await sel.elementHandle().catch(() => null);
    if (!handle) continue;
    const label = (await getNearestLabel(page, handle)).toLowerCase();
    const opts   = (await sel.locator('option').allTextContents().catch(() => [])).map(o => o.trim()).filter(Boolean);

    console.log(`  Select: "${label}" — options: ${opts.join(' | ')}`);

    if (label.includes('sponsor') || label.includes('visa') || label.includes('authoriz')) {
      const noOpt = opts.find(o => /^no$/i.test(o) || /no.*sponsor/i.test(o) || /authorized/i.test(o));
      if (noOpt) { await sel.selectOption({ label: noOpt }); console.log(`  -> "${noOpt}"`); }
      else        { await sel.selectOption({ index: 1 });    console.log(`  -> index 1 (manual check)`); }
    } else if (label.includes('country')) {
      await sel.selectOption({ label: 'United States' }).catch(() => {});
      console.log('  -> United States');
    } else if (label.includes('experience') || label.includes('years')) {
      const tenPlus = opts.find(o => /10\+|10 or more/i.test(o));
      const fivePlus = opts.find(o => /[5-9]\+|5 or more|6\+|7\+/i.test(o));
      const best = tenPlus || fivePlus;
      if (best) { await sel.selectOption({ label: best }); console.log(`  -> "${best}"`); }
    } else if (label.includes('hear') || label.includes('source') || label.includes('find')) {
      const linked = opts.find(o => /linkedin/i.test(o));
      if (linked) { await sel.selectOption({ label: linked }); console.log(`  -> "${linked}"`); }
    } else if (label.includes('salary') || label.includes('compensation')) {
      const match = opts.find(o => /150|175|160/i.test(o));
      if (match) { await sel.selectOption({ label: match }); console.log(`  -> "${match}"`); }
    }
  }

  // ── Workable custom questions (radio / checkbox groups) ───────────────────
  // Work authorization radio
  const authRadios = page.locator('input[type="radio"]');
  const radioCount = await authRadios.count().catch(() => 0);
  if (radioCount > 0) {
    console.log(`\nFound ${radioCount} radio buttons — scanning...`);
    for (let i = 0; i < radioCount; i++) {
      const radio = authRadios.nth(i);
      if (!await radio.isVisible({ timeout: 400 }).catch(() => false)) continue;
      const handle = await radio.elementHandle().catch(() => null);
      if (!handle) continue;
      const label = (await getNearestLabel(page, handle)).toLowerCase();
      const radioVal = (await radio.getAttribute('value') || '').toLowerCase();

      // For yes/no work auth questions — pick "yes" (authorized) or "no" for sponsorship
      if (label.includes('authorized') || label.includes('work in the us') || (label.includes('eligible') && label.includes('us'))) {
        if (radioVal === 'yes' || label.includes('yes')) {
          await radio.check({ force: true }).catch(() => {});
          console.log(`  Radio auth: "${label}" -> checked`);
        }
      } else if (label.includes('sponsor') || label.includes('require.*sponsor')) {
        if (radioVal === 'no' || label.includes('no')) {
          await radio.check({ force: true }).catch(() => {});
          console.log(`  Radio sponsor: "${label}" -> checked`);
        }
      }
    }
  }

  // ── Textareas (open-ended questions) ─────────────────────────────────────
  const textareas = page.locator('textarea');
  const taCount   = await textareas.count().catch(() => 0);
  console.log(`\nFound ${taCount} textarea(s)`);

  for (let i = 0; i < taCount; i++) {
    const ta = textareas.nth(i);
    if (!await ta.isVisible({ timeout: 400 }).catch(() => false)) continue;
    const val = await ta.inputValue().catch(() => '');
    if (val) continue; // skip if already filled

    const handle = await ta.elementHandle().catch(() => null);
    if (!handle) continue;
    const label = (await getNearestLabel(page, handle)).toLowerCase();

    console.log(`\n  Textarea: "${label.slice(0, 80)}"`);

    // Route to the right answer
    if (label.includes('cover') || label.includes('letter') || label.includes('motivation') || label.includes('why are you')) {
      await ta.fill(COVER_LETTER);
      console.log('  -> Cover letter filled');
    } else if (label.includes('why measured') || label.includes('why this role') || label.includes('why are you interested')) {
      await ta.fill(ANSWERS.why);
      console.log('  -> Why Measured answer filled');
    } else if (label.includes('lead') || label.includes('manag') || label.includes('team')) {
      await ta.fill(ANSWERS.leadership);
      console.log('  -> Leadership answer filled');
    } else if (label.includes('techni') || label.includes('tool') || label.includes('stack') || label.includes('data')) {
      await ta.fill(ANSWERS.technical);
      console.log('  -> Technical / tooling answer filled');
    } else if (label.includes('csat') || label.includes('metric') || label.includes('kpi') || label.includes('success') || label.includes('measur')) {
      await ta.fill(ANSWERS.metrics);
      console.log('  -> Metrics answer filled');
    } else if (label.includes('cross') || label.includes('stakeholder') || label.includes('product') || label.includes('engineering') || label.includes('collaborat')) {
      await ta.fill(ANSWERS.crossfunctional);
      console.log('  -> Cross-functional answer filled');
    } else if (label.includes('salary') || label.includes('compensation') || label.includes('expect')) {
      await ta.fill(ANSWERS.salary);
      console.log('  -> Salary answer filled');
    } else {
      // Generic fallback: use cover letter text for anything unrecognized
      await ta.fill(COVER_LETTER);
      console.log(`  -> Unrecognized question — cover letter used. REVIEW THIS FIELD.`);
    }

    await sleep(300);
  }

  // ── Checkboxes (consent, privacy) ─────────────────────────────────────────
  const checkboxes = page.locator('input[type="checkbox"]');
  const cbCount    = await checkboxes.count().catch(() => 0);
  for (let i = 0; i < cbCount; i++) {
    const cb = checkboxes.nth(i);
    if (!await cb.isVisible({ timeout: 400 }).catch(() => false)) continue;
    const isChecked = await cb.isChecked().catch(() => false);
    if (!isChecked) {
      const handle  = await cb.elementHandle().catch(() => null);
      const label   = handle ? (await getNearestLabel(page, handle)).toLowerCase() : '';
      if (label.includes('privacy') || label.includes('consent') || label.includes('agree') || label.includes('terms')) {
        await cb.check({ force: true }).catch(() => {});
        console.log(`\nConsent checkbox checked: "${label.slice(0, 60)}"`);
      }
    }
  }

  // ── Done ───────────────────────────────────────────────────────────────────
  console.log(`
==============================================================
  FORM FILLED -- BROWSER IS OPEN FOR YOUR REVIEW
==============================================================

  Fields filled:
  - First name:   Stephen
  - Last name:    Skalamera
  - Email:        skalamera@gmail.com
  - Phone:        +14436241226
  - LinkedIn:     https://linkedin.com/in/skalamera
  - Location:     New York, NY
  - Resume:       cv-skalamera-measured-2026-04-06.pdf
  - Visa/auth:    No sponsorship needed (US Citizen)
  - Salary:       $150,000 - $175,000

  Open-text answers prepared:
  - Cover letter (Sigma 4.84/5 CSAT angle + Measured analytics fit)
  - Why Measured (incrementality + causal measurement angle)
  - Leadership (15 agents + 5 offshore vendor + data-driven style)
  - Technical depth (Python ML forecasting + Power BI hub + AI triage)
  - Metrics (4.84 CSAT, 23s FRT, 38% resolution reduction, Gold Stevie)
  - Cross-functional (ticket-to-roadmap, Salesforce CS integration)

  PLEASE REVIEW ALL FIELDS IN THE BROWSER.
  DO NOT click Submit until you are satisfied.
  YOU submit -- not the script.
==============================================================
`);

  // Keep browser open
  await new Promise(() => {});
}

run().catch(err => {
  console.error('\nError:', err.message);
  process.exit(1);
});
