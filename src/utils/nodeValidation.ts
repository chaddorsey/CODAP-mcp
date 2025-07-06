/**
 * Comprehensive node property validation utilities
 * Provides validation functions for all node properties with detailed error messages
 */

import { NodeProperties } from "../types/tabs";

// Validation result interface
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationErrors;
  warnings?: ValidationWarnings;
}

// Error and warning types
export interface ValidationErrors {
  [key: string]: string;
}

export interface ValidationWarnings {
  [key: string]: string;
}

// Validation constants
export const VALIDATION_CONSTANTS = {
  TITLE: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 100,
    REQUIRED: true
  },
  INITIAL_VALUE: {
    MIN: -Number.MAX_SAFE_INTEGER,
    MAX: Number.MAX_SAFE_INTEGER
  },
  POSITION: {
    MIN_X: 0,
    MAX_X: 2000,
    MIN_Y: 0,
    MAX_Y: 1500
  },
  COLOR: {
    HEX_PATTERN: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
  },
  STRING_FIELDS: {
    MAX_LENGTH: 255
  },
  URL: {
    PATTERN: /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/i
  }
} as const;

/**
 * Validates the title property
 */
export const validateTitle = (title: string): string | null => {
  if (!title || title.trim() === "") {
    return "Title is required";
  }
  
  const trimmedTitle = title.trim();
  
  if (trimmedTitle.length < VALIDATION_CONSTANTS.TITLE.MIN_LENGTH) {
    return `Title must be at least ${VALIDATION_CONSTANTS.TITLE.MIN_LENGTH} character(s)`;
  }
  
  if (trimmedTitle.length > VALIDATION_CONSTANTS.TITLE.MAX_LENGTH) {
    return `Title must not exceed ${VALIDATION_CONSTANTS.TITLE.MAX_LENGTH} characters`;
  }
  
  return null;
};

/**
 * Validates the initial value property
 */
export const validateInitialValue = (value: number | string): string | null => {
  const numValue = typeof value === "string" ? parseFloat(value) : value;
  
  if (isNaN(numValue)) {
    return "Initial value must be a valid number";
  }
  
  if (numValue < VALIDATION_CONSTANTS.INITIAL_VALUE.MIN) {
    return "Initial value is too small";
  }
  
  if (numValue > VALIDATION_CONSTANTS.INITIAL_VALUE.MAX) {
    return "Initial value is too large";
  }
  
  return null;
};

/**
 * Validates position coordinates
 */
export const validatePosition = (x: number | string, y: number | string): { x?: string; y?: string } => {
  const errors: { x?: string; y?: string } = {};
  
  const numX = typeof x === "string" ? parseFloat(x) : x;
  const numY = typeof y === "string" ? parseFloat(y) : y;
  
  if (isNaN(numX)) {
    errors.x = "X position must be a valid number";
  } else if (numX < VALIDATION_CONSTANTS.POSITION.MIN_X) {
    errors.x = `X position must be at least ${VALIDATION_CONSTANTS.POSITION.MIN_X}`;
  } else if (numX > VALIDATION_CONSTANTS.POSITION.MAX_X) {
    errors.x = `X position must not exceed ${VALIDATION_CONSTANTS.POSITION.MAX_X}`;
  }
  
  if (isNaN(numY)) {
    errors.y = "Y position must be a valid number";
  } else if (numY < VALIDATION_CONSTANTS.POSITION.MIN_Y) {
    errors.y = `Y position must be at least ${VALIDATION_CONSTANTS.POSITION.MIN_Y}`;
  } else if (numY > VALIDATION_CONSTANTS.POSITION.MAX_Y) {
    errors.y = `Y position must not exceed ${VALIDATION_CONSTANTS.POSITION.MAX_Y}`;
  }
  
  return errors;
};

/**
 * Validates color hex format
 */
export const validateColor = (color: string): string | null => {
  if (!color || color.trim() === "") {
    return "Color is required";
  }
  
  if (!VALIDATION_CONSTANTS.COLOR.HEX_PATTERN.test(color.trim())) {
    return "Color must be a valid hex format (e.g., #ff0000 or #f00)";
  }
  
  return null;
};

/**
 * Validates URL format for image fields
 */
export const validateImageUrl = (url: string): string | null => {
  if (!url || url.trim() === "") {
    return null; // URL is optional
  }
  
  if (!VALIDATION_CONSTANTS.URL.PATTERN.test(url.trim())) {
    return "Image URL must be a valid URL format";
  }
  
  return null;
};

