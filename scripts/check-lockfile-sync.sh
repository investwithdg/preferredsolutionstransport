#!/bin/bash
# Check if package.json is being committed
# If so, verify that package-lock.json is also staged and in sync

# Check if package.json is in the staged files
if git diff --cached --name-only | grep -q "^package\.json$"; then
  # Check if package-lock.json is also staged
  if ! git diff --cached --name-only | grep -q "^package-lock\.json$"; then
    echo "❌ Error: package.json is modified but package-lock.json is not staged."
    echo "   Run 'npm install' to update package-lock.json, then stage it."
    exit 1
  fi
  
  # Quick integrity check - ensure lock file references the package.json
  if ! grep -q '"name": "delivery-platform"' package-lock.json; then
    echo "❌ Error: package-lock.json appears to be out of sync."
    echo "   Run 'npm install' to regenerate it."
    exit 1
  fi
  
  echo "✅ package.json and package-lock.json are both staged."
fi

exit 0

