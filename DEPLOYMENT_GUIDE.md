# Deployment Guide - Puppeteer/Chrome Fix

This guide explains the fixes implemented to resolve the Chrome/Puppeteer PDF generation issues in deployment environments, particularly Heroku.

## Problem

The application was failing with the error:
```
PDF generation error: Error: Could not find Chrome (ver. 138.0.7204.94)
```

This occurs because Puppeteer requires Chrome to generate PDFs, but Chrome isn't available by default in containerized deployment environments like Heroku.

## Solution Overview

The fix involves three main components:

### 1. Updated Puppeteer Configuration (`controllers/resumeController.js`)

- Added comprehensive Chrome launch arguments for production environments
- Environment detection for Heroku (`process.env.DYNO`)
- Support for multiple Chrome executable path environment variables
- Enhanced error handling and timeouts
- Production-optimized browser settings

### 2. Heroku Buildpack Configuration (`app.json`)

- Added Puppeteer Heroku buildpack to install Chrome
- Set required environment variables
- Configured proper Chrome executable path

### 3. Package.json Updates

- Added `postinstall` script to install Puppeteer browsers
- Added debug script for troubleshooting

## Files Modified

1. **`controllers/resumeController.js`** - Enhanced Puppeteer configuration
2. **`package.json`** - Added postinstall script and debug command
3. **`app.json`** - New file for Heroku configuration
4. **`scripts/check-puppeteer.js`** - New debug script

## Deployment Instructions

### For New Heroku Apps

1. Create the app using the app.json configuration:
   ```bash
   heroku create your-app-name --app app.json
   ```

### For Existing Heroku Apps

1. Add the official Heroku Chrome for Testing buildpack:
   ```bash
   heroku buildpacks:add heroku-community/chrome-for-testing
   ```

2. Set the required environment variables:
   ```bash
   heroku config:set PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
   ```

3. Deploy your code:
   ```bash
   git add .
   git commit -m "Fix Puppeteer Chrome configuration for Heroku"
   git push heroku main
   ```

## Quick Fix for "Browser not found" Error

If you're getting the "Browser was not found at the configured executablePath" error:

```bash
# 1. Clear existing buildpacks and add them in correct order
heroku buildpacks:clear
heroku buildpacks:add heroku/nodejs
heroku buildpacks:add heroku-community/chrome-for-testing

# 2. Set environment variable
heroku config:set PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# 3. Force rebuild
git commit --allow-empty -m "Force rebuild with Chrome buildpack"
git push heroku main

# 4. Test the fix
heroku run npm run check-puppeteer
```

## Testing the Fix

After deployment, you can test if Puppeteer is working correctly:

```bash
heroku run npm run check-puppeteer
```

This will run a comprehensive check of the Puppeteer installation and PDF generation capabilities.

## Troubleshooting

### If PDF generation still fails:

1. Check the logs:
   ```bash
   heroku logs --tail
   ```

2. Run the debug script:
   ```bash
   heroku run npm run check-puppeteer
   ```

3. Verify environment variables are set:
   ```bash
   heroku config
   ```

### Common Issues:

- **Chrome not found at executable path**: 
  - Run `heroku run npm run check-puppeteer` to see which Chrome paths are available
  - Ensure the Chrome for Testing buildpack is installed correctly
  - The application now tries multiple Chrome paths automatically including PATH resolution
  - The new buildpack installs Chrome at `/app/.chrome-for-testing/chrome-linux64/chrome` and in PATH as `chrome`
  
- **Memory limits**: Heroku free tier has limited memory. Consider upgrading to Basic or higher.

- **Timeout issues**: The PDF generation now has 30-second timeouts. For complex resumes, this might need adjustment.

- **Missing fonts**: Some fonts might not be available in the Heroku environment.

- **Buildpack order matters**: Ensure the Chrome buildpack is added AFTER the Node.js buildpack

## Local Development

For local development, no special configuration is needed. Puppeteer will download and use its own Chrome installation.

## Alternative Solutions

If you continue having issues, consider these alternatives:

1. **Headless Chrome Docker**: Use a dedicated headless Chrome service
2. **External PDF Service**: Use services like PDFShift, HTML/CSS to PDF API
3. **Server-side rendering**: Use libraries like jsPDF for simpler PDF generation

## Environment Variables

The following environment variables are used:

- `NODE_ENV`: Set to 'production' in production
- `DYNO`: Automatically set by Heroku
- `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD`: Skip downloading Chrome during npm install
- `PUPPETEER_EXECUTABLE_PATH`: Path to Chrome executable (fallback)
- `GOOGLE_CHROME_BIN`: Alternative Chrome path (fallback)

**Note**: The new Chrome for Testing buildpack automatically adds Chrome to PATH, so explicit executable paths are usually not needed.

## Performance Considerations

- PDF generation is CPU and memory intensive
- Consider implementing caching for frequently generated resumes
- Use background jobs for large batch operations
- Monitor dyno memory usage

## Support

If you encounter issues:

1. Check the Heroku logs
2. Run the debug script
3. Verify all environment variables are set correctly
4. Ensure the buildpack is properly configured 