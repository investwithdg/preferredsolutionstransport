#!/usr/bin/env node

/**
 * HubSpot Property Validation Script
 * 
 * This script fetches all properties from your HubSpot account and validates
 * that the custom properties configured in your environment variables exist
 * and are properly configured.
 * 
 * Usage:
 *   node scripts/validate-hubspot-properties.js
 * 
 * Requirements:
 *   - HUBSPOT_PRIVATE_APP_TOKEN environment variable must be set
 */

const { Client } = require('@hubspot/api-client');
require('dotenv').config({ path: '.env.local' });

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logHeader(message) {
  console.log('');
  log('='.repeat(60), colors.cyan);
  log(message, colors.bright);
  log('='.repeat(60), colors.cyan);
  console.log('');
}

function logSuccess(message) {
  log(`✓ ${message}`, colors.green);
}

function logWarning(message) {
  log(`⚠ ${message}`, colors.yellow);
}

function logError(message) {
  log(`✗ ${message}`, colors.red);
}

function logInfo(message) {
  log(`ℹ ${message}`, colors.blue);
}

// Expected custom properties from environment
const expectedContactProps = [];

const expectedDealProps = [
  process.env.HUBSPOT_PROP_ORDER_ID || 'order_id',
  process.env.HUBSPOT_PROP_PICKUP_ADDRESS || 'pickup_address',
  process.env.HUBSPOT_PROP_DROPOFF_ADDRESS || 'dropoff_address',
  process.env.HUBSPOT_PROP_DISTANCE_MILES || 'distance_miles',
  process.env.HUBSPOT_PROP_PIPELINE_FLOW || 'pipeline_flow',
  process.env.HUBSPOT_PROP_DRIVER_NAME || 'driver_name',
  process.env.HUBSPOT_PROP_DRIVER_PHONE || 'driver_phone',
];

async function fetchProperties(hubspotClient, objectType) {
  try {
    const response = await hubspotClient.crm.properties.coreApi.getAll(objectType);
    return response.results;
  } catch (error) {
    logError(`Failed to fetch ${objectType} properties: ${error.message}`);
    throw error;
  }
}

function validateProperties(properties, expectedProps, objectType) {
  const propertyMap = new Map(properties.map(p => [p.name, p]));
  const results = {
    found: [],
    missing: [],
    warnings: [],
  };

  for (const propName of expectedProps) {
    const prop = propertyMap.get(propName);
    
    if (!prop) {
      results.missing.push(propName);
    } else {
      results.found.push({
        name: prop.name,
        label: prop.label,
        type: prop.type,
        required: prop.required || false,
      });
      
      // Check for potential issues
      if (prop.hidden) {
        results.warnings.push(`Property '${propName}' is hidden`);
      }
      if (prop.modificationMetadata?.readOnlyValue) {
        results.warnings.push(`Property '${propName}' is read-only`);
      }
    }
  }

  return results;
}

function displayResults(objectType, results) {
  logHeader(`${objectType} Properties Validation`);

  if (results.found.length > 0) {
    logSuccess(`Found ${results.found.length} configured properties:`);
    console.log('');
    results.found.forEach(prop => {
      console.log(`  ${colors.green}${prop.name}${colors.reset}`);
      console.log(`    Label: ${prop.label}`);
      console.log(`    Type: ${prop.type}`);
      console.log(`    Required: ${prop.required ? 'Yes' : 'No'}`);
      console.log('');
    });
  }

  if (results.missing.length > 0) {
    logError(`Missing ${results.missing.length} properties:`);
    console.log('');
    results.missing.forEach(propName => {
      console.log(`  ${colors.red}${propName}${colors.reset}`);
    });
    console.log('');
    
    logInfo('To create these properties in HubSpot:');
    console.log('  1. Go to Settings > Properties');
    console.log(`  2. Select "${objectType}"`);
    console.log('  3. Click "Create property"');
    console.log('  4. Configure each missing property with appropriate type');
    console.log('');
  }

  if (results.warnings.length > 0) {
    logWarning(`Found ${results.warnings.length} warnings:`);
    console.log('');
    results.warnings.forEach(warning => {
      console.log(`  ${colors.yellow}${warning}${colors.reset}`);
    });
    console.log('');
  }

  return results.missing.length === 0;
}

