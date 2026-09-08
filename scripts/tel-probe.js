const puppeteer = require('puppeteer');
const fs = require('fs');
const { execSync } = require('child_process');

const variants = [
  ['v1 plain', '+91-9761744048'],
  ['v2 noDash', '+919761744048'],
  ['v3 zwnjPre', '\u200B+91-9761744048'],
  ['v4 zwspMid', '+9\u200B1-9761744048'],
  ['v5 nbspPre', '\u00A0+91-9761744048'],
  ['v6 splitSpans', '+'],
  ['v6b splitSpans', '91-9761744048'],
  ['v7 alphaPre', 'x +91-9761744048'],
  ['v7b alphaPre', 'x+91-9761744048'],
  ['v8 letterSpacing', '+91-9761744048'],
];

(async () => {
  let html = '<html><head><style>body{font-family:"Times New Roman",serif;font-size:11.5pt;margin:0;padding:0.28in 0.40in;} p{margin:6px 0;}</style></head><body>';
  for (const [label, txt] of variants) {
    if (label === 'v6 splitSpans') {
      html += `<p>v6: <span>+</span><span>91-9761744048</span></p>`;
    } else if (label === 'v8 letterSpacing') {
      html += `<p style="letter-spacing:0">v8: ${txt}</p>`;
    } else {
      html += `<p>${label}: ${txt}</p>`;
    }
  }
  html += '</body></html>';

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  const buf = await page.pdf({ format: 'Letter', margin: { top: '0', right: '0', bottom: '0', left: '0' }, printBackground: true });
  fs.writeFileSync('/tmp/probe.pdf', buf);
  await browser.close();
  const text = execSync('pdftotext -layout /tmp/probe.pdf -', { encoding: 'utf8' });
  console.log(text);
})();