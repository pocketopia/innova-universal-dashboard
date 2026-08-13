#!/bin/bash

# Innova Ecosystem Platform - Build Validation Script
# This script validates the production readiness of the codebase

echo "=========================================="
echo "  INNOVA ECOSYSTEM BUILD VALIDATION"
echo "=========================================="
echo ""

ERRORS=0
WARNINGS=0

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    if [ "$1" = "error" ]; then
        echo -e "${RED}[ERROR]${NC} $2"
        ((ERRORS++))
    elif [ "$1" = "warning" ]; then
        echo -e "${YELLOW}[WARNING]${NC} $2"
        ((WARNINGS++))
    elif [ "$1" = "success" ]; then
        echo -e "${GREEN}[OK]${NC} $2"
    elif [ "$1" = "info" ]; then
        echo -e "${BLUE}[INFO]${NC} $2"
    fi
}

# 1. Check Node.js and npm versions
print_status "info" "Checking Node.js environment..."
NODE_VERSION=$(node --version 2>/dev/null || echo "not installed")
NPM_VERSION=$(npm --version 2>/dev/null || echo "not installed")

if [ "$NODE_VERSION" = "not installed" ]; then
    print_status "error" "Node.js is not installed"
else
    print_status "success" "Node.js: $NODE_VERSION"
fi

if [ "$NPM_VERSION" = "not installed" ]; then
    print_status "error" "npm is not installed"
else
    print_status "success" "npm: $NPM_VERSION"
fi

echo ""

# 2. Check for required dependencies
print_status "info" "Checking dependencies..."
if [ -f "package.json" ]; then
    print_status "success" "package.json found"
    
    # Check for critical dependencies
    for dep in "react" "react-dom" "lucide-react" "vite"; do
        if grep -q "\"$dep\"" package.json; then
            print_status "success" "Dependency: $dep"
        else
            print_status "warning" "Missing dependency: $dep"
        fi
    done
else
    print_status "error" "package.json not found"
fi

echo ""

# 3. Check for Lorem Ipsum or placeholder content
print_status "info" "Scanning for placeholder content..."
LOREM_COUNT=$(grep -ri "lorem ipsum" src/ 2>/dev/null | wc -l)
if [ "$LOREM_COUNT" -eq 0 ]; then
    print_status "success" "No Lorem Ipsum placeholder text found"
else
    print_status "error" "Found $LOREM_COUNT instances of Lorem Ipsum"
fi

# 4. Check for TODO/FIXME comments
print_status "info" "Checking for TODO/FIXME comments..."
TODO_COUNT=$(grep -ri "TODO\|FIXME" src/ 2>/dev/null | wc -l)
if [ "$TODO_COUNT" -eq 0 ]; then
    print_status "success" "No TODO/FIXME comments found"
else
    print_status "warning" "Found $TODO_COUNT TODO/FIXME comments"
fi

echo ""

# 5. Check TypeScript configuration
print_status "info" "Checking TypeScript configuration..."
if [ -f "tsconfig.json" ]; then
    print_status "success" "tsconfig.json found"
    
    # Check for strict mode
    if grep -q '"strict": true' tsconfig.json; then
        print_status "success" "TypeScript strict mode enabled"
    else
        print_status "warning" "TypeScript strict mode not enabled"
    fi
else
    print_status "error" "tsconfig.json not found"
fi

echo ""

# 6. Check Vite configuration
print_status "info" "Checking Vite configuration..."
if [ -f "vite.config.ts" ]; then
    print_status "success" "vite.config.ts found"
else
    print_status "error" "vite.config.ts not found"
fi

echo ""

# 7. Check for environment configuration
print_status "info" "Checking environment configuration..."
if [ -f ".env.local" ]; then
    print_status "success" ".env.local found (local development)"
fi
if [ -f ".env.example" ] || [ -f ".env.template" ]; then
    print_status "success" "Environment template found"
else
    print_status "warning" "No .env.example template found"
fi

echo ""

