#!/bin/bash

# Heroku Deployment Script
# This script helps deploy the blog backend to Heroku

set -e

echo "🚀 Starting Heroku Deployment..."

# Check if Heroku CLI is installed
if ! command -v heroku &> /dev/null; then
    echo "❌ Heroku CLI is not installed. Please install it first:"
    echo "   https://devcenter.heroku.com/articles/heroku-cli"
    exit 1
fi

# Check if logged in to Heroku
if ! heroku auth:whoami &> /dev/null; then
    echo "🔐 Please login to Heroku first:"
    echo "   heroku login"
    exit 1
fi

# Check if Heroku remote exists
if ! git remote | grep -q heroku; then
    echo "📦 No Heroku remote found. Creating Heroku app..."
    
    # Ask for app name or use default
    read -p "Enter Heroku app name (or press Enter for auto-generated name): " APP_NAME
    
    if [ -z "$APP_NAME" ]; then
        heroku create
    else
        heroku create "$APP_NAME"
    fi
    
    echo "✅ Heroku app created!"
    
    # Add buildpacks
    echo "📦 Adding buildpacks..."
    heroku buildpacks:add heroku/nodejs
    heroku buildpacks:add heroku-community/chrome-for-testing
    
    # Set environment variables
    echo "⚙️  Setting environment variables..."
    heroku config:set NODE_ENV=production
    heroku config:set PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
    
    echo "⚠️  Don't forget to set these required environment variables:"
    echo "   - MONGO_URI (MongoDB connection string)"
    echo "   - MISTRAL_API_KEY (for AI features)"
    echo "   - JWT_SECRET (for authentication)"
    echo "   - CONTACT_EMAIL (for contact form)"
    echo ""
    echo "   Run: heroku config:set KEY=value"
else
    echo "✅ Heroku remote already exists"
fi

# Push to Heroku
echo "📤 Deploying to Heroku..."
git push heroku main

echo "✅ Deployment complete!"
echo ""
echo "🔍 Check your app logs:"
echo "   heroku logs --tail"
echo ""
echo "🧪 Test Puppeteer:"
echo "   heroku run npm run check-puppeteer"
echo ""
echo "🌐 Open your app:"
echo "   heroku open"
