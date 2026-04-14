import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pdfPath = path.resolve(__dirname, 'output/cv-skalamera-eliseai-cxops-2026-04-06.pdf');

const browser = await chromium.launch({ headless: false, slowMo: 50 });
const page = await browser.newPage();

await page.goto('https://www.linkedin.com/jobs/view/4371209701/', {
  waitUntil: 'domcontentloaded', timeout: 20000
});
await page.waitForTimeout(2000);

// Check if there's an Easy Apply button or external apply
const pageText = await page.innerText('body');
console.log('Page loaded. Checking for apply button...');

// Look for Easy Apply or Apply button
const easyApply = await page.$('button:has-text("Easy Apply")');
const applyBtn = await page.$('button:has-text("Apply"), a:has-text("Apply")');

if (easyApply) {
  console.log('Found Easy Apply button — LinkedIn native form');
  await easyApply.click();
  await page.waitForTimeout(2000);
  const formText = await page.innerText('body');
  console.log('Form preview:');
  console.log(formText.slice(0, 3000));
} else if (applyBtn) {
  console.log('Found external Apply button');
  await applyBtn.click();
  await page.waitForTimeout(3000);
  console.log('Navigated to:', page.url());
  const formText = await page.innerText('body');
  console.log(formText.slice(0, 2000));
} else {
  console.log('No apply button found. Current URL:', page.url());
  console.log(pageText.slice(0, 1000));
}

// Keep browser open
console.log('\nBrowser left open. Press Ctrl+C to close.');
await new Promise(() => {});
