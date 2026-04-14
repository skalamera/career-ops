#!/usr/bin/env node
/**
 * apply-linkedin.mjs — LinkedIn Easy Apply form filler
 * Usage: node apply-linkedin.mjs <linkedin-job-url>
 */

import { chromium } from 'playwright';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync } from 'fs';
import os from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const JOB_URL = process.argv[2] || 'https://www.linkedin.com/jobs/view/4394710150/';

const CANDIDATE = {
  firstName: 'Stephen',
  lastName: 'Skalamera',
  email: 'skalamera@gmail.com',
  phone: '4436241226',
  resumePath: resolve(__dirname, 'output/cv-stephen-skalamera-tailscale-2026-04-06.pdf'),
  salaryExpectation: '160000',
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function run() {
  console.log('\n🚀 Launching browser...');

  // Persistent profile — log in once, stays logged in
  const profileDir = resolve(__dirname, '.browser-profile');
  mkdirSync(profileDir, { recursive: true });

  const chromeExec = '/System/Volumes/Data/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

  const context = await chromium.launchPersistentContext(profileDir, {
    executablePath: existsSync(chromeExec) ? chromeExec : undefined,
    headless: false,
    viewport: { width: 1280, height: 900 },
    args: ['--no-first-run', '--disable-blink-features=AutomationControlled'],
  });

  const page = await context.newPage();

  // ── 1. Ensure logged in ──────────────────────────────────────────────────
  await page.goto('https://www.linkedin.com/feed', { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
  await sleep(2000);

  const blocked = url => url.includes('/login') || url.includes('/authwall') || url.includes('/signup') || url.includes('/uas/') || url.includes('/checkpoint/');

  if (blocked(page.url())) {
    console.log('\n🔑 Please log in to LinkedIn in the browser window.');
    console.log('   Script continues automatically once you\'re past login + any verification.\n');
    await page.goto('https://www.linkedin.com/login', { waitUntil: 'domcontentloaded' }).catch(() => {});
    for (let i = 0; i < 200; i++) {
      await sleep(3000);
      if (!blocked(page.url())) {
        console.log('✅ Logged in! Session saved.\n');
        break;
      }
    }
  } else {
    console.log('✅ Already logged in\n');
  }

  await sleep(1000);

  // ── 2. Navigate to job ──────────────────────────────────────────────────
  console.log(`🔗 Navigating to job...`);
  await page.goto(JOB_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await sleep(3000);

  // If still on a checkpoint, wait it out
  if (blocked(page.url())) {
    console.log('⏳ Still on verification page — waiting...');
    for (let i = 0; i < 60; i++) {
      await sleep(3000);
      if (!blocked(page.url())) break;
    }
    await page.goto(JOB_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(3000);
  }

  // Dismiss social overlay if present
  const dismissBtn = page.locator('button[aria-label="Dismiss"], button.artdeco-modal__dismiss').first();
  if (await dismissBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await dismissBtn.click().catch(() => {});
    await sleep(500);
  }

  // ── 3. Click Easy Apply ─────────────────────────────────────────────────
  console.log('🔍 Looking for Easy Apply button...');
  const applySelectors = [
    'button:has-text("Easy Apply")',
    '.jobs-apply-button--top-card',
    '.jobs-apply-button',
    '[aria-label*="Easy Apply"]',
  ];

  let clicked = false;
  for (const sel of applySelectors) {
    const btn = page.locator(sel).first();
    if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await btn.click();
      clicked = true;
      console.log(`✅ Clicked Easy Apply`);
      break;
    }
  }

  if (!clicked) {
    await page.screenshot({ path: '/tmp/linkedin-debug.png' });
    console.log('⚠️  Could not find Easy Apply button automatically.');
    console.log('   Screenshot saved to /tmp/linkedin-debug.png');
    console.log('   Please click Easy Apply in the browser — script will continue when the modal opens.\n');
  }

  // ── 4. Wait for modal ───────────────────────────────────────────────────
  console.log('⏳ Waiting for Easy Apply modal...');
  const modal = page.locator('.jobs-easy-apply-modal').first();
  try {
    await modal.waitFor({ state: 'visible', timeout: 90000 });
    console.log('✅ Modal open — filling form...\n');
  } catch {
    console.log('⚠️  Modal timeout — check browser');
    return;
  }

  // ── 5. Fill form ────────────────────────────────────────────────────────

  // Read the question label for a form element by walking up the DOM
  const getQuestionLabel = async (elHandle) => {
    return page.evaluate(el => {
      let node = el.parentElement;
      for (let i = 0; i < 6; i++) {
        if (!node) break;
        // LinkedIn wraps each question in a div with a label/legend/span inside
        const label = node.querySelector('label span[aria-hidden="true"], legend span[aria-hidden="true"], .fb-form-element__label, .artdeco-text-input--label');
        if (label && label.textContent.trim()) return label.textContent.trim();
        const label2 = node.querySelector('label, legend');
        if (label2 && label2.textContent.trim()) return label2.textContent.trim();
        node = node.parentElement;
      }
      return '';
    }, elHandle);
  };

  const fill = async (selector, value, label) => {
    const el = modal.locator(selector).first();
    if (await el.isVisible({ timeout: 1500 }).catch(() => false)) {
      await el.fill(value);
      console.log(`  ✅ ${label} → ${value}`);
      return true;
    }
    return false;
  };

  let prevSelectIds = '';

  for (let step = 0; step < 20; step++) {
    await sleep(1500);
    const title = await modal.locator('h3, h2').first().textContent({ timeout: 1000 }).catch(() => '');
    console.log(`\n── Step ${step + 1}: ${title.trim() || 'form'} ──`);

    // Basic text fields
    await fill('input[id*="firstName"]', CANDIDATE.firstName, 'First name');
    await fill('input[id*="lastName"]', CANDIDATE.lastName, 'Last name');
    await fill('input[id*="phoneNumber"], input[type="tel"]', CANDIDATE.phone, 'Phone');

    // City
    const cityInput = modal.locator('input[id*="city"], input[aria-label*="ity"]').first();
    if (await cityInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      await cityInput.fill('New York');
      await sleep(800);
      const opt = page.locator('[role="option"]').filter({ hasText: 'New York' }).first();
      if (await opt.isVisible({ timeout: 2000 }).catch(() => false)) {
        await opt.click();
        console.log('  ✅ City → New York, NY');
      }
    }

    // Resume upload
    const fileInput = modal.locator('input[type="file"]').first();
    if (await fileInput.isVisible({ timeout: 1000 }).catch(() => false) && existsSync(CANDIDATE.resumePath)) {
      await fileInput.setInputFiles(CANDIDATE.resumePath);
      console.log('  ✅ Resume uploaded');
      await sleep(2000);
    }

    // ALL selects — read question label via DOM traversal
    const selects = modal.locator('select');
    const selectCount = await selects.count().catch(() => 0);
    const currentSelectIds = [];

    for (let i = 0; i < selectCount; i++) {
      const sel = selects.nth(i);
      if (!await sel.isVisible({ timeout: 500 }).catch(() => false)) continue;

      const selId = await sel.getAttribute('id') || String(i);
      currentSelectIds.push(selId);

      const currentVal = await sel.inputValue().catch(() => '');
      if (currentVal && currentVal !== 'Select an option' && currentVal !== '') continue; // already answered

      const elHandle = await sel.elementHandle().catch(() => null);
      const questionText = elHandle ? await getQuestionLabel(elHandle) : '';
      const q = questionText.toLowerCase();
      const opts = await sel.locator('option').allTextContents().catch(() => []);
      const validOpts = opts.map(o => o.trim()).filter(o => o && o !== 'Select an option');

      console.log(`  Select: "${questionText || selId.slice(-20)}" — options: ${validOpts.join(' | ')}`);

      // Email selection
      if (validOpts.some(o => o.includes('skalamera@gmail'))) {
        await sel.selectOption({ label: validOpts.find(o => o.includes('skalamera@gmail')) }).catch(() => {});
        console.log(`  ✅ Email → skalamera@gmail.com`);
        continue;
      }

      // Phone country
      if (validOpts.some(o => o.includes('United States'))) {
        await sel.selectOption({ label: validOpts.find(o => o.includes('United States')) }).catch(() => {});
        console.log(`  ✅ Country → United States (+1)`);
        continue;
      }

      // Yes/No questions — answer by question content
      if (validOpts.includes('Yes') && validOpts.includes('No')) {
        let answer = null;
        if (q.includes('authorized') || q.includes('legally authorized') || q.includes('work in the')) {
          answer = 'Yes';
        } else if (q.includes('sponsor') || q.includes('require visa') || q.includes('need visa')) {
          answer = 'No';
        } else if (q.includes('relocat')) {
          answer = 'Yes';
        } else if (q.includes('hybrid') || q.includes('on-site') || q.includes('onsite') || q.includes('office')) {
          answer = 'Yes';
        } else if (q.includes('years of experience') || q.includes('do you have') || q.includes('experience with')) {
          answer = 'Yes';
        } else {
          // Default Yes for unknown questions, log for review
          answer = 'Yes';
          console.log(`  ⚠️  Unknown question — defaulting to Yes (review in browser)`);
        }
        await sel.selectOption({ label: answer }).catch(() => {});
        console.log(`  ✅ "${questionText || 'question'}" → ${answer}`);
      }
    }

    // Loop detection — if select IDs haven't changed after clicking Next, we're stuck
    const currentIdsStr = currentSelectIds.join(',');
    if (currentIdsStr && currentIdsStr === prevSelectIds) {
      console.log('\n⚠️  Form not advancing — validation may be blocking. Check browser for errors.');
      // Take screenshot for debug
      await page.screenshot({ path: '/tmp/linkedin-stuck.png' });
      console.log('  Screenshot: /tmp/linkedin-stuck.png');
      break;
    }
    prevSelectIds = currentIdsStr;

    // Radio buttons
    const fieldsets = modal.locator('fieldset');
    for (let i = 0; i < await fieldsets.count().catch(() => 0); i++) {
      const fs = fieldsets.nth(i);
      const legend = (await fs.locator('legend').first().textContent({ timeout: 500 }).catch(() => '')).toLowerCase();
      if (legend.includes('authorized') || legend.includes('legally')) {
        await fs.locator('label:has-text("Yes")').first().click().catch(() => {});
        console.log(`  ✅ Work auth → Yes`);
      } else if (legend.includes('sponsor')) {
        await fs.locator('label:has-text("No")').first().click().catch(() => {});
        console.log(`  ✅ Sponsorship → No`);
      }
    }

    // Submit — STOP
    const submitBtn = modal.locator('button:has-text("Submit application"), button:has-text("Submit")').first();
    if (await submitBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      console.log('\n🛑 Reached Submit. Review everything in the browser, then click Submit yourself.');
      break;
    }

    // Next
    const nextBtn = modal.locator('button:has-text("Next"), button:has-text("Review"), button:has-text("Continue")').first();
    if (await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      const txt = (await nextBtn.textContent()).trim();
      console.log(`  → "${txt}"`);
      await nextBtn.click();
    } else if (!await modal.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('  Modal closed.');
      break;
    }
  }

  console.log('\n✅ Done. Browser stays open for your review.');
  console.log('   DO NOT click Submit until you have verified all fields.');
}

run().catch(err => {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
});