# 8. Check src directory structure
print_status "info" "Checking project structure..."
REQUIRED_DIRS="src/components src/lib src/pages src/context src/hooks"
for dir in $REQUIRED_DIRS; do
    if [ -d "$dir" ]; then
        print_status "success" "Directory exists: $dir"
    else
        print_status "error" "Missing directory: $dir"
    fi
done

echo ""

# 9. Check for new N2N messaging module
print_status "info" "Checking N2N Messaging implementation..."
if [ -f "src/lib/n2nMessaging.ts" ]; then
    print_status "success" "N2N Messaging module found"
else
    print_status "error" "N2N Messaging module missing"
fi

if [ -f "src/components/N2NMessagingHub.tsx" ]; then
    print_status "success" "N2N Messaging UI component found"
else
    print_status "warning" "N2N Messaging UI component missing"
fi

echo ""

# 10. Check for Retention & Rewards module
print_status "info" "Checking Retention & Rewards implementation..."
if [ -f "src/lib/retentionRewards.ts" ]; then
    print_status "success" "Retention & Rewards module found"
else
    print_status "error" "Retention & Rewards module missing"
fi

echo ""

# 11. Check TV build configurations
print_status "info" "Checking TV platform builds..."
TV_PLATFORMS="webos tizen roku firetv"
for platform in $TV_PLATFORMS; do
    if [ -d "tv-builds/$platform" ]; then
        print_status "success" "TV build config: $platform"
    else
        print_status "warning" "Missing TV build config: $platform"
    fi
done

echo ""

# 12. Check for security utilities
print_status "info" "Checking security implementation..."
if [ -f "src/lib/securityUtils.ts" ]; then
    print_status "success" "Security utilities found"
    
    # Check for encryption functions
    if grep -q "encryptSensitiveData" src/lib/securityUtils.ts; then
        print_status "success" "Encryption functions implemented"
    fi
    if grep -q "secureStorage" src/lib/securityUtils.ts; then
        print_status "success" "Secure storage implemented"
    fi
else
    print_status "error" "Security utilities missing"
fi

echo ""

# 13. Check asset directories
print_status "info" "Checking asset directories..."
if [ -d "assets" ]; then
    print_status "success" "Assets directory found"
    
    # Count asset files
    ASSET_COUNT=$(find assets -type f 2>/dev/null | wc -l)
    print_status "success" "Found $ASSET_COUNT asset files"
else
    print_status "warning" "Assets directory not found"
fi

echo ""

# 14. Run TypeScript type check
print_status "info" "Running TypeScript type check..."
if npm run type-check 2>/dev/null; then
    print_status "success" "TypeScript type check passed"
else
    print_status "warning" "TypeScript type check failed or not configured"
fi

echo ""

# 15. Check git status
print_status "info" "Checking git status..."
if git rev-parse --git-dir > /dev/null 2>&1; then
    print_status "success" "Git repository initialized"
    
    # Check for uncommitted changes
    UNCOMMITTED=$(git status --porcelain 2>/dev/null | wc -l)
    if [ "$UNCOMMITTED" -eq 0 ]; then
        print_status "success" "No uncommitted changes"
    else
        print_status "warning" "$UNCOMMITTED uncommitted changes detected"
    fi
else
    print_status "warning" "Not a git repository"
fi

echo ""
echo "=========================================="
echo "  VALIDATION SUMMARY"
echo "=========================================="
echo ""

if [ "$ERRORS" -eq 0 ] && [ "$WARNINGS" -eq 0 ]; then
    print_status "success" "All checks passed! Build is production-ready."
    echo ""
    echo "The Innova Ecosystem Platform is ready for deployment."
    exit 0
elif [ "$ERRORS" -eq 0 ]; then
    print_status "warning" "Build validation completed with $WARNINGS warning(s)"
    echo ""
    echo "The build can proceed, but review the warnings above."
    exit 0
else
    print_status "error" "Build validation failed with $ERRORS error(s) and $WARNINGS warning(s)"
    echo ""
    echo "Please resolve the errors before proceeding with the build."
    exit 1
fi