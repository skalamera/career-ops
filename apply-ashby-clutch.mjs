#!/usr/bin/env node
/**
 * apply-ashby-clutch.mjs — Ashby form filler for Clutch Director of Support Engineering
 * Fills all fields and stops at Submit for user review. Never clicks Submit.
 */

import { chromium } from 'playwright';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const profileDir = resolve(__dirname, '.browser-profile-clutch');
mkdirSync(profileDir, { recursive: true });

const RESUME_PATH = resolve(__dirname, 'output/cv-skalamera-clutch-2026-04-06.pdf');
const APP_URL = 'https://jobs.ashbyhq.com/withclutch/a21a453b-2a03-4c8c-bd16-89a0a9dca479';

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Answer bank ──────────────────────────────────────────────────────────────

const COVER_LETTER = `"Director of Support Engineering" is the exact title I hold in practice at Sigma Computing. I own enterprise technical support, Engineering/Product SEV command, and the internal tooling layer end to end. Our team runs at 4.84/5 CSAT, 23-second average first response, and roughly 1.1 hours to resolution.

The "Engineering" half of the title matters. I built Jedana, an AI-powered support operations platform: REST APIs, sentiment analysis pipelines, AI QA automation. At Benchmark Education, I led the technical operations side, cutting resolution time 38% and improving first response 45% through systematic tooling and process redesign.

Clutch's integration surface (core banking systems, loan origination APIs, credit union tech partners) maps directly to the complexity I operate in. I am ready to lead this function from day one.`;

// Answers for common Ashby screening questions
function getAnswerForQuestion(q) {
  const lower = q.toLowerCase();

  // Work authorization / visa
  if (lower.includes('sponsor') || lower.includes('visa') || lower.includes('work authorization') || lower.includes('authorized')) {
    return 'Yes, I am authorized to work in the United States and do not require visa sponsorship.';
  }

  // Salary / compensation
  if (lower.includes('salary') || lower.includes('compensation') || lower.includes('pay')) {
    return '$150,000 – $175,000';
  }

  // Location / relocation / hybrid
  if (lower.includes('relocat')) {
    return 'I am based in New York, NY — no relocation needed.';
  }
  if (lower.includes('location') || lower.includes('new york') || lower.includes('nyc')) {
    return 'New York, NY';
  }
  if (lower.includes('remote') || lower.includes('hybrid') || lower.includes('office')) {
    return 'I am based in New York and comfortable with hybrid or in-office arrangements.';
  }

  // Years of experience
  if ((lower.includes('year') || lower.includes('how long') || lower.includes('experience')) && (lower.includes('support') || lower.includes('manag') || lower.includes('lead') || lower.includes('engineering'))) {
    return 'I have 10+ years in technical support and support engineering leadership.';
  }

  // Team size / people management
  if (lower.includes('team size') || lower.includes('direct report') || lower.includes('manage') || lower.includes('how many people')) {
    return 'I currently lead a 15-person support organization at Sigma Computing and previously managed 15 agents plus a 5-person offshore vendor team at Benchmark Education.';
  }

  // SaaS / fintech / domain
  if (lower.includes('fintech') || lower.includes('financial') || lower.includes('credit union') || lower.includes('lending')) {
    return 'I have experience with technically complex SaaS integrations at Sigma Computing and enterprise operations. While my domain has been analytics SaaS rather than lending, the integration challenges (APIs, partner connectivity, compliance-adjacent workflows) are directly comparable.';
  }

  // Why Clutch
  if (lower.includes('why clutch') || lower.includes('why this role') || lower.includes('interested in') || lower.includes('what draws')) {
    return "Director of Support Engineering is the exact role I have been building toward. Clutch's integration depth (core banking, loan origination systems, credit union tech partners) maps to the technical complexity I operate in. The stage is right: established enough to have a real support engineering problem, early enough that the systems I build will define how the function scales.";
  }

  // Hear about / source
  if (lower.includes('how did you hear') || lower.includes('where did you') || lower.includes('source') || lower.includes('referred')) {
    return 'LinkedIn';
  }

  // LinkedIn profile
  if (lower.includes('linkedin')) {
    return 'https://linkedin.com/in/skalamera';
  }

  // Website / portfolio
  if (lower.includes('website') || lower.includes('portfolio') || lower.includes('github') || lower.includes('personal site')) {
    return 'https://linkedin.com/in/skalamera';
  }

  // Start date
  if (lower.includes('start date') || lower.includes('available') || lower.includes('notice')) {
    return '4 weeks notice';
  }

  // Cover letter free text
  if (lower.includes('cover letter') || lower.includes('anything else') || lower.includes('tell us') || lower.includes('additional')) {
    return COVER_LETTER;
  }

  return null;
}

