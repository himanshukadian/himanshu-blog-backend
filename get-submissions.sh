#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
PAGE=1
LIMIT=10
TOKEN=""

# Help message
show_help() {
    echo "Usage: ./get-submissions.sh [OPTIONS]"
    echo "Options:"
    echo "  -t, --token TOKEN    JWT token for authentication"
    echo "  -p, --page PAGE      Page number (default: 1)"
    echo "  -l, --limit LIMIT    Items per page (default: 10)"
    echo "  -h, --help           Show this help message"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    key="$1"
    case $key in
        -t|--token)
            TOKEN="$2"
            shift
            shift
            ;;
        -p|--page)
            PAGE="$2"
            shift
            shift
            ;;
        -l|--limit)
            LIMIT="$2"
            shift
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Check if token is provided
if [ -z "$TOKEN" ]; then
    echo -e "${BLUE}No token provided. Attempting to login...${NC}"
    echo -n "Enter admin email: "
    read EMAIL
    echo -n "Enter password: "
    read -s PASSWORD
    echo

    # Login to get token
    echo -e "${BLUE}Logging in...${NC}"
    RESPONSE=$(curl -s -X POST http://localhost:5000/api/auth/login \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
    
    # Extract token from response
    TOKEN=$(echo $RESPONSE | grep -o '"token":"[^"]*' | grep -o '[^"]*$')
    
    if [ -z "$TOKEN" ]; then
        echo "Failed to get authentication token"
        exit 1
    fi
fi

echo -e "${BLUE}Fetching project submissions (Page: $PAGE, Limit: $LIMIT)...${NC}"

# Get project submissions
curl -s -X GET "http://localhost:5000/api/projects?page=$PAGE&limit=$LIMIT" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" | jq '.'

echo -e "${GREEN}Done!${NC}" 