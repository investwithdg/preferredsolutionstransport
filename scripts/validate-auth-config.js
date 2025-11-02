#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * Quick sanity-check for authentication environment variables.
 * Run with:  npm run validate:auth   (see package.json)
 */

const requiredInProd = ['NEXT_PUBLIC_SITE_URL'];
const vercelUrl = process.env.VERCEL_URL;
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

function fail(msg) {
  console.error(`\u274c  ${msg}`); // red X symbol
  process.exitCode = 1;
}

if (process.env.NODE_ENV === 'production') {
  requiredInProd.forEach((key) => {
    if (!process.env[key]) {
      fail(`Missing required env var ${key}`);
    }
  });
}

// Validate formats
if (siteUrl && !/^https?:\/\//.test(siteUrl)) {
  fail('NEXT_PUBLIC_SITE_URL must include protocol, e.g. https://example.com');
}

if (vercelUrl && /https?:\/\//.test(vercelUrl)) {
  fail('VERCEL_URL provided by Vercel should NOT include protocol');
}

if (process.exitCode !== 1) {
  console.log('\u2705  Auth environment looks good!');
}
