import { chromium } from 'playwright';

const targetUrl = process.env.SYSTALOG_SMOKE_URL || 'http://127.0.0.1:4173';
const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const browser = await chromium.launch({
  executablePath: chromePath,
  headless: true,
});

try {
  const page = await browser.newPage();
  await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });

  await page.waitForSelector('text=SYSTALOG Terminal', { timeout: 15000 });
  await page.waitForSelector('text=AI Agent Command Center', { timeout: 15000 });
  await page.getByRole('button', { name: /A-Evolve Lab/i }).first().waitFor({ state: 'visible', timeout: 15000 });

  await page.getByRole('button', { name: /A-Evolve Lab/i }).first().click();
  await page.waitForSelector('text=Sync and bootstrap', { timeout: 15000 });
  await page.waitForSelector('text=Workspace contract', { timeout: 15000 });
  await page.waitForSelector('text=Built-in algorithms', { timeout: 15000 });

  await page.getByRole('button', { name: /Settings, onboarding, and stack config/i }).click();
  await page.waitForSelector('text=Central control for models, capture, skills, and ops', { timeout: 15000 });
  await page.waitForSelector('text=OpenCode free models', { timeout: 15000 });
  await page.waitForSelector('text=Open lab', { timeout: 15000 });

  const controlRoomVisible = await page.getByText('Central control for models, capture, skills, and ops').isVisible();
  const openLabVisible = await page.getByRole('button', { name: /Open lab/i }).isVisible();
  assert(controlRoomVisible, 'Settings control room is not visible');
  assert(openLabVisible, 'Open lab action is not visible inside settings');

  console.log('Smoke test passed');
} finally {
  await browser.close();
}
