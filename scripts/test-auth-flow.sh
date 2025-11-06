#!/bin/bash

# ============================================================================
# Authentication Flow Test Script
# Tests that all 4 roles can authenticate and access their dashboards
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║      Authentication Flow Test                         ║${NC}"
echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo ""

# Check if dev server is running
if ! curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${RED}❌ Development server is not running${NC}"
    echo ""
    echo "Please start the dev server first:"
    echo -e "${YELLOW}npm run dev${NC}"
    echo ""
    exit 1
fi

echo -e "${GREEN}✅ Development server is running${NC}"
echo ""

# Test users
declare -A TEST_USERS=(
    ["admin"]="admin@preferredsolutions.test:Admin123!:/admin"
    ["dispatcher"]="dispatcher@preferredsolutions.test:Dispatcher123!:/dispatcher"
    ["driver"]="driver@preferredsolutions.test:Driver123!:/driver"
    ["customer"]="customer@preferredsolutions.test:Customer123!:/customer/dashboard"
)

echo "Testing authentication for each role..."
echo ""

PASSED=0
FAILED=0

for role in admin dispatcher driver customer; do
    IFS=':' read -r email password expected_path <<< "${TEST_USERS[$role]}"
    
    echo -e "${YELLOW}Testing ${role}...${NC}"
    echo "  Email: ${email}"
    echo "  Expected redirect: ${expected_path}"
    
    # Note: This is a manual test prompt since we can't automate browser auth
    echo ""
    echo "  👉 Please manually test in browser:"
    echo "     1. Go to http://localhost:3000/auth/sign-in"
    echo "     2. Sign in with: ${email} / ${password}"
    echo "     3. Verify you land on: ${expected_path}"
    echo ""
    
    read -p "  Did the test pass? (y/n) " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "  ${GREEN}✅ ${role} authentication successful${NC}"
        ((PASSED++))
    else
        echo -e "  ${RED}❌ ${role} authentication failed${NC}"
        ((FAILED++))
    fi
    echo ""
done

echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""
echo "Test Results:"
echo -e "  ${GREEN}Passed: ${PASSED}${NC}"
echo -e "  ${RED}Failed: ${FAILED}${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All authentication tests passed!${NC}"
    exit 0
else
    echo -e "${RED}⚠️  Some tests failed. Check the errors above.${NC}"
    exit 1
fi

