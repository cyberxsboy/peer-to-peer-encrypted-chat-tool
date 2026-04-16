import React, { useState, useCallback } from 'react';
import './FormField.css';

interface ValidationResult {
  valid: boolean;
  message: string;
}

interface FormFieldProps {
  label: string;
  name: string;
  type?: 'text' | 'password' | 'email' | 'number';
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  validate?: (value: string) => ValidationResult;
  required?: boolean;
  disabled?: boolean;
  autoComplete?: string;
}

export default function FormField({
  label,
  name,
  type = 'text',
  placeholder,
  value,
  onChange,
  onBlur,
  validate,
  required = true,
  disabled = false,
  autoComplete,
}: FormFieldProps) {
  const [touched, setTouched] = useState(false);
  const [validation, setValidation] = useState<ValidationResult>({ valid: true, message: '' });

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      onChange(newValue);

      if (validate && touched) {
        setValidation(validate(newValue));
      }
    },
    [onChange, validate, touched]
  );

  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      setTouched(true);
      if (validate) {
        setValidation(validate(value));
      }
      onBlur?.();
    },
    [validate, value, onBlur]
  );

  const getFieldClass = () => {
    let fieldClass = 'form-field';
    if (touched) {
      fieldClass += validation.valid ? ' valid' : ' invalid';
    }
    if (disabled) {
      fieldClass += ' disabled';
    }
    return fieldClass;
  };

  return (
    <div className={getFieldClass()}>
      <label htmlFor={name} className="form-field-label">
        {label}
        {required && <span className="required">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        disabled={disabled}
        autoComplete={autoComplete}
        className="form-field-input"
      />
      {touched && validation.message && (
        <span className={`form-field-hint ${validation.valid ? 'success' : 'error'}`}>
          {validation.message}
        </span>
      )}
    </div>
  );
}