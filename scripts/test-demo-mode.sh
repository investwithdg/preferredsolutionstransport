#!/bin/bash

# Demo Mode Testing Script
# Tests the functionality of demo tabs in the local environment

set -e

echo "========================================="
echo "Demo Mode Testing Script"
echo "========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Base URL
BASE_URL="http://localhost:3000"

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Function to print test result
test_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ PASS${NC}: $2"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗ FAIL${NC}: $2"
        ((TESTS_FAILED++))
    fi
}

# Function to check if server is running
check_server() {
    echo "Checking if development server is running..."
    if curl -s -o /dev/null -w "%{http_code}" "$BASE_URL" | grep -q "200\|301\|302"; then
        test_result 0 "Development server is running at $BASE_URL"
        return 0
    else
        test_result 1 "Development server is not running at $BASE_URL"
        echo ""
        echo -e "${YELLOW}Please start the server with:${NC}"
        echo "  NEXT_PUBLIC_DEMO_MODE=true npm run dev"
        echo ""
        return 1
    fi
}

# Function to check if demo mode is enabled
check_demo_mode() {
    echo ""
    echo "Checking if demo mode is enabled..."
    
    # Check if the page contains demo mode indicators
    PAGE_CONTENT=$(curl -s "$BASE_URL")
    
    if echo "$PAGE_CONTENT" | grep -q "DEMO MODE"; then
        test_result 0 "Demo mode banner text found"
    else
        test_result 1 "Demo mode banner text NOT found"
    fi
    
    if echo "$PAGE_CONTENT" | grep -q "DemoProvider\|demo-role"; then
        test_result 0 "Demo context appears to be initialized"
    else
        test_result 1 "Demo context NOT detected"
    fi
}

# Function to check component files
check_component_files() {
    echo ""
    echo "Verifying demo component files exist..."
    
    if [ -f "app/contexts/DemoContext.tsx" ]; then
        test_result 0 "DemoContext.tsx exists"
    else
        test_result 1 "DemoContext.tsx NOT found"
    fi
    
    if [ -f "app/components/demo/DemoRoleSwitcher.tsx" ]; then
        test_result 0 "DemoRoleSwitcher.tsx exists"
    else
        test_result 1 "DemoRoleSwitcher.tsx NOT found"
    fi
    
    if [ -f "app/hooks/useDemoAuth.ts" ]; then
        test_result 0 "useDemoAuth.ts exists"
    else
        test_result 1 "useDemoAuth.ts NOT found"
    fi
    
    if [ -f "app/lib/demo/demoData.ts" ]; then
        test_result 0 "demoData.ts exists"
    else
        test_result 1 "demoData.ts NOT found"
    fi
    
    if [ -f "app/components/ClientLayout.tsx" ]; then
        test_result 0 "ClientLayout.tsx exists"
    else
        test_result 1 "ClientLayout.tsx NOT found"
    fi
}

# Function to verify TypeScript code structure
check_code_structure() {
    echo ""
    echo "Verifying code structure..."
    
    # Check DemoContext exports
    if grep -q "export type DemoRole" "app/contexts/DemoContext.tsx"; then
        test_result 0 "DemoRole type is exported"
    else
        test_result 1 "DemoRole type NOT exported"
    fi
    
    if grep -q "export function useDemo" "app/contexts/DemoContext.tsx"; then
        test_result 0 "useDemo hook is exported"
    else
        test_result 1 "useDemo hook NOT exported"
    fi
    
    # Check demo drivers
    if grep -q "DEMO_DRIVERS" "app/contexts/DemoContext.tsx"; then
        test_result 0 "Demo drivers array is defined"
    else
        test_result 1 "Demo drivers array NOT found"
    fi
    
    # Check role configuration
    if grep -q "roleConfig" "app/components/demo/DemoRoleSwitcher.tsx"; then
        test_result 0 "Role configuration is defined"
    else
        test_result 1 "Role configuration NOT found"
    fi
    
    # Check demo data generation
    if grep -q "generateDemoOrders" "app/lib/demo/demoData.ts"; then
        test_result 0 "generateDemoOrders function is defined"
    else
        test_result 1 "generateDemoOrders function NOT found"
    fi
}

