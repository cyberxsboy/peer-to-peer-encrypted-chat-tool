import React from 'react';
import './Button.css';

interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'link';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  fullWidth?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
}

export default function Button({
  children,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  onClick,
  type = 'button',
  fullWidth = false,
  iconLeft,
  iconRight,
}: ButtonProps) {
  const handleClick = () => {
    if (!disabled && !loading && onClick) {
      onClick();
    }
  };

  const getButtonClass = () => {
    let buttonClass = `btn btn-${variant} btn-${size}`;
    if (disabled || loading) {
      buttonClass += ' disabled';
    }
    if (fullWidth) {
      buttonClass += ' full-width';
    }
    return buttonClass;
  };

  return (
    <button
      type={type}
      className={getButtonClass()}
      onClick={handleClick}
      disabled={disabled || loading}
    >
      {loading && <span className="btn-spinner" />}
      {!loading && iconLeft && <span className="btn-icon">{iconLeft}</span>}
      <span className="btn-text">{children}</span>
      {!loading && iconRight && <span className="btn-icon">{iconRight}</span>}
    </button>
  );
}