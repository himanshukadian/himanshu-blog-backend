const puppeteer = require('puppeteer');

async function checkPuppeteer() {
  console.log('🔍 Checking Puppeteer installation...');
  
  try {
    console.log('Environment variables:');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('DYNO:', process.env.DYNO);
    console.log('GOOGLE_CHROME_BIN:', process.env.GOOGLE_CHROME_BIN);
    console.log('PUPPETEER_EXECUTABLE_PATH:', process.env.PUPPETEER_EXECUTABLE_PATH);
    console.log('PUPPETEER_SKIP_CHROMIUM_DOWNLOAD:', process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD);
    
    const isHeroku = !!process.env.DYNO;
    const isProduction = process.env.NODE_ENV === 'production';
    
    let launchOptions = {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ]
    };

    if (isHeroku || isProduction) {
      launchOptions.args.push(
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-features=TranslateUI',
        '--disable-ipc-flooding-protection'
      );
      
      // Try different Chrome executable paths in order of preference
      const chromePaths = [
        process.env.GOOGLE_CHROME_BIN,
        process.env.PUPPETEER_EXECUTABLE_PATH,
        '/app/.chrome-for-testing/chrome-linux64/chrome', // New Chrome for Testing buildpack
        '/app/.apt/usr/bin/google-chrome-stable',
        '/app/.apt/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable',
        '/usr/bin/google-chrome',
        '/usr/bin/chromium-browser',
        '/usr/bin/chromium'
      ];
      
      console.log('\n🔍 Checking if Chrome is in PATH:');
      const fs = require('fs');
      const { execSync } = require('child_process');
      
      try {
        const chromeInPath = execSync('which chrome', { encoding: 'utf8' }).trim();
        console.log(`  Chrome in PATH: ✅ Found at ${chromeInPath}`);
        launchOptions.executablePath = chromeInPath;
      } catch (error) {
        console.log('  Chrome in PATH: ❌ Not found');
        
        console.log('\n🔍 Checking available Chrome paths:');
        for (const chromePath of chromePaths) {
          if (chromePath) {
            const exists = fs.existsSync(chromePath);
            console.log(`  ${chromePath}: ${exists ? '✅ Found' : '❌ Not found'}`);
            if (exists && !launchOptions.executablePath) {
              launchOptions.executablePath = chromePath;
              console.log(`  → Using: ${chromePath}`);
            }
          }
        }
      }
      
      if (!launchOptions.executablePath) {
        console.log('\n⚠️  No Chrome executable found, using default Puppeteer Chrome');
      } else {
        console.log(`\n✅ Selected Chrome executable: ${launchOptions.executablePath}`);
      }
    }

    console.log('🚀 Launching browser with options:', JSON.stringify(launchOptions, null, 2));
    
    const browser = await puppeteer.launch(launchOptions);
    console.log('✅ Browser launched successfully!');
    
    const page = await browser.newPage();
    console.log('✅ New page created successfully!');
    
    await page.setContent('<html><body><h1>Test PDF</h1></body></html>');
    console.log('✅ Content set successfully!');
    
    const pdf = await page.pdf({ format: 'A4' });
    console.log('✅ PDF generated successfully! Size:', pdf.length, 'bytes');
    
    await browser.close();
    console.log('✅ Browser closed successfully!');
    
    console.log('🎉 All Puppeteer checks passed!');
    
  } catch (error) {
    console.error('❌ Puppeteer check failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

// Run the check if this script is executed directly
if (require.main === module) {
  checkPuppeteer();
}

module.exports = { checkPuppeteer }; 