import React, { useState, useEffect } from "react";
import { Input } from "@fedibtc/ui";

const AmountInput = ({
  value,
  onChange,
  currency = "USD",
  minAmount = 0,
  maxAmount = null,
  placeholder = "Enter amount",
  disabled = false,
  showCurrency = true,
  onValidationChange = null,
}) => {
  const [displayValue, setDisplayValue] = useState("");
  const [error, setError] = useState("");
  const [isValid, setIsValid] = useState(false);

  // Format currency display
  const getCurrencySymbol = () => {
    switch (currency) {
      case "USD":
        return "$";
      case "JMD":
        return "J$";
      case "BTC":
        return "₿";
      default:
        return currency;
    }
  };

  // Format number with commas
  const formatNumber = (num) => {
    if (!num) return "";
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  // Parse number from formatted string
  const parseNumber = (str) => {
    if (!str) return 0;
    return parseFloat(str.replace(/,/g, "")) || 0;
  };

  // Update display value when value prop changes
  useEffect(() => {
    if (value !== undefined && value !== null) {
      setDisplayValue(formatNumber(value));
    }
  }, [value]);

  // Validate amount
  useEffect(() => {
    const amount = parseNumber(displayValue);
    let newError = "";
    let newIsValid = false;

    if (displayValue && amount <= 0) {
      newError = "Amount must be greater than 0";
    } else if (minAmount && amount < minAmount) {
      newError = `Minimum amount is ${getCurrencySymbol()}${formatNumber(minAmount)}`;
    } else if (maxAmount && amount > maxAmount) {
      newError = `Maximum amount is ${getCurrencySymbol()}${formatNumber(maxAmount)}`;
    } else if (displayValue && amount > 0) {
      newIsValid = true;
    }

    setError(newError);
    setIsValid(newIsValid);

    // Notify parent of validation status
    if (onValidationChange) {
      onValidationChange(newIsValid, amount);
    }
  }, [displayValue, minAmount, maxAmount, onValidationChange, getCurrencySymbol]);

  const handleInputChange = (e) => {
    const inputValue = e.target.value;

    // Only allow numbers, commas, and decimal points
    const sanitizedValue = inputValue.replace(/[^\d,.]/g, "");

    // Ensure only one decimal point
    const parts = sanitizedValue.split(".");
    if (parts.length > 2) {
      return; // Don't update if multiple decimal points
    }

    // Limit decimal places to 2
    if (parts.length === 2 && parts[1].length > 2) {
      return; // Don't update if too many decimal places
    }

    setDisplayValue(sanitizedValue);

    // Call parent onChange with parsed number
    const parsedAmount = parseNumber(sanitizedValue);
    onChange(parsedAmount);
  };

  const handleBlur = () => {
    // Format the number properly on blur
    const amount = parseNumber(displayValue);
    if (amount > 0) {
      setDisplayValue(formatNumber(amount.toFixed(2)));
    }
  };

  const handleFocus = () => {
    // Remove formatting on focus for easier editing
    const amount = parseNumber(displayValue);
    if (amount > 0) {
      setDisplayValue(amount.toString());
    }
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        {showCurrency && <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text02 font-sora">{getCurrencySymbol()}</div>}
        <Input
          type="text"
          placeholder={placeholder}
          value={displayValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          disabled={disabled}
          className={`w-full p-3 border rounded-lg bg-layer text-text01 font-mono ${showCurrency ? "pl-8" : ""} ${
            error ? "border-error" : isValid ? "border-green" : "border-border01"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        />
        {isValid && !error && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <span className="text-green text-lg">✅</span>
          </div>
        )}
      </div>

      {error && <p className="flash-text-caption text-error">{error}</p>}

      {/* Amount limits display */}
      {(minAmount || maxAmount) && (
        <div className="flex justify-between flash-text-caption text-text02">
          {minAmount && (
            <span>
              Min: {getCurrencySymbol()}
              {formatNumber(minAmount)}
            </span>
          )}
          {maxAmount && (
            <span>
              Max: {getCurrencySymbol()}
              {formatNumber(maxAmount)}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default AmountInput;
