const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Acessa o arquivo local
  await page.goto('file://' + __dirname + '/front-end/dashboard.html');
  
  // Abre o modal
  await page.evaluate(() => {
    document.getElementById('modalCompromisso').style.display = 'flex';
  });
  
  // Dá um tempo para renderizar
  await page.waitForTimeout(1000);
  
  // Tira print
  await page.screenshot({ path: 'screenshot_dashboard.png' });
  
  await browser.close();
})();
