# Deployment Validation Setup

This project has multiple layers of validation to prevent build failures on Vercel.

## Overview

The validation pipeline catches errors at three stages:

1. **Pre-commit** - Fast checks on staged files before committing
2. **Pre-push** - Full validation before pushing to remote
3. **CI/CD** - Automated checks on GitHub Actions before deployment

## Local Development

### Pre-commit Hooks (Husky + lint-staged)

When you commit code, the following checks run automatically on staged files:

- ESLint with auto-fix
- TypeScript type checking (fast mode)
- Prettier formatting

If any check fails, the commit is blocked until you fix the issues.

**To skip hooks temporarily (not recommended):**

```bash
git commit --no-verify
```

### Pre-push Hooks

Before pushing to remote, these checks run on the entire codebase:

- Full TypeScript type checking (`npm run typecheck`)
- Full ESLint linting (`npm run lint`)

This ensures no broken code reaches the remote repository.

### Manual Validation

Run these commands manually anytime:

```bash
# Type check only
npm run typecheck

# Lint only
npm run lint

# Both typecheck + lint
npm run validate

# Full build (includes prebuild validation)
npm run build
```

## Continuous Integration (GitHub Actions)

The `.github/workflows/ci.yml` workflow runs on every push and pull request to `main` or `develop` branches.

It performs three parallel jobs:

1. **Lint** - ESLint checks
2. **Type Check** - TypeScript compilation
3. **Build** - Full Next.js production build

All jobs must pass before code can be merged.

## Vercel Deployment

The `vercel.json` configuration includes:

- Custom build command with telemetry disabled for faster builds
- `npm ci` for clean, reproducible installs
- Prebuild script that runs validation before building

## ESLint Rules

Current ESLint configuration (`.eslintrc.json`):

- Extends Next.js core web vitals
- Warns on console statements (except console.warn/error)
- Enforces `prefer-const` for immutable variables
- **Special rule for API routes**: Prevents `"use server"` directive in `app/api/**` files

## Prettier Configuration

Code formatting is enforced via Prettier (`.prettierrc`):

- Single quotes
- Semicolons
- 2-space indentation
- 100 character line width
- Trailing commas (ES5)

## Common Issues and Solutions

### Issue: Build fails on Vercel but works locally

**Solution:** Always run `npm run build` locally before pushing. The prebuild script now runs automatically.

### Issue: Commit hook is slow

**Solution:** The pre-commit hook only checks staged files. If it's still slow, you can:

- Stage fewer files at a time
- Fix TypeScript errors that slow down type checking

### Issue: Can't push because of lint warnings

**Solution:** Fix the warnings or adjust the ESLint rules if they're too strict. Console statements should use `console.warn()` or `console.error()` instead of `console.log()`.

### Issue: TypeScript errors in tests

**Solution:** Run `npm run typecheck` to see all errors. Fix them or add `// @ts-expect-error` with a comment explaining why.

## Disabling Checks (Emergency Only)

If you absolutely need to bypass checks:

```bash
# Skip pre-commit hook
git commit --no-verify

# Skip pre-push hook
git push --no-verify

# Skip GitHub Actions (requires admin)
# Add [skip ci] to commit message
```

**Warning:** Bypassing checks may cause Vercel deployment failures!

## Benefits

✅ **Catch errors early** - Before they reach Vercel
✅ **Faster feedback** - Seconds locally vs. minutes on Vercel  
✅ **Save build minutes** - Reduce failed deployments
✅ **Better code quality** - Consistent formatting and type safety
✅ **Team confidence** - CI prevents broken code from merging

## Maintenance

### Updating Dependencies

When updating Next.js or ESLint:

```bash
npm update
npm run validate
npm run build
```

### Adding New Lint Rules

Edit `.eslintrc.json` and test:

```bash
npm run lint
```

### Modifying Hooks

Husky hooks are in `.husky/` directory:

- `.husky/pre-commit` - Runs lint-staged
- `.husky/pre-push` - Runs typecheck + lint

## Troubleshooting

### Husky hooks not running

```bash
npm run prepare
```

### Lint-staged not found

```bash
npm install
```

### CI failing but local passes

Check that you're using the same Node version as CI (Node 20).

## Performance Optimizations

### Parallel Validation ⚡

Typecheck and lint now run **in parallel** instead of sequentially:

- **Before:** ~18 seconds (sequential)
- **After:** ~3 seconds (parallel)
- **Improvement:** 6x faster validation

### Reduced Lint Warnings 🎯

Added `.eslintignore` to skip utility files:

- **Before:** 192 warnings (noisy output)
- **After:** 107 warnings (cleaner, relevant warnings only)
- **Improvement:** 44% fewer warnings

### Bundle Size Tracking 📦

Monitor your bundle sizes to prevent bloat:

- Run `npm run analyze` to see interactive bundle report
- GitHub Actions automatically checks bundle size on PRs
- See `BUNDLE_ANALYSIS.md` for detailed guide

## Questions?

Check these files for configuration:

- `.github/workflows/ci.yml` - GitHub Actions config
- `.github/workflows/bundle-size.yml` - Bundle size tracking
- `.husky/` - Git hooks
- `.eslintrc.json` - Linting rules
- `.eslintignore` - Files excluded from linting
- `.prettierrc` - Formatting rules
- `package.json` - Scripts and lint-staged config
- `vercel.json` - Vercel build settings
- `BUNDLE_ANALYSIS.md` - Bundle size optimization guide