# Function to verify role switching logic
check_role_switching() {
    echo ""
    echo "Verifying role switching logic..."
    
    # Check if setRole function exists and has proper navigation
    if grep -q "const setRole = (role: DemoRole)" "app/contexts/DemoContext.tsx"; then
        test_result 0 "setRole function is defined"
    else
        test_result 1 "setRole function NOT found"
    fi
    
    # Check role-based navigation
    if grep -q "router.push('/dispatcher')" "app/contexts/DemoContext.tsx"; then
        test_result 0 "Dispatcher navigation is configured"
    else
        test_result 1 "Dispatcher navigation NOT found"
    fi
    
    if grep -q "router.push('/driver')" "app/contexts/DemoContext.tsx"; then
        test_result 0 "Driver navigation is configured"
    else
        test_result 1 "Driver navigation NOT found"
    fi
    
    if grep -q "router.push('/admin')" "app/contexts/DemoContext.tsx"; then
        test_result 0 "Admin navigation is configured"
    else
        test_result 1 "Admin navigation NOT found"
    fi
}

# Function to verify localStorage integration
check_localstorage() {
    echo ""
    echo "Verifying localStorage integration..."
    
    if grep -q "localStorage.setItem('demo-role'" "app/contexts/DemoContext.tsx"; then
        test_result 0 "Demo role is saved to localStorage"
    else
        test_result 1 "Demo role localStorage NOT found"
    fi
    
    if grep -q "localStorage.setItem('demo-driver-id'" "app/contexts/DemoContext.tsx"; then
        test_result 0 "Demo driver ID is saved to localStorage"
    else
        test_result 1 "Demo driver ID localStorage NOT found"
    fi
    
    if grep -q "localStorage.getItem('demo-role')" "app/contexts/DemoContext.tsx"; then
        test_result 0 "Demo role is loaded from localStorage"
    else
        test_result 1 "Demo role loading NOT found"
    fi
}

# Function to verify quick actions
check_quick_actions() {
    echo ""
    echo "Verifying quick actions..."
    
    if grep -q "Create Test Order" "app/components/demo/DemoRoleSwitcher.tsx"; then
        test_result 0 "Create Test Order action is defined"
    else
        test_result 1 "Create Test Order action NOT found"
    fi
    
    if grep -q "Reset All Demo Data" "app/components/demo/DemoRoleSwitcher.tsx"; then
        test_result 0 "Reset All Demo Data action is defined"
    else
        test_result 1 "Reset All Demo Data action NOT found"
    fi
    
    if grep -q "demo-test-orders" "app/components/demo/DemoRoleSwitcher.tsx"; then
        test_result 0 "Test orders localStorage key is used"
    else
        test_result 1 "Test orders localStorage key NOT found"
    fi
    
    if grep -q "localStorage.clear()" "app/components/demo/DemoRoleSwitcher.tsx"; then
        test_result 0 "localStorage.clear() is used for reset"
    else
        test_result 1 "localStorage.clear() NOT found"
    fi
}

# Function to verify demo data
check_demo_data() {
    echo ""
    echo "Verifying demo data structure..."
    
    if grep -q "NYC_ADDRESSES" "app/lib/demo/demoData.ts"; then
        test_result 0 "NYC addresses are defined"
    else
        test_result 1 "NYC addresses NOT found"
    fi
    
    if grep -q "DEMO_CUSTOMERS" "app/lib/demo/demoData.ts"; then
        test_result 0 "Demo customers are defined"
    else
        test_result 1 "Demo customers NOT found"
    fi
    
    if grep -q "calculatePricing" "app/lib/demo/demoData.ts"; then
        test_result 0 "Pricing calculation function is defined"
    else
        test_result 1 "Pricing calculation function NOT found"
    fi
    
    if grep -q "createTestOrder" "app/lib/demo/demoData.ts"; then
        test_result 0 "Create test order function is defined"
    else
        test_result 1 "Create test order function NOT found"
    fi
}

