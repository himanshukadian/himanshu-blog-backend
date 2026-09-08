const puppeteer = require('puppeteer');
const fs = require('fs');
const { execSync } = require('child_process');

const rows = [
  ['A centerBlock', '<div style="text-align:center"><span>+91-9761744048</span><span> — </span><span>himanshu.c.official@gmail.com</span> — <span>linkedin.com/in/himanshuofficial</span> — <span>github.com/himanshukadian</span></div>'],
  ['B leftBlock', '<div style="text-align:left"><span>+91-9761744048</span><span> — </span><span>himanshu.c.official@gmail.com</span> — <span>linkedin.com/in/himanshuofficial</span> — <span>github.com/himanshukadian</span></div>'],
  ['C flexCenterNowrap', '<div style="display:flex;justify-content:center;gap:6px;white-space:nowrap"><span>+91-9761744048</span> — <span>himanshu.c.official@gmail.com</span> — <span>linkedin.com/in/himanshuofficial</span> — <span>github.com/himanshukadian</span></div>'],
  ['D nbspAfterPlus', '<div style="text-align:center"><span>+&#x200B;91-9761744048</span> — <span>himanshu.c.official@gmail.com</span> — <span>linkedin.com/in/himanshuofficial</span> — <span>github.com/himanshukadian</span></div>'],
  ['E phoneLast', '<div style="text-align:center"><span>himanshu.c.official@gmail.com</span> — <span>linkedin.com/in/himanshuofficial</span> — <span>github.com/himanshukadian</span> — <span>+91-9761744048</span></div>'],
  ['F jsEconomy', '<p style="font:italic 11.5pt serif">Role: <b>Mobelogy Communications</b> — +91-9761744048 test alpha omega</p>'],
];

(async () => {
  let html = '<html><head><style>body{font-family:"Times New Roman",serif;font-size:11.5pt;margin:0;padding:0;background:#fff;}</style></head><body>';
  rows.forEach(([label, inner]) => { html += `<p>${label}</p>${inner}<br>`; });
  html += '</body></html>';

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 800 });
  await page.setContent(html, { waitUntil: 'networkidle0' });
  const buf = await page.pdf({ format: 'Letter', margin: { top: '0', right: '0', bottom: '0', left: '0' }, printBackground: true });
  fs.writeFileSync('/tmp/probe2.pdf', buf);
  await browser.close();
  console.log(execSync('pdftotext -layout /tmp/probe2.pdf -', { encoding: 'utf8' }));
})();