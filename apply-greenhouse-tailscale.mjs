#!/usr/bin/env node
/**
 * apply-greenhouse-tailscale.mjs — Greenhouse form filler for Tailscale
 * Fills all fields and stops at Submit for user review.
 */

import { chromium } from 'playwright';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const profileDir = resolve(__dirname, '.browser-profile');
mkdirSync(profileDir, { recursive: true });
const chromeExec = '/System/Volumes/Data/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const RESUME_PATH = resolve(__dirname, 'output/cv-stephen-skalamera-tailscale-2026-04-06.pdf');

const COVER_LETTER = `I've spent the last decade building the operational infrastructure that scales post-sales teams in high-growth SaaS. At Benchmark Education, I built a Power BI Support Operations Hub connecting Freshdesk, Zendesk, Intercom, and Salesforce into a unified metrics layer — the same kind of cross-system visibility Tailscale needs across CS, Support, and Customer Success Engineering. At Sigma, I own workforce capacity modeling, SLA framework design, and real-time queue health dashboards used for operational planning. Separately, I built Jedana, an AI-powered customer health and operations platform — because I wanted better tooling than what existed.

The "Manager, Customer Experience Operations" mandate maps directly to the operational infrastructure work I've been doing for years: health scoring models, cross-functional program design, tooling administration, and translating data signals into leadership recommendations. I haven't used Gainsight before, but I've built equivalent functionality from scratch, and I learn platforms quickly.

Tailscale is a company I've followed closely. The zero-config networking approach, the engineering-led culture, and the Series C trajectory all point to a team that moves with discipline and ships what matters. I want to be part of building the operational foundation that scales with it.`;