async function validatePipeline(hubspotClient) {
  logHeader('Pipeline Configuration Validation');

  const pipelineId = process.env.HUBSPOT_PIPELINE_ID || 'default';
  
  try {
    const pipelines = await hubspotClient.crm.pipelines.pipelinesApi.getAll('deals');
    const pipeline = pipelines.results.find(p => p.id === pipelineId || p.label === pipelineId);

    if (!pipeline) {
      logError(`Pipeline '${pipelineId}' not found`);
      logInfo('Available pipelines:');
      pipelines.results.forEach(p => {
        console.log(`  - ${p.label} (ID: ${p.id})`);
      });
      return false;
    }

    logSuccess(`Found pipeline: ${pipeline.label} (ID: ${pipeline.id})`);
    console.log('');

    // Validate stages
    const expectedStages = {
      'Ready for Dispatch': process.env.HUBSPOT_STAGE_READY || 'appointmentscheduled',
      'Assigned': process.env.HUBSPOT_STAGE_ASSIGNED || 'qualifiedtobuy',
      'Picked Up': process.env.HUBSPOT_STAGE_PICKED_UP || 'presentationscheduled',
      'Delivered': process.env.HUBSPOT_STAGE_DELIVERED || 'closedwon',
      'Canceled': process.env.HUBSPOT_STAGE_CANCELED || 'closedlost',
    };

    logInfo('Configured deal stages:');
    console.log('');

    const stageMap = new Map(pipeline.stages.map(s => [s.id, s]));
    let allStagesFound = true;

    for (const [label, stageId] of Object.entries(expectedStages)) {
      const stage = stageMap.get(stageId);
      if (stage) {
        logSuccess(`${label}: ${stage.label} (${stageId})`);
      } else {
        logError(`${label}: Stage '${stageId}' not found`);
        allStagesFound = false;
      }
    }

    console.log('');

    if (!allStagesFound) {
      logInfo('Available stages in this pipeline:');
      pipeline.stages.forEach(s => {
        console.log(`  - ${s.label} (ID: ${s.id})`);
      });
      console.log('');
    }

    return allStagesFound;
  } catch (error) {
    logError(`Failed to validate pipeline: ${error.message}`);
    return false;
  }
}

function displayCacheConfig() {
  logHeader('Cache Configuration');

  const cacheTTL = process.env.HUBSPOT_SCHEMA_CACHE_TTL || '3600';
  const cacheEnabled = process.env.HUBSPOT_SCHEMA_CACHE_ENABLED !== 'false';

  logInfo(`Cache Enabled: ${cacheEnabled ? 'Yes' : 'No'}`);
  logInfo(`Cache TTL: ${cacheTTL} seconds (${Math.floor(parseInt(cacheTTL) / 60)} minutes)`);
  console.log('');
}

async function main() {
  log('HubSpot Property Validation Tool', colors.bright);
  console.log('');

  // Check for HubSpot token
  if (!process.env.HUBSPOT_PRIVATE_APP_TOKEN) {
    logError('HUBSPOT_PRIVATE_APP_TOKEN not found in environment variables');
    logInfo('Please set HUBSPOT_PRIVATE_APP_TOKEN in your .env.local file');
    process.exit(1);
  }

  logSuccess('Found HubSpot API token');
  console.log('');

  // Initialize HubSpot client
  const hubspotClient = new Client({
    accessToken: process.env.HUBSPOT_PRIVATE_APP_TOKEN,
  });

  let allValid = true;

  try {
    // Validate contact properties (currently we don't use custom contact properties)
    // const contactProps = await fetchProperties(hubspotClient, 'contacts');
    // const contactResults = validateProperties(contactProps, expectedContactProps, 'Contact');
    // const contactsValid = displayResults('Contact', contactResults);
    // allValid = allValid && contactsValid;

    // Validate deal properties
    const dealProps = await fetchProperties(hubspotClient, 'deals');
    const dealResults = validateProperties(dealProps, expectedDealProps, 'Deal');
    const dealsValid = displayResults('Deal', dealResults);
    allValid = allValid && dealsValid;

    // Validate pipeline configuration
    const pipelineValid = await validatePipeline(hubspotClient);
    allValid = allValid && pipelineValid;

    // Display cache configuration
    displayCacheConfig();

    // Final summary
    logHeader('Validation Summary');

    if (allValid) {
      logSuccess('All validations passed! Your HubSpot configuration is correct.');
      console.log('');
      logInfo('Your application can now sync data to HubSpot with all configured properties.');
    } else {
      logWarning('Some validations failed. Please review the errors above.');
      console.log('');
      logInfo('The application will still work, but some properties may not be synced.');
    }

    console.log('');
    process.exit(allValid ? 0 : 1);
  } catch (error) {
    logError(`Validation failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Run the script
main();

