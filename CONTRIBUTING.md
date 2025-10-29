# Contributing to Delivery Platform

Thank you for contributing! This guide will help you understand our development workflow and best practices.

## Development Setup

### Prerequisites

- **Node.js**: v20.0.0 or higher (we recommend v22.21.0)
- **npm**: v10.0.0 or higher

We recommend using [nvm](https://github.com/nvm-sh/nvm) to manage Node versions:

```bash
# Install the project's Node version
nvm use

# If you don't have this version, install it
nvm install
```

### Initial Setup

```bash
# Clone the repository
git clone <repository-url>
cd preferredsolutionstransport

# Install dependencies
npm install

# Set up environment variables
cp env.example .env.local
# Edit .env.local with your configuration
```

## Dependency Management

### Adding New Dependencies

When adding new packages, always update both `package.json` and `package-lock.json`:

```bash
# Add a production dependency
npm install <package-name>

# Add a dev dependency
npm install --save-dev <package-name>
```

**Important**: Always commit both `package.json` and `package-lock.json` together. Our pre-commit hooks will prevent you from committing one without the other.

### Updating Dependencies

```bash
# Update a specific package
npm install <package-name>@latest

# Update all packages (be careful with this)
npm update
```

After updating dependencies, test thoroughly before committing.

### After Pulling Changes

Our post-merge hook automatically runs `npm install` when dependency files change, but you can also run it manually:

```bash
# If dependencies are out of sync
npm install
```

### Resolving Lock File Conflicts

Lock file conflicts are common when multiple developers update dependencies. Here's how to resolve them:

1. **Never manually edit `package-lock.json`**
2. **Always resolve conflicts using npm:**

```bash
# 1. Accept the incoming package.json changes
git checkout --theirs package.json

# 2. Accept your local package-lock.json (or theirs, depending on your preference)
git checkout --ours package-lock.json

# 3. Regenerate the lock file
npm install

# 4. Verify everything works
npm ci

# 5. Stage and commit the resolved files
git add package.json package-lock.json
git commit -m "chore: resolve dependency conflicts"
```

### Verifying Lock File Integrity

If you suspect your lock file is out of sync:

```bash
# Remove node_modules and reinstall from scratch
rm -rf node_modules
npm ci

# This will fail if the lock file is out of sync
# If it fails, regenerate the lock file:
npm install
```

## Git Workflow

### Pre-commit Checks

Before each commit, the following checks run automatically:

1. **Lock file validation**: Ensures `package.json` and `package-lock.json` are in sync
2. **TypeScript type checking**: Validates all TypeScript files
3. **Linting**: Checks code style with ESLint
4. **Formatting**: Runs Prettier on staged files

If any check fails, the commit will be blocked. Fix the issues and try again.

### Commit Messages

Follow conventional commit format:

```
type(scope): subject

Examples:
- feat(orders): add proof of delivery upload
- fix(auth): resolve token refresh issue
- chore(deps): update dependencies
- docs(readme): improve setup instructions
```

### Post-merge Actions

After pulling or merging changes, Git hooks automatically:

1. Check if `package.json` or `package-lock.json` changed
2. Run `npm install` if dependencies changed
3. Display a success message

## Troubleshooting

### "package.json and package-lock.json are out of sync"

This error occurs when trying to commit `package.json` changes without updating the lock file.

**Solution:**

```bash
npm install
git add package-lock.json
git commit
```

### "npm ci failed" in CI/CD

This means the lock file doesn't match `package.json` on the remote.

**Solution:**

```bash
# Regenerate the lock file
npm install

# Verify it works
npm ci

# Commit and push
git add package-lock.json
git commit -m "chore: regenerate package-lock.json"
git push
```

### Different lock file on different machines

This usually happens due to different Node or npm versions.

**Solution:**

```bash
# Check your versions
node --version  # Should be >= 20.0.0
npm --version   # Should be >= 10.0.0

# Use nvm to install the correct version
nvm use

# Regenerate lock file with correct version
rm -rf node_modules package-lock.json
npm install
```

### Cannot install due to engine-strict

If you see "Unsupported engine" errors:

**Solution:**

```bash
# Update Node to the required version
nvm install 22.21.0
nvm use 22.21.0

# Try installing again
npm install
```

## Scripts

Common development scripts:

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Run type checking
npm run typecheck

# Run linter
npm run lint

# Run all validations (type check + lint)
npm run validate

# Analyze bundle size
npm run analyze
```

## Testing

```bash
# Run API tests
npm run test:api

# Run demo mode tests
npm run test:demo

# Smoke tests
npm run smoke
```

## Code Style

- Use TypeScript for all new files
- Follow the existing code structure
- Use Prettier for formatting (runs automatically on commit)
- Follow ESLint rules (checked on commit)

## Questions?

If you run into issues not covered here, please:

1. Check existing GitHub issues
2. Ask in the team chat
3. Create a new issue with details about the problem

Thank you for contributing! 🚀