/**
 * Validates string field length
 */
export const validateStringField = (value: string, fieldName: string, required = false): string | null => {
  if (required && (!value || value.trim() === "")) {
    return `${fieldName} is required`;
  }
  
  if (value && value.length > VALIDATION_CONSTANTS.STRING_FIELDS.MAX_LENGTH) {
    return `${fieldName} must not exceed ${VALIDATION_CONSTANTS.STRING_FIELDS.MAX_LENGTH} characters`;
  }
  
  return null;
};

/**
 * Validates accumulator-specific business rules
 */
export const validateAccumulatorRules = (properties: NodeProperties): ValidationWarnings => {
  const warnings: ValidationWarnings = {};
  
  if (properties.isAccumulator && properties.initialValue !== 0) {
    warnings.initialValue = "Accumulators typically start with an initial value of 0";
  }
  
  if (properties.isAccumulator && properties.isFlowVariable) {
    warnings.isFlowVariable = "A node cannot be both an accumulator and a flow variable";
  }
  
  return warnings;
};

/**
 * Comprehensive validation for all node properties
 */
export const validateNodeProperties = (properties: NodeProperties): ValidationResult => {
  const errors: ValidationErrors = {};
  const warnings: ValidationWarnings = {};
  
  // Validate title
  const titleError = validateTitle(properties.title);
  if (titleError) {
    errors.title = titleError;
  }
  
  // Validate initial value
  const initialValueError = validateInitialValue(properties.initialValue);
  if (initialValueError) {
    errors.initialValue = initialValueError;
  }
  
  // Validate position
  const positionErrors = validatePosition(properties.x, properties.y);
  if (positionErrors.x) {
    errors.x = positionErrors.x;
  }
  if (positionErrors.y) {
    errors.y = positionErrors.y;
  }
  
  // Validate color
  const colorError = validateColor(properties.color);
  if (colorError) {
    errors.color = colorError;
  }
  
  // Validate advanced properties
  if (properties.image) {
    const imageError = validateImageUrl(properties.image);
    if (imageError) {
      errors.image = imageError;
    }
  }
  
  if (properties.combineMethod) {
    const combineMethodError = validateStringField(properties.combineMethod, "Combine method");
    if (combineMethodError) {
      errors.combineMethod = combineMethodError;
    }
  }
  
  if (properties.paletteItem) {
    const paletteItemError = validateStringField(properties.paletteItem, "Palette item");
    if (paletteItemError) {
      errors.paletteItem = paletteItemError;
    }
  }
  
  if (properties.sourceApp) {
    const sourceAppError = validateStringField(properties.sourceApp, "Source app");
    if (sourceAppError) {
      errors.sourceApp = sourceAppError;
    }
  }
  
  // Add business rule warnings
  const businessWarnings = validateAccumulatorRules(properties);
  Object.assign(warnings, businessWarnings);
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    warnings: Object.keys(warnings).length > 0 ? warnings : undefined
  };
};

/**
 * Validates a single field by name
 */
export const validateField = (fieldName: keyof NodeProperties, value: any, allProperties: NodeProperties): string | null => {
  switch (fieldName) {
    case "title":
      return validateTitle(value);
    case "initialValue":
      return validateInitialValue(value);
    case "x":
      return validatePosition(value, allProperties.y).x || null;
    case "y":
      return validatePosition(allProperties.x, value).y || null;
    case "color":
      return validateColor(value);
    case "image":
      return validateImageUrl(value);
    case "combineMethod":
      return validateStringField(value, "Combine method");
    case "paletteItem":
      return validateStringField(value, "Palette item");
    case "sourceApp":
      return validateStringField(value, "Source app");
    default:
      return null;
  }
};

/**
 * Utility to check if a field has validation errors
 */
export const hasFieldError = (fieldName: string, errors: ValidationErrors): boolean => {
  return Boolean(errors[fieldName]);
};

/**
 * Utility to get field error message
 */
export const getFieldError = (fieldName: string, errors: ValidationErrors): string | undefined => {
  return errors[fieldName];
};

/**
 * Utility to create validation error class name for styling
 */
export const getFieldErrorClass = (fieldName: string, errors: ValidationErrors): string => {
  return hasFieldError(fieldName, errors) ? "error" : "";
}; 