import React, { useState, useEffect, useCallback } from "react";
import { NodeProperties, NodeFormState, SAGE_NODE_COLORS, DEFAULT_NODE_PROPERTIES } from "../../types/tabs";
import Accordion from "./Accordion";

interface NodePropertiesFormProps {
  nodeData?: NodeProperties;
  onPropertiesChange?: (properties: NodeProperties, hasChanges: boolean) => void;
  onValidationChange?: (isValid: boolean, errors: Record<string, string>) => void;
  disabled?: boolean;
}

export const NodePropertiesForm: React.FC<NodePropertiesFormProps> = ({
  nodeData,
  onPropertiesChange,
  onValidationChange,
  disabled = false
}) => {


  const [formState, setFormState] = useState<NodeFormState>({
    properties: nodeData || DEFAULT_NODE_PROPERTIES,
    hasChanges: false,
    isValid: true,
    errors: {}
  });

  // State for advanced properties accordion
  const [advancedPropertiesOpen, setAdvancedPropertiesOpen] = useState(false);

  // Validation function
  const validateProperties = useCallback((properties: NodeProperties): { isValid: boolean; errors: Record<string, string> } => {
    const errors: Record<string, string> = {};
    
    // Title validation
    if (!properties.title || properties.title.trim() === "") {
      errors.title = "Title is required";
    } else if (properties.title.length > 100) {
      errors.title = "Title must be 100 characters or less";
    }

    // Initial value validation
    if (properties.initialValue !== undefined && (isNaN(properties.initialValue) || !isFinite(properties.initialValue))) {
      errors.initialValue = "Initial value must be a valid number";
    }

    // Position validation
    if (properties.x !== undefined && (isNaN(properties.x) || !isFinite(properties.x))) {
      errors.x = "X position must be a valid number";
    }
    if (properties.y !== undefined && (isNaN(properties.y) || !isFinite(properties.y))) {
      errors.y = "Y position must be a valid number";
    }

    // Min/Max validation
    if (properties.min !== undefined && (isNaN(properties.min) || !isFinite(properties.min))) {
      errors.min = "Min value must be a valid number";
    }
    if (properties.max !== undefined && (isNaN(properties.max) || !isFinite(properties.max))) {
      errors.max = "Max value must be a valid number";
    }
    if (properties.min !== undefined && properties.max !== undefined && properties.min >= properties.max) {
      errors.max = "Max value must be greater than min value";
    }

    // Advanced property validation
    if (properties.image && properties.image.trim() !== "") {
      // Basic URL validation
      try {
        new URL(properties.image);
      } catch {
        errors.image = "Image must be a valid URL";
      }
    }

    // String length validation for advanced properties
    if (properties.combineMethod && properties.combineMethod.length > 100) {
      errors.combineMethod = "Combine method must be 100 characters or less";
    }
    if (properties.paletteItem && properties.paletteItem.length > 100) {
      errors.paletteItem = "Palette item must be 100 characters or less";
    }
    if (properties.sourceApp && properties.sourceApp.length > 100) {
      errors.sourceApp = "Source app must be 100 characters or less";
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }, []);

  // Update form state when nodeData changes
  useEffect(() => {
    if (nodeData) {
      const validation = validateProperties(nodeData);
      setFormState({
        properties: nodeData,
        hasChanges: false,
        isValid: validation.isValid,
        errors: validation.errors
      });
    }
  }, [nodeData, validateProperties]);

  // Handle property changes
  const handlePropertyChange = useCallback((key: keyof NodeProperties, value: any) => {
    setFormState(prev => {
      const newProperties = { ...prev.properties, [key]: value };
      const validation = validateProperties(newProperties);
      const originalProperties = nodeData || DEFAULT_NODE_PROPERTIES;
      const hasChanges = JSON.stringify(newProperties) !== JSON.stringify(originalProperties);
      
      const newState = {
        properties: newProperties,
        hasChanges,
        isValid: validation.isValid,
        errors: validation.errors
      };

      // Notify parent components
      onPropertiesChange?.(newProperties, hasChanges);
      onValidationChange?.(validation.isValid, validation.errors);

      return newState;
    });
  }, [nodeData, onPropertiesChange, onValidationChange, validateProperties]);

  // Handle numeric input changes
  const handleNumericChange = useCallback((key: keyof NodeProperties, value: string) => {
    const numValue = value === "" ? undefined : Number(value);
    handlePropertyChange(key, numValue);
  }, [handlePropertyChange]);

  // Handle boolean input changes
  const handleBooleanChange = useCallback((key: keyof NodeProperties, value: boolean) => {
    handlePropertyChange(key, value);
  }, [handlePropertyChange]);

  return (
    <div className="sage-node-properties-form">
      {/* Basic Properties */}
      <div className="sage-input-group">
        <label htmlFor="node-title">Title:</label>
        <input
          id="node-title"
          type="text"
          value={formState.properties.title}
          onChange={(e) => handlePropertyChange("title", e.target.value)}
          disabled={disabled}
          className={formState.errors.title ? "error" : ""}
        />
        {formState.errors.title && <span className="error-message">{formState.errors.title}</span>}
      </div>

      <div className="sage-input-row">
        <div className="sage-input-group">
          <label htmlFor="node-initial-value">Initial Value:</label>
          <input
            id="node-initial-value"
            type="number"
            value={formState.properties.initialValue ?? ""}
            onChange={(e) => handleNumericChange("initialValue", e.target.value)}
            disabled={disabled}
            className={formState.errors.initialValue ? "error" : ""}
          />
          {formState.errors.initialValue && <span className="error-message">{formState.errors.initialValue}</span>}
        </div>
        <div className="sage-input-group">
          <label htmlFor="node-color">Color:</label>
          <select
            id="node-color"
            value={formState.properties.color || "#f7be33"}
            onChange={(e) => handlePropertyChange("color", e.target.value)}
            disabled={disabled}
          >
            {SAGE_NODE_COLORS.map(color => (
              <option key={color.value} value={color.value}>
                {color.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Position Controls */}
      <div className="sage-input-row">
        <div className="sage-input-group">
          <label htmlFor="node-x">X Position:</label>
          <input
            id="node-x"
            type="number"
            value={formState.properties.x ?? ""}
            onChange={(e) => handleNumericChange("x", e.target.value)}
            disabled={disabled}
            className={formState.errors.x ? "error" : ""}
          />
          {formState.errors.x && <span className="error-message">{formState.errors.x}</span>}
        </div>
        <div className="sage-input-group">
          <label htmlFor="node-y">Y Position:</label>
          <input
            id="node-y"
            type="number"
            value={formState.properties.y ?? ""}
            onChange={(e) => handleNumericChange("y", e.target.value)}
            disabled={disabled}
            className={formState.errors.y ? "error" : ""}
          />
          {formState.errors.y && <span className="error-message">{formState.errors.y}</span>}
        </div>
      </div>

      {/* Min/Max Values */}
      <div className="sage-input-row">
        <div className="sage-input-group">
          <label htmlFor="node-min">Min Value:</label>
          <input
            id="node-min"
            type="number"
            value={formState.properties.min ?? ""}
            onChange={(e) => handleNumericChange("min", e.target.value)}
            disabled={disabled}
            className={formState.errors.min ? "error" : ""}
          />
          {formState.errors.min && <span className="error-message">{formState.errors.min}</span>}
        </div>
        <div className="sage-input-group">
          <label htmlFor="node-max">Max Value:</label>
          <input
            id="node-max"
            type="number"
            value={formState.properties.max ?? ""}
            onChange={(e) => handleNumericChange("max", e.target.value)}
            disabled={disabled}
            className={formState.errors.max ? "error" : ""}
          />
          {formState.errors.max && <span className="error-message">{formState.errors.max}</span>}
        </div>
      </div>

      {/* Boolean Properties */}
      <div className="sage-input-row">
        <div className="sage-input-group">
          <label>
            <input
              type="checkbox"
              checked={formState.properties.isAccumulator || false}
              onChange={(e) => handleBooleanChange("isAccumulator", e.target.checked)}
              disabled={disabled}
            />
            Is Accumulator
          </label>
        </div>
        <div className="sage-input-group">
          <label>
            <input
              type="checkbox"
              checked={formState.properties.isFlowVariable || false}
              onChange={(e) => handleBooleanChange("isFlowVariable", e.target.checked)}
              disabled={disabled}
            />
            Is Flow Variable
          </label>
        </div>
      </div>

      <div className="sage-input-row">
        <div className="sage-input-group">
          <label>
            <input
              type="checkbox"
              checked={formState.properties.allowNegativeValues !== false}
              onChange={(e) => handleBooleanChange("allowNegativeValues", e.target.checked)}
              disabled={disabled}
            />
            Allow Negative Values
          </label>
        </div>
        <div className="sage-input-group">
          <label>
            <input
              type="checkbox"
              checked={formState.properties.valueDefinedSemiQuantitatively || false}
              onChange={(e) => handleBooleanChange("valueDefinedSemiQuantitatively", e.target.checked)}
              disabled={disabled}
            />
            Semi-Quantitative
          </label>
        </div>
      </div>

      {/* Advanced Properties Accordion */}
      <Accordion 
        title="Advanced Properties" 
        isOpen={advancedPropertiesOpen} 
        onToggle={() => setAdvancedPropertiesOpen(!advancedPropertiesOpen)} 
        className="sage-advanced-properties"
      >
        {/* Combine Method */}
        <div className="sage-input-group">
          <label htmlFor="node-combine-method">Combine Method:</label>
          <input
            id="node-combine-method"
            type="text"
            value={formState.properties.combineMethod || ""}
            onChange={(e) => handlePropertyChange("combineMethod", e.target.value)}
            disabled={disabled}
            placeholder="Enter combine method"
          />
        </div>

        {/* Image Properties */}
        <div className="sage-input-row">
          <div className="sage-input-group">
            <label htmlFor="node-image">Image URL:</label>
            <input
              id="node-image"
              type="text"
              value={formState.properties.image || ""}
              onChange={(e) => handlePropertyChange("image", e.target.value)}
              disabled={disabled}
              placeholder="Enter image URL"
              className={formState.errors.image ? "error" : ""}
            />
            {formState.errors.image && <span className="error-message">{formState.errors.image}</span>}
          </div>
          <div className="sage-input-group">
            <label>
              <input
                type="checkbox"
                checked={formState.properties.usesDefaultImage !== false}
                onChange={(e) => handleBooleanChange("usesDefaultImage", e.target.checked)}
                disabled={disabled}
              />
              Uses Default Image
            </label>
          </div>
        </div>

        {/* Palette and Source */}
        <div className="sage-input-row">
          <div className="sage-input-group">
            <label htmlFor="node-palette-item">Palette Item:</label>
            <input
              id="node-palette-item"
              type="text"
              value={formState.properties.paletteItem || ""}
              onChange={(e) => handlePropertyChange("paletteItem", e.target.value)}
              disabled={disabled}
              placeholder="Enter palette item"
            />
          </div>
          <div className="sage-input-group">
            <label htmlFor="node-source-app">Source App:</label>
            <input
              id="node-source-app"
              type="text"
              value={formState.properties.sourceApp || ""}
              onChange={(e) => handlePropertyChange("sourceApp", e.target.value)}
              disabled={disabled}
              placeholder="Enter source app"
            />
          </div>
        </div>
      </Accordion>

      {/* Form Status */}
      {formState.hasChanges && (
        <div className="sage-form-status changes">
          <span>● Unsaved changes</span>
        </div>
      )}
      {!formState.isValid && (
        <div className="sage-form-status errors">
          <span>⚠ Please fix validation errors</span>
        </div>
      )}
    </div>
  );
};

export default NodePropertiesForm; 