# Function to verify UI components
check_ui_components() {
    echo ""
    echo "Verifying UI components..."
    
    # Check icons
    if grep -q "import.*lucide-react" "app/components/demo/DemoRoleSwitcher.tsx"; then
        test_result 0 "Lucide icons are imported"
    else
        test_result 1 "Lucide icons NOT imported"
    fi
    
    # Check UI components
    if grep -q "from '@/app/components/ui/button'" "app/components/demo/DemoRoleSwitcher.tsx"; then
        test_result 0 "Button component is imported"
    else
        test_result 1 "Button component NOT imported"
    fi
    
    if grep -q "from '@/app/components/ui/card'" "app/components/demo/DemoRoleSwitcher.tsx"; then
        test_result 0 "Card component is imported"
    else
        test_result 1 "Card component NOT imported"
    fi
    
    if grep -q "from '@/app/components/ui/select'" "app/components/demo/DemoRoleSwitcher.tsx"; then
        test_result 0 "Select component is imported"
    else
        test_result 1 "Select component NOT imported"
    fi
}

# Function to check for warnings banner
check_warning_banner() {
    echo ""
    echo "Verifying warning banner..."
    
    if grep -q "DEMO MODE.*testing only" "app/components/demo/DemoRoleSwitcher.tsx"; then
        test_result 0 "Warning banner text is correct"
    else
        test_result 1 "Warning banner text NOT found"
    fi
    
    if grep -q "AlertTriangle" "app/components/demo/DemoRoleSwitcher.tsx"; then
        test_result 0 "Warning icons are used"
    else
        test_result 1 "Warning icons NOT found"
    fi
    
    if grep -q "fixed top-0" "app/components/demo/DemoRoleSwitcher.tsx"; then
        test_result 0 "Banner is fixed to top"
    else
        test_result 1 "Banner positioning NOT found"
    fi
}

# Function to verify integration with main app
check_app_integration() {
    echo ""
    echo "Verifying integration with main app..."
    
    if grep -q "DemoProvider" "app/components/ClientLayout.tsx"; then
        test_result 0 "DemoProvider is used in ClientLayout"
    else
        test_result 1 "DemoProvider NOT found in ClientLayout"
    fi
    
    if grep -q "DemoRoleSwitcher" "app/components/ClientLayout.tsx"; then
        test_result 0 "DemoRoleSwitcher is rendered in ClientLayout"
    else
        test_result 1 "DemoRoleSwitcher NOT found in ClientLayout"
    fi
    
    if grep -q "ClientLayout" "app/layout.tsx"; then
        test_result 0 "ClientLayout is used in root layout"
    else
        test_result 1 "ClientLayout NOT found in root layout"
    fi
}

# Main execution
echo "Running demo mode tests..."
echo ""

# Run all tests
check_component_files
check_code_structure
check_role_switching
check_localstorage
check_quick_actions
check_demo_data
check_ui_components
check_warning_banner
check_app_integration
check_server
check_demo_mode

# Print summary
echo ""
echo "========================================="
echo "Test Summary"
echo "========================================="
echo -e "${GREEN}Tests Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Tests Failed: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    echo ""
    echo "Next steps for manual testing:"
    echo "1. Open http://localhost:3000 in your browser"
    echo "2. Verify the yellow demo banner appears at the top"
    echo "3. Check the floating demo widget in bottom-right corner"
    echo "4. Test switching between all 4 roles"
    echo "5. Test quick actions (Create Order, Reset Data)"
    echo "6. Verify role persistence after page refresh"
    echo ""
    exit 0
else
    echo -e "${RED}✗ Some tests failed. Please review the errors above.${NC}"
    echo ""
    exit 1
fi

