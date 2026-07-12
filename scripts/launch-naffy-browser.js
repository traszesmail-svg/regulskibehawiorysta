const puppeteer = require('puppeteer');

(async () => {
  console.log('Launching Puppeteer browser in headed mode with disabled web security and ignored cert errors...');
  try {
    const browser = await puppeteer.launch({
      headless: false,
      defaultViewport: null,
      ignoreHTTPSErrors: true,
      args: [
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--ignore-certificate-errors',
        '--ignore-certificate-errors-spki-list'
      ]
    });
    const page = await browser.newPage();
    await page.goto('https://app.naffy.io/login');
    console.log('Browser opened! You can now log in and manage your Naffy account.');
    
    // Keep browser open
    await new Promise(() => {});
  } catch (error) {
    console.error('Failed to launch browser:', error);
  }
})();
