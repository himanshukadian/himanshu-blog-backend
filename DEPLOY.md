# Quick Deployment Guide

Your changes have been committed! To deploy to Heroku:

## Option 1: If you know your Heroku app name

```bash
# Add Heroku remote (if not already added)
heroku git:remote -a YOUR_APP_NAME

# Push to Heroku
git push heroku main
```

## Option 2: Find your Heroku app

```bash
# Login to Heroku (if not already logged in)
heroku login

# List your apps
heroku apps

# Add remote for your app
heroku git:remote -a YOUR_APP_NAME

# Push changes
git push heroku main
```

## Option 3: Quick deploy script

Run the deploy script:
```bash
./deploy.sh
```

## After Deployment

1. **Check logs:**
   ```bash
   heroku logs --tail
   ```

2. **Verify environment variables are set:**
   ```bash
   heroku config
   ```

3. **Test the deployment:**
   ```bash
   heroku open
   ```

## Required Environment Variables

Make sure these are set on Heroku:
- `MONGO_URI` - MongoDB connection string
- `MISTRAL_API_KEY` - (Optional) For AI features
- `JWT_SECRET` - For authentication
- `CONTACT_EMAIL` - For contact form
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` - For image uploads
- `FRONTEND_URL` - Your frontend URL
- `NODE_ENV=production` - Already set via app.json
- `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true` - Already set via app.json

Set them with:
```bash
heroku config:set KEY=value
```
