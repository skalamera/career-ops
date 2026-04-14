import { chromium } from 'playwright';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const profileDir = resolve(__dirname, '.browser-profile');
mkdirSync(profileDir, { recursive: true });
const chromeExec = '/System/Volumes/Data/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const context = await chromium.launchPersistentContext(profileDir, {
  executablePath: chromeExec,
  headless: false,
  viewport: { width: 1280, height: 900 },
});
const page = await context.newPage();
await page.goto('https://www.linkedin.com/jobs/view/4397954825/', { waitUntil: 'domcontentloaded' });
await new Promise(r => setTimeout(r, 3000));

const [newPage] = await Promise.all([
  context.waitForEvent('page', { timeout: 10000 }),
  page.locator('button:has-text("Apply"), a:has-text("Apply")').first().click().catch(() => {}),
]).catch(() => [null]);

await new Promise(r => setTimeout(r, 3000));
const url = newPage ? newPage.url() : page.url();
console.log('APPLY_URL:', url);
await context.close();
