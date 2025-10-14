/**
 * HubSpot Property Schema Management
 * Fetches, caches, and manages HubSpot property definitions
 */

import { Client } from '@hubspot/api-client';
import type {
  HubSpotPropertyDefinition,
  PropertySchemaCache,
} from './types';

// In-memory cache for property schemas
const schemaCache: {
  contacts?: PropertySchemaCache;
  deals?: PropertySchemaCache;
} = {};

// Default cache TTL (1 hour)
const DEFAULT_CACHE_TTL = parseInt(
  process.env.HUBSPOT_SCHEMA_CACHE_TTL || '3600',
  10
) * 1000;

// Cache enabled by default
const CACHE_ENABLED = process.env.HUBSPOT_SCHEMA_CACHE_ENABLED !== 'false';

/**
 * Check if cache is valid and not expired
 */
function isCacheValid(cache?: PropertySchemaCache): boolean {
  if (!CACHE_ENABLED || !cache) {
    return false;
  }
  return Date.now() < cache.expiresAt;
}

/**
 * Fetch contact properties from HubSpot API
 */
export async function fetchContactProperties(
  hubspotClient: Client
): Promise<HubSpotPropertyDefinition[]> {
  try {
    console.log('Fetching contact properties from HubSpot API...');
    
    const response = await hubspotClient.crm.properties.coreApi.getAll('contacts');
    
    const properties: HubSpotPropertyDefinition[] = response.results.map((prop: any) => ({
      name: prop.name,
      label: prop.label,
      type: prop.type,
      fieldType: prop.fieldType,
      description: prop.description,
      groupName: prop.groupName,
      options: prop.options?.map((opt: any) => ({
        label: opt.label,
        value: opt.value,
        description: opt.description,
        displayOrder: opt.displayOrder,
        hidden: opt.hidden,
      })),
      createdAt: prop.createdAt,
      updatedAt: prop.updatedAt,
      hidden: prop.hidden,
      modificationMetadata: prop.modificationMetadata,
      formField: prop.formField,
      displayOrder: prop.displayOrder,
      required: prop.required,
      calculated: prop.calculated,
      externalOptions: prop.externalOptions,
      hasUniqueValue: prop.hasUniqueValue,
    }));

    console.log(`Fetched ${properties.length} contact properties`);
    return properties;
  } catch (error) {
    console.error('Failed to fetch contact properties:', error);
    throw new Error('Failed to fetch contact properties from HubSpot');
  }
}

/**
 * Fetch deal properties from HubSpot API
 */
export async function fetchDealProperties(
  hubspotClient: Client
): Promise<HubSpotPropertyDefinition[]> {
  try {
    console.log('Fetching deal properties from HubSpot API...');
    
    const response = await hubspotClient.crm.properties.coreApi.getAll('deals');
    
    const properties: HubSpotPropertyDefinition[] = response.results.map((prop: any) => ({
      name: prop.name,
      label: prop.label,
      type: prop.type,
      fieldType: prop.fieldType,
      description: prop.description,
      groupName: prop.groupName,
      options: prop.options?.map((opt: any) => ({
        label: opt.label,
        value: opt.value,
        description: opt.description,
        displayOrder: opt.displayOrder,
        hidden: opt.hidden,
      })),
      createdAt: prop.createdAt,
      updatedAt: prop.updatedAt,
      hidden: prop.hidden,
      modificationMetadata: prop.modificationMetadata,
      formField: prop.formField,
      displayOrder: prop.displayOrder,
      required: prop.required,
      calculated: prop.calculated,
      externalOptions: prop.externalOptions,
      hasUniqueValue: prop.hasUniqueValue,
      showCurrencySymbol: prop.showCurrencySymbol,
    }));

    console.log(`Fetched ${properties.length} deal properties`);
    return properties;
  } catch (error) {
    console.error('Failed to fetch deal properties:', error);
    throw new Error('Failed to fetch deal properties from HubSpot');
  }
}

/**
 * Get cached contact properties or fetch if expired
 */