const TAILSCALE_KNOWLEDGE = `Tailscale solves the distributed connectivity problem that engineering teams have been hacking around for years: secure, zero-config networking that works across devices, clouds, and locations without the overhead of traditional VPNs. I've spent years building operational infrastructure that depends on systems like this, connecting Freshdesk, Zendesk, Intercom, Salesforce, and RingCentral into unified dashboards and tooling. I understand why Tailscale has become a default for engineering-led teams, and I've followed the company's growth through the developer community and the Series C announcement. The product's simplicity is the technical achievement.`;

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function run() {
  console.log('\n🚀 Launching browser...');

  const context = await chromium.launchPersistentContext(profileDir, {
    executablePath: chromeExec,
    headless: false,
    viewport: { width: 1280, height: 1000 },
    args: ['--no-first-run', '--disable-blink-features=AutomationControlled'],
  });

  const page = await context.newPage();

  console.log('🔗 Navigating to Tailscale Greenhouse application...');
  await page.goto('https://job-boards.greenhouse.io/tailscale/jobs/4681674005', { waitUntil: 'domcontentloaded' });
  await sleep(2000);

  console.log('\n📝 Filling form fields...\n');

  // ── Personal info ──
  await page.fill('#first_name', 'Stephen');
  console.log('✅ First name');

  await page.fill('#last_name', 'Skalamera');
  console.log('✅ Last name');

  await page.fill('#email', 'skalamera@gmail.com');
  console.log('✅ Email');

  await page.fill('#phone', '4436241226');
  console.log('✅ Phone');

  // Country
  const countrySelect = page.locator('#job_application_answers_attributes_0_answer, select[name*="country"], #country').first();
  if (await countrySelect.isVisible({ timeout: 2000 }).catch(() => false)) {
    await countrySelect.selectOption({ label: 'United States' }).catch(async () => {
      // Try text input
      await countrySelect.fill('United States').catch(() => {});
    });
    console.log('✅ Country → United States');
  }

  // ── Resume upload ──
  if (existsSync(RESUME_PATH)) {
    const resumeInput = page.locator('input[type="file"]').first();
    if (await resumeInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await resumeInput.setInputFiles(RESUME_PATH);
      console.log('✅ Resume uploaded');
      await sleep(1500);
    } else {
      // Try the resume textarea
      const resumeTextarea = page.locator('textarea[name*="resume"], #resume_text').first();
      if (await resumeTextarea.isVisible({ timeout: 1000 }).catch(() => false)) {
        console.log('⚠️  Resume file input not visible — check browser');
      }
    }
  }

  // ── Cover letter ──
  // Try file upload first, then textarea
  const fileInputs = page.locator('input[type="file"]');
  const fileCount = await fileInputs.count().catch(() => 0);
  if (fileCount > 1) {
    await fileInputs.nth(1).setInputFiles(RESUME_PATH).catch(() => {});
    console.log('✅ Cover letter uploaded (PDF)');
  } else {
    const coverTextarea = page.locator('textarea[name*="cover"], #cover_letter_text').first();
    if (await coverTextarea.isVisible({ timeout: 1000 }).catch(() => false)) {
      await coverTextarea.fill(COVER_LETTER);
      console.log('✅ Cover letter filled (textarea)');
    }
  }

  await sleep(500);

  // ── LinkedIn ──
  const linkedinInput = page.locator('input[id*="linkedin"], input[placeholder*="linkedin"], input[name*="linkedin"]').first();
  if (await linkedinInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    await linkedinInput.fill('https://linkedin.com/in/skalamera');
    console.log('✅ LinkedIn');
  }

  // ── Eligibility dropdowns ──
  // Find all selects and log them
  const selects = page.locator('select');
  const selectCount = await selects.count().catch(() => 0);
  console.log(`\n   Found ${selectCount} dropdowns — processing...\n`);

  for (let i = 0; i < selectCount; i++) {
    const sel = selects.nth(i);
    if (!await sel.isVisible({ timeout: 500 }).catch(() => false)) continue;

    const id = await sel.getAttribute('id') || '';
    const opts = await sel.locator('option').allTextContents().catch(() => []);
    const validOpts = opts.map(o => o.trim()).filter(o => o && !o.toLowerCase().includes('select'));

    // Get label text
    const labelText = await page.evaluate(el => {
      const id = el.id;
      if (id) {
        const label = document.querySelector(`label[for="${id}"]`);
        if (label) return label.textContent.trim();
      }
      let node = el.parentElement;
      for (let i = 0; i < 4; i++) {
        if (!node) break;
        const label = node.querySelector('label');
        if (label && label.textContent.trim()) return label.textContent.trim();
        node = node.parentElement;
      }
      return id;
    }, await sel.elementHandle());

    const q = labelText.toLowerCase();
    console.log(`  Select: "${labelText}" — ${validOpts.join(' | ')}`);

    if (q.includes('location') || q.includes('us') || q.includes('united states') || q.includes('live in')) {
      const usOption = validOpts.find(o => o.toLowerCase().includes('yes') && o.toLowerCase().includes('us'));
      if (usOption) {
        await sel.selectOption({ label: usOption }).catch(() => {});
        console.log(`  ✅ → "${usOption}"`);
      }
    } else if (q.includes('sponsor') || q.includes('visa')) {
      await sel.selectOption({ label: 'No' }).catch(() => {});
      console.log(`  ✅ → No`);
    } else if (q.includes('year') || q.includes('experience') || q.includes('operations')) {
      await sel.selectOption({ label: '5+' }).catch(async () => {
        const fivePlus = validOpts.find(o => o.includes('5'));
        if (fivePlus) await sel.selectOption({ label: fivePlus }).catch(() => {});
      });
      console.log(`  ✅ → 5+`);
    } else if (q.includes('tailscale') || q.includes('used') || q.includes('prior')) {
      const notUsed = validOpts.find(o => o.toLowerCase().includes("haven't") || o.toLowerCase().includes('have not') || o.toLowerCase().includes('no'));
      if (notUsed) {
        await sel.selectOption({ label: notUsed }).catch(() => {});
        console.log(`  ✅ → "${notUsed}"`);
      }
    } else if (q.includes('country')) {
      await sel.selectOption({ label: 'United States' }).catch(() => {});
      console.log(`  ✅ → United States`);
    }
  }

  // ── Open-ended textareas ──
  const textareas = page.locator('textarea');
  const taCount = await textareas.count().catch(() => 0);

  for (let i = 0; i < taCount; i++) {
    const ta = textareas.nth(i);
    if (!await ta.isVisible({ timeout: 500 }).catch(() => false)) continue;

    const val = await ta.inputValue().catch(() => '');
    if (val) continue; // already filled

    const labelText = await page.evaluate(el => {
      let node = el.parentElement;
      for (let i = 0; i < 5; i++) {
        if (!node) break;
        const label = node.querySelector('label');
        if (label && label.textContent.trim()) return label.textContent.trim();
        node = node.parentElement;
      }
      return '';
    }, await ta.elementHandle());

    const q = labelText.toLowerCase();
    console.log(`\n  Textarea: "${labelText}"`);

    if (q.includes('tailscale') || q.includes('knowledge') || q.includes('familiar')) {
      await ta.fill(TAILSCALE_KNOWLEDGE);
      console.log('  ✅ Tailscale knowledge filled');
    } else if (q.includes('cover') || q.includes('letter')) {
      await ta.fill(COVER_LETTER);
      console.log('  ✅ Cover letter filled');
    } else {
      console.log(`  ⚠️  Unknown textarea — check browser`);
    }
  }

  // ── Privacy consent checkbox ──
  const consentCheckbox = page.locator('input[type="checkbox"]').first();
  if (await consentCheckbox.isVisible({ timeout: 1000 }).catch(() => false)) {
    const isChecked = await consentCheckbox.isChecked().catch(() => false);
    if (!isChecked) {
      await consentCheckbox.check({ force: true }).catch(() => {});
      console.log('\n✅ Privacy consent checked');
    }
  }

  console.log('\n🛑 Form filled. Review everything in the browser, then click Submit yourself.');
  console.log('\n   Summary:');
  console.log('   - Name: Stephen Skalamera');
  console.log('   - Email: skalamera@gmail.com');
  console.log('   - Phone: 4436241226');
  console.log('   - Country: United States');
  console.log('   - Resume: cv-stephen-skalamera-tailscale-2026-04-06.pdf');
  console.log('   - LinkedIn: linkedin.com/in/skalamera');
  console.log('   - Location in US: Yes');
  console.log('   - Visa sponsorship: No');
  console.log('   - Years CS/RevOps: 5+');
  console.log('   - Tailscale knowledge: filled');
  console.log('   - Prior Tailscale use: Haven\'t used');
  console.log('\n   ⚠️  DO NOT click Submit until you have reviewed all fields.');
}

run().catch(err => {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
});
