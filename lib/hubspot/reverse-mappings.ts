/**
 * Reverse Property Mappings
 * Maps HubSpot property names back to Supabase column names
 */


/**
 * Reverse mapping entry
 */
export interface ReverseMappingEntry {
  supabaseTable: 'orders' | 'customers' | 'quotes';
  supabaseColumn: string;
  transformer?: (value: any) => any;
  condition?: (value: any) => boolean;
}

/**
 * Build reverse mappings from deal properties to Supabase columns
 */
function buildReverseDealMappings(): Record<string, ReverseMappingEntry[]> {
  const reverseMap: Record<string, ReverseMappingEntry[]> = {};

  // Standard HubSpot deal properties -> orders table
  reverseMap['dealname'] = [{ supabaseTable: 'orders', supabaseColumn: 'id', transformer: (value: string) => {
    // Deal name format: "Delivery Order #ORDER_ID"
    const match = value.match(/#([a-f0-9-]+)/);
    return match ? match[1] : value;
  }}];

  reverseMap['amount'] = [{ 
    supabaseTable: 'orders', 
    supabaseColumn: 'price_total',
    transformer: (value: string | number) => {
      return typeof value === 'string' ? parseFloat(value) : value;
    }
  }];

  // Note: dealstage and pipeline are read-only from HubSpot perspective
  // They don't map back to orders.status directly to avoid conflicts with operational status

  // Custom properties from environment variables
  const envMappings: Record<string, string> = {
    'HUBSPOT_PROP_ORDER_ID': 'id',
    'HUBSPOT_PROP_PICKUP_ADDRESS': 'pickup_address',
    'HUBSPOT_PROP_DROPOFF_ADDRESS': 'dropoff_address',
    'HUBSPOT_PROP_DISTANCE_MILES': 'distance_mi',
  };

  Object.entries(envMappings).forEach(([envKey, supabaseCol]) => {
    const hubspotProp = process.env[envKey];
    if (hubspotProp) {
      const table = ['pickup_address', 'dropoff_address', 'distance_mi'].includes(supabaseCol) 
        ? 'quotes' 
        : 'orders';
      
      reverseMap[hubspotProp] = [{
        supabaseTable: table as 'orders' | 'quotes',
        supabaseColumn: supabaseCol,
        transformer: supabaseCol === 'distance_mi' 
          ? (value: any) => typeof value === 'string' ? parseFloat(value) : value
          : undefined,
      }];
    }
  });

  // Driver properties
  const driverNameProp = process.env.HUBSPOT_PROP_DRIVER_NAME || process.env.HUBSPOT_PROP_ASSIGNED_DRIVER;
  if (driverNameProp) {
    // Note: driver_name in HubSpot is informational only
    // Actual driver assignment is handled by driver_id in orders table
    // We don't sync this back to prevent conflicts
  }

  return reverseMap;
}

/**
 * Build reverse mappings from contact properties to Supabase columns
 */
function buildReverseContactMappings(): Record<string, ReverseMappingEntry[]> {
  const reverseMap: Record<string, ReverseMappingEntry[]> = {};

  // Standard contact properties -> customers table
  reverseMap['email'] = [{ supabaseTable: 'customers', supabaseColumn: 'email' }];
  
  reverseMap['firstname'] = [{ 
    supabaseTable: 'customers', 
    supabaseColumn: 'name',
    transformer: (value: string, context?: any) => {
      // Combine first and last name if available
      const lastname = context?.lastname || '';
      return lastname ? `${value} ${lastname}`.trim() : value;
    }
  }];
  
  reverseMap['lastname'] = [{ 
    supabaseTable: 'customers', 
    supabaseColumn: 'name',
    transformer: (value: string, context?: any) => {
      // Combine first and last name if available
      const firstname = context?.firstname || '';
      return firstname ? `${firstname} ${value}`.trim() : value;
    }
  }];
  
  reverseMap['phone'] = [{ supabaseTable: 'customers', supabaseColumn: 'phone' }];

  return reverseMap;
}

/**
 * Cached reverse mappings
 */
let cachedReverseDealMappings: Record<string, ReverseMappingEntry[]> | null = null;
let cachedReverseContactMappings: Record<string, ReverseMappingEntry[]> | null = null;

/**
 * Get reverse deal mappings (cached)
 */
export function getReverseDealMappings(): Record<string, ReverseMappingEntry[]> {
  if (!cachedReverseDealMappings) {
    cachedReverseDealMappings = buildReverseDealMappings();
  }
  return cachedReverseDealMappings;
}

/**
 * Get reverse contact mappings (cached)
 */
export function getReverseContactMappings(): Record<string, ReverseMappingEntry[]> {
  if (!cachedReverseContactMappings) {
    cachedReverseContactMappings = buildReverseContactMappings();
  }
  return cachedReverseContactMappings;
}

/**
 * Map HubSpot property changes to Supabase updates
 * Returns a map of table names to column updates
 */
export function mapPropertyChangesToSupabase(
  objectType: 'deal' | 'contact',
  propertyChanges: Array<{ name: string; value: any }>
): Record<string, Record<string, any>> {
  const reverseMappings = objectType === 'deal' 
    ? getReverseDealMappings() 
    : getReverseContactMappings();

  const updates: Record<string, Record<string, any>> = {};

  for (const change of propertyChanges) {
    const mappingEntries = reverseMappings[change.name];
    if (!mappingEntries) {
      continue; // Property not mapped
    }

    for (const entry of mappingEntries) {
      const { supabaseTable, supabaseColumn, transformer } = entry;

      // Initialize table update object if not exists
      if (!updates[supabaseTable]) {
        updates[supabaseTable] = {};
      }

      // Apply transformer if provided
      let value = change.value;
      if (transformer) {
        try {
          value = transformer(value);
        } catch (error) {
          console.error(`Error transforming property ${change.name}:`, error);
          continue;
        }
      }

      updates[supabaseTable][supabaseColumn] = value;
    }
  }

  return updates;
}

/**
 * Special handling for name fields in contacts
 * Combines firstname and lastname into full name
 */
export function combineContactName(
  propertyChanges: Array<{ name: string; value: any }>,
  existingFirstName?: string,
  existingLastName?: string
): string | undefined {
  let firstname = existingFirstName;
  let lastname = existingLastName;

  for (const change of propertyChanges) {
    if (change.name === 'firstname') {
      firstname = change.value;
    } else if (change.name === 'lastname') {
      lastname = change.value;
    }
  }

  if (firstname || lastname) {
    return `${firstname || ''} ${lastname || ''}`.trim();
  }

  return undefined;
}