export async function getCachedContactProperties(
  hubspotClient: Client
): Promise<HubSpotPropertyDefinition[]> {
  // Return cached data if valid
  if (isCacheValid(schemaCache.contacts)) {
    console.log('Using cached contact properties');
    return schemaCache.contacts!.properties;
  }

  // Fetch fresh data
  try {
    const properties = await fetchContactProperties(hubspotClient);
    
    // Update cache
    schemaCache.contacts = {
      properties,
      timestamp: Date.now(),
      expiresAt: Date.now() + DEFAULT_CACHE_TTL,
    };
    
    return properties;
  } catch (error) {
    // If fetch fails, return stale cache if available
    if (schemaCache.contacts?.properties) {
      console.warn('Using stale contact property cache due to fetch error');
      return schemaCache.contacts.properties;
    }
    throw error;
  }
}

/**
 * Get cached deal properties or fetch if expired
 */
export async function getCachedDealProperties(
  hubspotClient: Client
): Promise<HubSpotPropertyDefinition[]> {
  // Return cached data if valid
  if (isCacheValid(schemaCache.deals)) {
    console.log('Using cached deal properties');
    return schemaCache.deals!.properties;
  }

  // Fetch fresh data
  try {
    const properties = await fetchDealProperties(hubspotClient);
    
    // Update cache
    schemaCache.deals = {
      properties,
      timestamp: Date.now(),
      expiresAt: Date.now() + DEFAULT_CACHE_TTL,
    };
    
    return properties;
  } catch (error) {
    // If fetch fails, return stale cache if available
    if (schemaCache.deals?.properties) {
      console.warn('Using stale deal property cache due to fetch error');
      return schemaCache.deals.properties;
    }
    throw error;
  }
}

/**
 * Get a specific property definition by name
 */
export function getPropertyDefinition(
  properties: HubSpotPropertyDefinition[],
  propertyName: string
): HubSpotPropertyDefinition | undefined {
  return properties.find(prop => prop.name === propertyName);
}

/**
 * Check if a property exists
 */
export function propertyExists(
  properties: HubSpotPropertyDefinition[],
  propertyName: string
): boolean {
  return properties.some(prop => prop.name === propertyName);
}

/**
 * Get all custom properties (non-HubSpot default)
 */
export function getCustomProperties(
  properties: HubSpotPropertyDefinition[]
): HubSpotPropertyDefinition[] {
  // HubSpot custom properties typically have a specific naming pattern
  // or are marked in their metadata
  return properties.filter(prop => 
    !prop.modificationMetadata?.readOnlyDefinition
  );
}

/**
 * Invalidate cache for a specific object type
 */
export function invalidateCache(objectType: 'contacts' | 'deals'): void {
  if (objectType === 'contacts') {
    schemaCache.contacts = undefined;
  } else if (objectType === 'deals') {
    schemaCache.deals = undefined;
  }
  console.log(`Invalidated ${objectType} schema cache`);
}

/**
 * Invalidate all caches
 */
export function invalidateAllCaches(): void {
  schemaCache.contacts = undefined;
  schemaCache.deals = undefined;
  console.log('Invalidated all schema caches');
}

/**
 * Get cache status for monitoring
 */
export function getCacheStatus() {
  return {
    contacts: {
      cached: !!schemaCache.contacts,
      valid: isCacheValid(schemaCache.contacts),
      timestamp: schemaCache.contacts?.timestamp,
      expiresAt: schemaCache.contacts?.expiresAt,
      propertyCount: schemaCache.contacts?.properties.length,
    },
    deals: {
      cached: !!schemaCache.deals,
      valid: isCacheValid(schemaCache.deals),
      timestamp: schemaCache.deals?.timestamp,
      expiresAt: schemaCache.deals?.expiresAt,
      propertyCount: schemaCache.deals?.properties.length,
    },
    cacheEnabled: CACHE_ENABLED,
    cacheTTL: DEFAULT_CACHE_TTL,
  };
}

