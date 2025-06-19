#!/bin/bash

# Test script for Zynki Project API
BASE_URL="http://localhost:5000"

echo "🧪 Testing Zynki Project API"
echo "=============================="

# Test 1: Submit a video project
echo -e "\n1️⃣ Testing video project submission..."
curl -X POST $BASE_URL/api/projects/submit \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john.doe@example.com",
    "projectType": "video",
    "description": "I need a 30-second explainer video for my fitness app. The video should showcase the app features, target audience is fitness enthusiasts aged 25-40, and I want it to be engaging and modern.",
    "timeline": "week",
    "budget": "500-1000"
  }' | jq '.'

# Test 2: Submit a landing page project
echo -e "\n2️⃣ Testing landing page project submission..."
curl -X POST $BASE_URL/api/projects/submit \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Sarah Chen",
    "email": "sarah.chen@startup.com",
    "projectType": "landing-page",
    "description": "Create a landing page for my SaaS tool. I need high-converting copy, modern design, and integration with analytics. Target audience is small business owners.",
    "timeline": "asap",
    "budget": "1000-2500"
  }' | jq '.'

# Test 3: Submit a content marketing project
echo -e "\n3️⃣ Testing content marketing project submission..."
curl -X POST $BASE_URL/api/projects/submit \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Marcus Rodriguez",
    "email": "marcus@marketing.com",
    "projectType": "content-marketing",
    "description": "Turn my blog post about productivity tips into multiple content pieces including social media posts, infographics, and a short video.",
    "timeline": "month",
    "budget": "200-500"
  }' | jq '.'

# Test 4: Test invalid email (should return error)
echo -e "\n4️⃣ Testing invalid email validation..."
curl -X POST $BASE_URL/api/projects/submit \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "invalid-email",
    "projectType": "video",
    "description": "Test project with invalid email",
    "timeline": "week",
    "budget": "500-1000"
  }' | jq '.'

# Test 5: Test missing required fields (should return error)
echo -e "\n5️⃣ Testing missing required fields..."
curl -X POST $BASE_URL/api/projects/submit \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Incomplete User",
    "email": "incomplete@test.com"
  }' | jq '.'

echo -e "\n✅ API testing completed!"
echo -e "\nNote: For protected endpoints (GET, PATCH), you'll need to:"
echo "1. Set up authentication"
echo "2. Get a JWT token"
echo "3. Include the token in Authorization header" 