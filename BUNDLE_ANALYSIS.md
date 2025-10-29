# Bundle Size Analysis Guide

## Quick Start

Run bundle analysis locally:

```bash
npm run analyze
```

This will:

1. Build your Next.js application
2. Generate interactive bundle visualization
3. Open the report in your browser (typically at `http://localhost:8888`)

## What to Look For

### 🟢 Good Signs

- Most bundles under 200KB (gzipped)
- Shared chunks for common dependencies
- Code splitting working properly
- Lazy loading for large components

### 🔴 Warning Signs

- Individual route bundles > 500KB
- Duplicate dependencies across chunks
- Large third-party libraries not tree-shaken
- All code in single main bundle

## Common Issues & Solutions

### Issue: Large Bundle Size

**Causes:**

- Importing entire libraries instead of specific functions
- Not using dynamic imports for heavy components
- Including dev dependencies in production

**Solutions:**

```typescript
// ❌ Bad: Imports entire lodash
import _ from 'lodash';

// ✅ Good: Import specific function
import debounce from 'lodash/debounce';

// ✅ Better: Use dynamic import for heavy components
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <Skeleton />
});
```

### Issue: Duplicate Dependencies

**Causes:**

- Multiple versions of the same package
- Transitive dependencies

**Solutions:**

```bash
# Check for duplicates
npm ls <package-name>

# Use npm overrides in package.json
{
  "overrides": {
    "problematic-package": "^2.0.0"
  }
}
```

### Issue: Unused Code

**Causes:**

- Dead code not removed by tree-shaking
- Side effects preventing optimization

**Solutions:**

- Use `npm run tsprune` to find unused exports
- Add `"sideEffects": false` in package.json for tree-shakeable packages
- Review and remove unused imports

## Bundle Size Targets

### Recommended Sizes (gzipped)

| Asset Type    | Target  | Max   |
| ------------- | ------- | ----- |
| First Load JS | < 100KB | 200KB |
| Route Bundles | < 50KB  | 150KB |
| Shared Chunks | < 200KB | 500KB |

## Monitoring in CI

Bundle size is automatically checked on every PR via GitHub Actions.

View the report:

1. Go to your PR
2. Click "Actions" tab
3. Select "Bundle Size Check"
4. View the summary

## Advanced Analysis

### Compare Bundle Sizes

```bash
# Build current branch
npm run build
mv .next/analyze .next/analyze-current

# Switch to main branch
git checkout main
npm run build
mv .next/analyze .next/analyze-main

# Compare the two
# Open both reports and compare sizes
```

### Analyze Specific Routes

The bundle analyzer shows per-route breakdowns. Look for:

- Which pages are loading heavy dependencies
- Shared chunks between routes
- Opportunity for code splitting

### Using Source Maps

Enable source maps for detailed analysis:

```javascript
// next.config.js
module.exports = {
  productionBrowserSourceMaps: true, // Add this
};
```

⚠️ **Note:** Don't commit this - only use locally for debugging

## Optimization Checklist

- [ ] Run `npm run analyze` before major releases
- [ ] Keep first load JS under 200KB
- [ ] Use dynamic imports for routes > 100KB
- [ ] Implement lazy loading for images
- [ ] Enable Next.js image optimization
- [ ] Use font optimization
- [ ] Minimize third-party scripts
- [ ] Review bundle on every major dependency update

## Tools

### Locally

- `npm run analyze` - Interactive bundle visualization
- `npm run build` - Check bundle sizes in terminal output

### CI/CD

- GitHub Actions automatically checks bundle sizes on PRs
- Vercel Analytics provides real-world performance metrics

## Further Reading

- [Next.js Bundle Analyzer](https://github.com/vercel/next.js/tree/canary/packages/next-bundle-analyzer)
- [Webpack Bundle Analyzer](https://github.com/webpack-contrib/webpack-bundle-analyzer)
- [Next.js Performance Optimization](https://nextjs.org/docs/app/building-your-application/optimizing)
- [Web.dev Bundle Size Guide](https://web.dev/reduce-javascript-payloads-with-code-splitting/)
