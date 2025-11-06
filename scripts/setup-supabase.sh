#!/bin/bash

# ============================================================================
# Supabase Setup Script
# This script helps set up your fresh Supabase project
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║      Supabase Fresh Setup Script                      ║${NC}"
echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI is not installed${NC}"
    echo ""
    echo "Please install it first:"
    echo -e "${YELLOW}npm install -g supabase${NC}"
    echo ""
    exit 1
fi

echo -e "${GREEN}✅ Supabase CLI is installed${NC}"
echo ""

# Check if .env.local has been updated
if grep -q "YOUR_SUPABASE_PROJECT_URL_HERE" .env.local 2>/dev/null; then
    echo -e "${RED}❌ Environment variables not configured${NC}"
    echo ""
    echo "Please update .env.local with your Supabase credentials:"
    echo "  1. Go to https://app.supabase.com/project/YOUR_PROJECT/settings/api"
    echo "  2. Copy your Project URL, anon key, and service_role key"
    echo "  3. Update the values in .env.local"
    echo ""
    exit 1
fi

echo -e "${GREEN}✅ Environment variables configured${NC}"
echo ""

# Ask user if they want to link to remote project
echo -e "${YELLOW}Step 1: Link to Remote Supabase Project${NC}"
echo ""
read -p "Have you already linked this project to Supabase? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "To link your project, run:"
    echo -e "${BLUE}supabase link --project-ref YOUR_PROJECT_REF${NC}"
    echo ""
    echo "Get your project ref from the Supabase dashboard URL:"
    echo "https://app.supabase.com/project/YOUR_PROJECT_REF"
    echo ""
    exit 1
fi

echo -e "${GREEN}✅ Project linked${NC}"
echo ""

# Apply migrations
echo -e "${YELLOW}Step 2: Apply Migrations${NC}"
echo ""
read -p "Apply migrations to remote database? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Pushing migrations to remote..."
    supabase db push
    echo ""
    echo -e "${GREEN}✅ Migrations applied successfully${NC}"
else
    echo -e "${YELLOW}⚠️  Skipped migrations${NC}"
fi

echo ""

# Run seed script
echo -e "${YELLOW}Step 3: Seed Test Users${NC}"
echo ""
read -p "Seed database with test users? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Seeding database..."
    supabase db seed
    echo ""
    echo -e "${GREEN}✅ Database seeded successfully${NC}"
    echo ""
    echo "Test users created:"
    echo "  • admin@preferredsolutions.test / Admin123!"
    echo "  • dispatcher@preferredsolutions.test / Dispatcher123!"
    echo "  • driver@preferredsolutions.test / Driver123!"
    echo "  • customer@preferredsolutions.test / Customer123!"
else
    echo -e "${YELLOW}⚠️  Skipped seeding${NC}"
fi

echo ""

# Generate TypeScript types
echo -e "${YELLOW}Step 4: Generate TypeScript Types${NC}"
echo ""
read -p "Generate TypeScript types from schema? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Generating types..."
    supabase gen types typescript --linked > lib/supabase/types.ts
    echo ""
    echo -e "${GREEN}✅ TypeScript types generated${NC}"
else
    echo -e "${YELLOW}⚠️  Skipped type generation${NC}"
fi

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║              Setup Complete!                           ║${NC}"
echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo ""
echo "Next steps:"
echo ""
echo "1. ${YELLOW}Create storage bucket in Supabase Dashboard:${NC}"
echo "   • Go to Storage → New bucket"
echo "   • Name: proof-of-delivery"
echo "   • Public: OFF (keep private)"
echo ""
echo "2. ${YELLOW}Configure Auth URLs in Supabase Dashboard:${NC}"
echo "   • Go to Authentication → URL Configuration"
echo "   • Add: http://localhost:3000/auth/callback"
echo "   • Add: https://*.vercel.app/auth/callback"
echo ""
echo "3. ${YELLOW}Test authentication:${NC}"
echo "   • npm run dev"
echo "   • Go to http://localhost:3000/auth/sign-in"
echo "   • Try logging in with test users"
echo ""
echo "📖 See SUPABASE_SETUP_INSTRUCTIONS.md for detailed guidance"
echo ""

