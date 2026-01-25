const puppeteer = require('puppeteer');
const fs = require('fs');
(async () => {
  const candidateUrls = [];
  for (let p = 3000; p <= 3010; p++) {
    candidateUrls.push(`http://localhost:${p}/teacher/advanced`);
    candidateUrls.push(`http://127.0.0.1:${p}/teacher/advanced`);
  }
  let url = null;
  for (const u of candidateUrls) {
    try {
      const res = await (await fetch(u, { method: 'HEAD' })).catch(() => null);
      if (res && (res.status === 200 || res.status === 301 || res.status === 302)) { url = u; break; }
    } catch (e) { /* ignore */ }
  }
  if (!url) url = candidateUrls[0];
  const outScreenshot = 'advanced-modules-screenshot.png';
  const logs = [];
  const errors = [];

  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();

  page.on('console', msg => logs.push({type: msg.type(), text: msg.text()}));
  page.on('pageerror', err => errors.push(String(err)));
  page.on('response', res => {
    // capture failed responses
    if (res.status() >= 400) {
      logs.push({ type: 'response', url: res.url(), status: res.status() });
    }
  });

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });
    // Wait for main container
    await page.waitForSelector('.advanced-modules-page', { timeout: 8000 });
    await page.screenshot({ path: outScreenshot, fullPage: true });
    console.log('screenshotSaved', outScreenshot);
  } catch (err) {
    errors.push(String(err));
  } finally {
    await browser.close();
  }

  const result = { url, screenshot: outScreenshot, logs, errors };
  fs.writeFileSync('advanced-modules-test-output.json', JSON.stringify(result, null, 2));
  console.log('Test finished. Output written to advanced-modules-test-output.json');
})();
