/**
 * HubSpot Property Type Definitions
 * Type-safe interfaces for HubSpot CRM properties and schemas
 */

/**
 * HubSpot property field types
 */
export type HubSpotPropertyType =
  | 'string'
  | 'number'
  | 'date'
  | 'datetime'
  | 'enumeration'
  | 'bool'
  | 'phone_number'
  | 'text'
  | 'calculation_equation';

/**
 * Property validation constraints
 */
export interface PropertyConstraints {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
}

/**
 * Enumeration option for select/dropdown properties
 */
export interface PropertyOption {
  label: string;
  value: string;
  description?: string;
  displayOrder?: number;
  hidden?: boolean;
}

/**
 * HubSpot property definition from API
 */
export interface HubSpotPropertyDefinition {
  name: string;
  label: string;
  type: HubSpotPropertyType;
  fieldType: string;
  description?: string;
  groupName?: string;
  options?: PropertyOption[];
  createdAt?: string;
  updatedAt?: string;
  hidden?: boolean;
  modificationMetadata?: {
    readOnlyValue?: boolean;
    readOnlyDefinition?: boolean;
    archivable?: boolean;
  };
  formField?: boolean;
  displayOrder?: number;
  required?: boolean;
  calculated?: boolean;
  externalOptions?: boolean;
  hasUniqueValue?: boolean;
  showCurrencySymbol?: boolean;
}

/**
 * Schema cache entry
 */
export interface PropertySchemaCache {
  properties: HubSpotPropertyDefinition[];
  timestamp: number;
  expiresAt: number;
}

/**
 * Validation error details
 */
export interface PropertyValidationError {
  property: string;
  value: any;
  expectedType: HubSpotPropertyType;
  message: string;
  constraint?: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: PropertyValidationError[];
  warnings?: string[];
}

/**
 * Property value with metadata
 */
export interface PropertyValue {
  name: string;
  value: any;
  validated?: boolean;
}

/**
 * Contact properties interface
 */
export interface ContactProperties {
  email: string;
  firstname?: string;
  lastname?: string;
  phone?: string;
  [key: string]: any; // Allow custom properties
}

/**
 * Deal properties interface
 */
export interface DealProperties {
  dealname: string;
  amount?: string | number;
  pipeline?: string;
  dealstage?: string;
  closedate?: string;
  // Custom properties
  [key: string]: any;
}

/**
 * Order data for HubSpot sync
 */
export interface OrderSyncData {
  orderId: string;
  customerId: string;
  customerEmail: string;
  customerName?: string;
  customerPhone?: string;
  priceTotal: number;
  currency: string;
  status: string;
  pickupAddress?: string;
  dropoffAddress?: string;
  distanceMiles?: number;
  driverId?: string;
  driverName?: string;
  driverPhone?: string;
  createdAt: Date;
  updatedAt?: Date;
}

/**
 * HubSpot sync result
 */
export interface SyncResult {
  success: boolean;
  contactId?: string;
  dealId?: string;
  errors?: string[];
  warnings?: string[];
}

/**
 * Property transformer function type
 */
export type PropertyTransformer = (value: any) => any;

/**
 * Property mapping definition
 */
export interface PropertyMapping {
  hubspotProperty: string;
  sourceField?: string;
  required?: boolean;
  transformer?: PropertyTransformer;
  defaultValue?: any;
}

/**
 * Object-specific property mappings
 */
export interface PropertyMappings {
  contact: Record<string, PropertyMapping>;
  deal: Record<string, PropertyMapping>;
}

