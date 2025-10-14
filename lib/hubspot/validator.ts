/**
 * HubSpot Property Validator
 * Validates property values against HubSpot schema definitions
 */

import type {
  HubSpotPropertyDefinition,
  PropertyValidationError,
  ValidationResult,
  HubSpotPropertyType,
} from './types';

/**
 * Validate a single property value against its definition
 */
export function validatePropertyValue(
  propertyName: string,
  value: any,
  definition: HubSpotPropertyDefinition
): PropertyValidationError | null {
  // Skip validation for null/undefined if not required
  if (value === null || value === undefined) {
    if (definition.required) {
      return {
        property: propertyName,
        value,
        expectedType: definition.type,
        message: `Property '${propertyName}' is required but was not provided`,
        constraint: 'required',
      };
    }
    return null; // OK to be null/undefined if not required
  }

  // Type validation
  const typeError = validateType(propertyName, value, definition.type);
  if (typeError) {
    return typeError;
  }

  // Enumeration validation
  if (definition.type === 'enumeration' && definition.options) {
    const validValues = definition.options.map(opt => opt.value);
    const valueStr = String(value);
    
    if (!validValues.includes(valueStr)) {
      return {
        property: propertyName,
        value,
        expectedType: definition.type,
        message: `Property '${propertyName}' has invalid value '${valueStr}'. Expected one of: ${validValues.join(', ')}`,
        constraint: 'enumeration',
      };
    }
  }

  // String length validation
  if (definition.type === 'string' || definition.type === 'text') {
    const strValue = String(value);
    // HubSpot has a general limit of 65536 characters for text fields
    if (strValue.length > 65536) {
      return {
        property: propertyName,
        value,
        expectedType: definition.type,
        message: `Property '${propertyName}' exceeds maximum length of 65536 characters`,
        constraint: 'maxLength',
      };
    }
  }

  // Number range validation (basic - HubSpot doesn't expose min/max in API)
  if (definition.type === 'number') {
    const numValue = Number(value);
    if (isNaN(numValue)) {
      return {
        property: propertyName,
        value,
        expectedType: definition.type,
        message: `Property '${propertyName}' must be a valid number`,
        constraint: 'type',
      };
    }
  }

  return null; // Validation passed
}

/**
 * Validate type of a property value
 */
function validateType(
  propertyName: string,
  value: any,
  expectedType: HubSpotPropertyType
): PropertyValidationError | null {
  switch (expectedType) {
    case 'string':
    case 'text':
    case 'phone_number':
      if (typeof value !== 'string') {
        return {
          property: propertyName,
          value,
          expectedType,
          message: `Property '${propertyName}' must be a string, got ${typeof value}`,
          constraint: 'type',
        };
      }
      break;

    case 'number':
      if (typeof value !== 'number' && typeof value !== 'string') {
        return {
          property: propertyName,
          value,
          expectedType,
          message: `Property '${propertyName}' must be a number or numeric string, got ${typeof value}`,
          constraint: 'type',
        };
      }
      // If string, validate it's numeric
      if (typeof value === 'string' && isNaN(Number(value))) {
        return {
          property: propertyName,
          value,
          expectedType,
          message: `Property '${propertyName}' must be a valid number`,
          constraint: 'type',
        };
      }
      break;

    case 'bool':
      if (typeof value !== 'boolean' && value !== 'true' && value !== 'false') {
        return {
          property: propertyName,
          value,
          expectedType,
          message: `Property '${propertyName}' must be a boolean or 'true'/'false' string, got ${typeof value}`,
          constraint: 'type',
        };
      }
      break;

    case 'date':
    case 'datetime':
      // Accept Date objects, ISO strings, or timestamps
      const dateValue = new Date(value);
      if (isNaN(dateValue.getTime())) {
        return {
          property: propertyName,
          value,
          expectedType,
          message: `Property '${propertyName}' must be a valid date`,
          constraint: 'type',
        };
      }
      break;

    case 'enumeration':
      // Type validation for enums happens in the main function
      break;

    case 'calculation_equation':
      // Read-only calculated fields - should not be set
      return {
        property: propertyName,
        value,
        expectedType,
        message: `Property '${propertyName}' is a calculated field and cannot be set`,
        constraint: 'readonly',
      };

    default:
      // Unknown type - allow it but log warning
      console.warn(`Unknown property type '${expectedType}' for property '${propertyName}'`);
  }

  return null;
}

/**
 * Validate multiple properties at once
 */
export function validateProperties(
  properties: Record<string, any>,
  definitions: HubSpotPropertyDefinition[]
): ValidationResult {
  const errors: PropertyValidationError[] = [];
  const warnings: string[] = [];

  // Create a map of definitions for quick lookup
  const definitionMap = new Map<string, HubSpotPropertyDefinition>();
  definitions.forEach(def => definitionMap.set(def.name, def));

  // Validate each property
  for (const [propertyName, value] of Object.entries(properties)) {
    const definition = definitionMap.get(propertyName);

    if (!definition) {
      // Property not found in schema - could be deprecated or misspelled
      warnings.push(
        `Property '${propertyName}' not found in HubSpot schema. It may not be synced.`
      );
      continue;
    }

    // Check if property is read-only
    if (definition.modificationMetadata?.readOnlyValue) {
      warnings.push(
        `Property '${propertyName}' is read-only and may not be updated.`
      );
      continue;
    }

    // Validate the property value
    const error = validatePropertyValue(propertyName, value, definition);
    if (error) {
      errors.push(error);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Filter out invalid properties from an object
 * Returns only properties that exist in the schema and are not read-only
 */
export function filterValidProperties(
  properties: Record<string, any>,
  definitions: HubSpotPropertyDefinition[]
): Record<string, any> {
  const definitionMap = new Map<string, HubSpotPropertyDefinition>();
  definitions.forEach(def => definitionMap.set(def.name, def));

  const filtered: Record<string, any> = {};

  for (const [propertyName, value] of Object.entries(properties)) {
    const definition = definitionMap.get(propertyName);

    // Skip if property doesn't exist in schema
    if (!definition) {
      console.warn(`Skipping unknown property: ${propertyName}`);
      continue;
    }

    // Skip if property is read-only
    if (definition.modificationMetadata?.readOnlyValue) {
      console.warn(`Skipping read-only property: ${propertyName}`);
      continue;
    }

    // Skip if property is calculated
    if (definition.calculated) {
      console.warn(`Skipping calculated property: ${propertyName}`);
      continue;
    }

    // Skip null/undefined values (HubSpot API doesn't accept them)
    if (value === null || value === undefined) {
      continue;
    }

    filtered[propertyName] = value;
  }

  return filtered;
}

/**
 * Format validation errors for logging
 */
export function formatValidationErrors(errors: PropertyValidationError[]): string {
  if (errors.length === 0) {
    return 'No validation errors';
  }

  return errors
    .map((error, index) => 
      `${index + 1}. ${error.message} (value: ${JSON.stringify(error.value)})`
    )
    .join('\n');
}

/**
 * Check if a property is required
 */
export function isPropertyRequired(
  propertyName: string,
  definitions: HubSpotPropertyDefinition[]
): boolean {
  const definition = definitions.find(def => def.name === propertyName);
  return definition?.required || false;
}

/**
 * Get property type
 */
export function getPropertyType(
  propertyName: string,
  definitions: HubSpotPropertyDefinition[]
): HubSpotPropertyType | undefined {
  const definition = definitions.find(def => def.name === propertyName);
  return definition?.type;
}