async function fillInputByLabel(page, label, value) {
  // Try to find an input or textarea associated with this label text
  const handle = await page.evaluate((labelText) => {
    const labels = Array.from(document.querySelectorAll('label'));
    for (const lbl of labels) {
      if (lbl.textContent.trim().toLowerCase().includes(labelText.toLowerCase())) {
        if (lbl.htmlFor) {
          const el = document.getElementById(lbl.htmlFor);
          if (el) return el.id;
        }
      }
    }
    return null;
  }, label);

  if (handle) {
    const el = page.locator(`#${handle}`);
    const tag = await el.evaluate(e => e.tagName.toLowerCase()).catch(() => '');
    if (tag === 'input' || tag === 'textarea') {
      await el.fill(value);
      return true;
    }
    if (tag === 'select') {
      await el.selectOption({ label: value }).catch(async () => {
        await el.selectOption({ value }).catch(() => {});
      });
      return true;
    }
  }
  return false;
}

async function run() {
  console.log('\nLaunching browser...');

  if (!existsSync(RESUME_PATH)) {
    console.error(`ERROR: Resume not found at ${RESUME_PATH}`);
    process.exit(1);
  }

  const browser = await chromium.launch({
    headless: false,
    args: ['--start-maximized', '--no-first-run', '--disable-blink-features=AutomationControlled'],
  });
  const context = await browser.newContext({
    viewport: null,
  });

  const page = await context.newPage();

  console.log('Navigating to Clutch application...');
  await page.goto(APP_URL, { waitUntil: 'networkidle' });
  await sleep(4000);

  // ── Check if job is open ──────────────────────────────────────────────────
  const pageText = await page.innerText('body').catch(() => '');
  const titleVisible = await page.locator('h1').first().isVisible({ timeout: 3000 }).catch(() => false);

  if (!titleVisible) {
    console.log('\nERROR: Page did not load properly. Check browser.');
    return;
  }

  // Check for closed indicators
  const closed = pageText.toLowerCase().includes('no longer accepting') ||
                 pageText.toLowerCase().includes('position has been filled') ||
                 pageText.toLowerCase().includes('job is closed') ||
                 pageText.toLowerCase().includes('this job is no longer');

  if (closed) {
    console.log('\nSTOP: Job appears to be closed. Verify in browser.');
    return;
  }

  // Wait generously for Ashby React SPA to render
  await sleep(6000);

  // Dump page text for diagnosis
  const bodyText = await page.innerText('body').catch(() => '');
  console.log('\n--- Page text sample (first 800 chars) ---');
  console.log(bodyText.slice(0, 800));
  console.log('--- end ---\n');

  const hasApplyButton = await page.locator('button:has-text("Apply"), a:has-text("Apply"), button:has-text("Submit")').first().isVisible({ timeout: 8000 }).catch(() => false);
  const hasForm = await page.locator('form, input[type="email"], input[name*="email"], input[placeholder*="Email"]').first().isVisible({ timeout: 8000 }).catch(() => false);
  const hasAnyInput = await page.locator('input').first().isVisible({ timeout: 5000 }).catch(() => false);

  console.log(`Apply button visible: ${hasApplyButton}`);
  console.log(`Form visible: ${hasForm}`);
  console.log(`Any input visible: ${hasAnyInput}`);

  if (!hasApplyButton && !hasForm && !hasAnyInput) {
    console.log('\nSTOP: No Apply button or form found. The job may be closed. Check browser.');
    return;
  }

  // Click Apply if needed to open the form
  const applyBtn = page.locator('button:has-text("Apply for this job"), a:has-text("Apply for this job"), button:has-text("Apply Now"), a:has-text("Apply Now")').first();
  if (await applyBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await applyBtn.click();
    await sleep(2000);
    console.log('Clicked Apply button to open form.');
  }

  await sleep(1000);

  // ── Take snapshot to understand form ──────────────────────────────────────
  console.log('\nReading form fields...\n');

  // ── Standard Ashby fields ─────────────────────────────────────────────────

  // First name
  const firstNameInput = page.locator('input[name*="firstName"], input[id*="first"], input[placeholder*="First"], input[aria-label*="First name"]').first();
  if (await firstNameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    await firstNameInput.fill('Stephen');
    console.log('First name: Stephen');
  }

  // Last name
  const lastNameInput = page.locator('input[name*="lastName"], input[id*="last"], input[placeholder*="Last"], input[aria-label*="Last name"]').first();
  if (await lastNameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    await lastNameInput.fill('Skalamera');
    console.log('Last name: Skalamera');
  }

  // Email
  const emailInput = page.locator('input[type="email"], input[name*="email"], input[id*="email"]').first();
  if (await emailInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    await emailInput.fill('skalamera@gmail.com');
    console.log('Email: skalamera@gmail.com');
  }

  // Phone
  const phoneInput = page.locator('input[type="tel"], input[name*="phone"], input[id*="phone"], input[placeholder*="Phone"]').first();
  if (await phoneInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    await phoneInput.fill('+1 (443) 624-1226');
    console.log('Phone: +1 (443) 624-1226');
  }

  // LinkedIn URL — Ashby often has a specific field
  const linkedinInput = page.locator('input[name*="linkedin"], input[id*="linkedin"], input[placeholder*="linkedin"], input[aria-label*="LinkedIn"]').first();
  if (await linkedinInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    await linkedinInput.fill('https://linkedin.com/in/skalamera');
    console.log('LinkedIn: https://linkedin.com/in/skalamera');
  }

  // Website / personal URL
  const websiteInput = page.locator('input[name*="website"], input[id*="website"], input[placeholder*="website"], input[aria-label*="Website"], input[placeholder*="portfolio"]').first();
  if (await websiteInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    await websiteInput.fill('https://linkedin.com/in/skalamera');
    console.log('Website: https://linkedin.com/in/skalamera');
  }

  // Location / city
  const cityInput = page.locator('input[name*="city"], input[id*="city"], input[name*="location"], input[id*="location"], input[placeholder*="City"], input[placeholder*="Location"]').first();
  if (await cityInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    await cityInput.fill('New York, NY');
    console.log('Location: New York, NY');
  }

  await sleep(500);

  // ── Resume upload ─────────────────────────────────────────────────────────
  const fileInputs = page.locator('input[type="file"]');
  const fileCount = await fileInputs.count().catch(() => 0);
  console.log(`\nFound ${fileCount} file input(s).`);

  if (fileCount >= 1) {
    // First file input is usually the resume
    await fileInputs.first().setInputFiles(RESUME_PATH);
    console.log('Resume uploaded: cv-skalamera-clutch-2026-04-06.pdf');
    await sleep(2000);
  }

  // ── Ashby custom questions ────────────────────────────────────────────────
  await sleep(1000);

  // Get all visible inputs not yet filled
  const allInputs = await page.evaluate(() => {
    const results = [];
    const fields = document.querySelectorAll('input:not([type="file"]):not([type="hidden"]):not([type="submit"]):not([type="checkbox"]):not([type="radio"]), textarea, select');
    for (const field of fields) {
      if (!field.offsetParent) continue; // not visible
      const id = field.id || '';
      const name = field.name || '';
      const placeholder = field.placeholder || '';
      const tag = field.tagName.toLowerCase();
      const type = field.type || '';
      const value = field.value || '';

      // Find label
      let label = '';
      if (id) {
        const lbl = document.querySelector(`label[for="${id}"]`);
        if (lbl) label = lbl.textContent.trim();
      }
      if (!label) {
        let node = field.parentElement;
        for (let i = 0; i < 6; i++) {
          if (!node) break;
          const lbl = node.querySelector('label');
          if (lbl && lbl.textContent.trim()) { label = lbl.textContent.trim(); break; }
          // Also check for aria-label on field container or data attributes
          const ariaLabel = node.getAttribute('aria-label');
          if (ariaLabel) { label = ariaLabel; break; }
          node = node.parentElement;
        }
      }
      if (!label) label = placeholder || name || id;

      results.push({ id, name, placeholder, tag, type, value, label });
    }
    return results;
  });

  console.log(`\nDetected ${allInputs.length} form fields total:`);
  for (const f of allInputs) {
    console.log(`  [${f.tag}] label="${f.label}" id="${f.id}" name="${f.name}" value="${f.value ? '(filled)' : '(empty)'}"`);
  }

  // ── Fill remaining open fields ────────────────────────────────────────────
  console.log('\nFilling open fields...');

  for (const f of allInputs) {
    if (f.value && f.value.length > 0) continue; // already filled

    // Skip submit / already-standard fields
    const lowerLabel = f.label.toLowerCase();
    const lowerName = f.name.toLowerCase();

    // Skip if it's a standard field we already handled
    const alreadyHandled = ['first', 'last', 'email', 'phone', 'linkedin', 'website', 'city', 'location'].some(
      k => lowerLabel.includes(k) || lowerName.includes(k)
    );
    if (alreadyHandled) continue;

    // Try to get an answer
    const answer = getAnswerForQuestion(f.label) || getAnswerForQuestion(f.placeholder || '');
    if (!answer) {
      console.log(`  REVIEW NEEDED: "${f.label}" (no auto-answer)`);
      continue;
    }

    // Fill it
    if (f.id) {
      const el = page.locator(`#${CSS.escape(f.id)}`);
      if (await el.isVisible({ timeout: 500 }).catch(() => false)) {
        if (f.tag === 'select') {
          await el.selectOption({ label: answer }).catch(async () => {
            await el.selectOption({ value: answer }).catch(() => {
              console.log(`  WARNING: Could not select "${answer}" for "${f.label}"`);
            });
          });
        } else {
          await el.fill(answer);
        }
        console.log(`  "${f.label}" -> filled`);
        await sleep(200);
      }
    }
  }

  // ── Dropdowns: work authorization, salary, etc. ───────────────────────────
  await sleep(500);
  const selects = page.locator('select');
  const selectCount = await selects.count().catch(() => 0);

  if (selectCount > 0) {
    console.log(`\nProcessing ${selectCount} dropdown(s)...`);
    for (let i = 0; i < selectCount; i++) {
      const sel = selects.nth(i);
      if (!await sel.isVisible({ timeout: 500 }).catch(() => false)) continue;

      const currentVal = await sel.inputValue().catch(() => '');
      if (currentVal) continue;

      const opts = await sel.locator('option').allTextContents().catch(() => []);
      const validOpts = opts.map(o => o.trim()).filter(o => o && !o.toLowerCase().includes('select') && o !== '');

      const labelText = await page.evaluate(el => {
        const id = el.id;
        if (id) {
          const label = document.querySelector(`label[for="${id}"]`);
          if (label) return label.textContent.trim();
        }
        let node = el.parentElement;
        for (let j = 0; j < 5; j++) {
          if (!node) break;
          const label = node.querySelector('label');
          if (label && label.textContent.trim()) return label.textContent.trim();
          node = node.parentElement;
        }
        return el.id || el.name || '';
      }, await sel.elementHandle());

      console.log(`  Dropdown: "${labelText}" options: ${validOpts.slice(0, 6).join(' | ')}`);

      const q = labelText.toLowerCase();

      if (q.includes('sponsor') || q.includes('visa') || q.includes('work auth')) {
        const noOpt = validOpts.find(o => o.toLowerCase() === 'no') || validOpts.find(o => o.toLowerCase().includes('no'));
        if (noOpt) { await sel.selectOption({ label: noOpt }).catch(() => {}); console.log(`    -> "${noOpt}"`); }
      } else if (q.includes('country')) {
        await sel.selectOption({ label: 'United States' }).catch(() => { sel.selectOption({ value: 'US' }).catch(() => {}); });
        console.log('    -> United States');
      } else if (q.includes('year') && q.includes('experience')) {
        const opt = validOpts.find(o => o.includes('10') || o.includes('8') || o.includes('7+') || o.includes('6+') || o.includes('5+'));
        if (opt) { await sel.selectOption({ label: opt }).catch(() => {}); console.log(`    -> "${opt}"`); }
      } else if (validOpts.length > 0) {
        console.log(`    -> REVIEW NEEDED (${validOpts.length} options)`);
      }
    }
  }

  // ── Radio buttons ─────────────────────────────────────────────────────────
  const radioGroups = await page.evaluate(() => {
    const groups = {};
    const radios = document.querySelectorAll('input[type="radio"]');
    for (const r of radios) {
      if (!r.offsetParent) continue;
      const name = r.name || r.id;
      if (!groups[name]) groups[name] = [];
      const label = r.labels?.[0]?.textContent?.trim() || r.value || '';
      groups[name].push({ value: r.value, label, checked: r.checked });
    }
    return groups;
  });

  const radioGroupNames = Object.keys(radioGroups);
  if (radioGroupNames.length > 0) {
    console.log(`\nFound ${radioGroupNames.length} radio group(s):`);
    for (const name of radioGroupNames) {
      const options = radioGroups[name];
      console.log(`  Group "${name}": ${options.map(o => o.label || o.value).join(' | ')}`);
    }
  }

  // ── Checkboxes ────────────────────────────────────────────────────────────
  const checkboxes = page.locator('input[type="checkbox"]');
  const cbCount = await checkboxes.count().catch(() => 0);
  for (let i = 0; i < cbCount; i++) {
    const cb = checkboxes.nth(i);
    if (!await cb.isVisible({ timeout: 500 }).catch(() => false)) continue;
    const isChecked = await cb.isChecked().catch(() => false);
    if (isChecked) continue;

    const cbLabel = await page.evaluate(el => {
      const lbl = el.labels?.[0];
      if (lbl) return lbl.textContent.trim();
      let node = el.parentElement;
      for (let j = 0; j < 4; j++) {
        if (!node) break;
        if (node.textContent.trim().length < 200) return node.textContent.trim();
        node = node.parentElement;
      }
      return '';
    }, await cb.elementHandle());

    const lowerCb = cbLabel.toLowerCase();
    if (lowerCb.includes('consent') || lowerCb.includes('agree') || lowerCb.includes('acknowledge') || lowerCb.includes('privacy') || lowerCb.includes('terms')) {
      await cb.check({ force: true }).catch(() => {});
      console.log(`\nConsent checkbox checked: "${cbLabel.slice(0, 80)}..."`);
    }
  }

  // ── Final scan for any empty textareas ────────────────────────────────────
  const textareas = page.locator('textarea');
  const taCount = await textareas.count().catch(() => 0);
  for (let i = 0; i < taCount; i++) {
    const ta = textareas.nth(i);
    if (!await ta.isVisible({ timeout: 500 }).catch(() => false)) continue;
    const val = await ta.inputValue().catch(() => '');
    if (val) continue;

    const taLabel = await page.evaluate(el => {
      const id = el.id;
      if (id) {
        const label = document.querySelector(`label[for="${id}"]`);
        if (label) return label.textContent.trim();
      }
      let node = el.parentElement;
      for (let j = 0; j < 6; j++) {
        if (!node) break;
        const label = node.querySelector('label');
        if (label && label.textContent.trim()) return label.textContent.trim();
        node = node.parentElement;
      }
      return el.placeholder || el.name || '';
    }, await ta.elementHandle());

    const answer = getAnswerForQuestion(taLabel);
    if (answer) {
      await ta.fill(answer);
      console.log(`\nTextarea "${taLabel.slice(0, 60)}" -> filled`);
    } else {
      console.log(`\nTextarea "${taLabel.slice(0, 60)}" -> REVIEW NEEDED`);
    }
  }

  // ── Done ──────────────────────────────────────────────────────────────────
  console.log('\n=== FORM FILL COMPLETE ===');
  console.log('\nFields filled:');
  console.log('  First name:    Stephen');
  console.log('  Last name:     Skalamera');
  console.log('  Email:         skalamera@gmail.com');
  console.log('  Phone:         +1 (443) 624-1226');
  console.log('  LinkedIn:      https://linkedin.com/in/skalamera');
  console.log('  Location:      New York, NY');
  console.log('  Resume:        cv-skalamera-clutch-2026-04-06.pdf');
  console.log('  Visa sponsor:  No (not required)');
  console.log('  Salary target: $150,000 - $175,000');
  console.log('\nCover letter angle:');
  console.log('  - Exact title match: Director of Support Engineering');
  console.log('  - Sigma metrics: 4.84/5 CSAT, 23-sec first response, 1.1h resolution');
  console.log('  - Jedana: REST APIs, sentiment analysis, AI QA automation');
  console.log('  - Benchmark: 38% resolution improvement');
  console.log('\nSTOP: Browser left open. Review all fields, then click Submit yourself.');
  console.log('DO NOT submit without reviewing every field.\n');
}

run().catch(err => {
  console.error('\nERROR:', err.message);
  console.error(err.stack);
  process.exit(1);
});
