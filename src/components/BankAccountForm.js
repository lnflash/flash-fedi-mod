import React, { useState, useEffect } from "react";
import { Input } from "@fedibtc/ui";
import { useFlashApi } from "../contexts/FlashApiContext";

const BankAccountForm = ({ onBankDetailsChange, showAccountName = false, validateAccount = false, disabled = false }) => {
  const { getSupportedBanks, validateBankAccount } = useFlashApi();

  const [banks, setBanks] = useState([]);
  const [selectedBank, setSelectedBank] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [loading, setLoading] = useState(false);
  const [validationStatus, setValidationStatus] = useState(null);
  const [errors, setErrors] = useState({});

  // Load supported banks on mount
  useEffect(() => {
    const loadBanks = async () => {
      try {
        const supportedBanks = await getSupportedBanks();
        setBanks(supportedBanks);
      } catch (error) {
        console.error("Failed to load banks:", error);
      }
    };

    loadBanks();
  }, [getSupportedBanks]);

  // Validate account number when bank and account number are provided
  useEffect(() => {
    if (validateAccount && selectedBank && accountNumber && accountNumber.length >= 8) {
      const validateAccountNumber = async () => {
        setLoading(true);
        setValidationStatus("validating");

        try {
          await validateBankAccount(selectedBank, accountNumber);
          setValidationStatus("valid");
          setErrors((prev) => ({ ...prev, accountNumber: null }));
        } catch (error) {
          setValidationStatus("invalid");
          setErrors((prev) => ({
            ...prev,
            accountNumber: error.message || "Invalid account number",
          }));
        } finally {
          setLoading(false);
        }
      };

      // Debounce validation
      const timeoutId = setTimeout(validateAccountNumber, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [selectedBank, accountNumber, validateAccount, validateBankAccount]);

  // Update parent component when bank details change
  useEffect(() => {
    const bankDetails = {
      bank_code: selectedBank,
      account_number: accountNumber,
      account_name: accountName,
    };

    // Only call if we have the required fields
    if (selectedBank && accountNumber && (!showAccountName || accountName)) {
      onBankDetailsChange(bankDetails);
    } else {
      onBankDetailsChange(null);
    }
  }, [selectedBank, accountNumber, accountName, showAccountName, onBankDetailsChange]);

  const handleBankChange = (e) => {
    setSelectedBank(e.target.value);
    setValidationStatus(null);
    setErrors((prev) => ({ ...prev, bank: null }));
  };

  const handleAccountNumberChange = (e) => {
    const value = e.target.value.replace(/\D/g, ""); // Only allow digits
    setAccountNumber(value);
    setValidationStatus(null);
    setErrors((prev) => ({ ...prev, accountNumber: null }));
  };

  const handleAccountNameChange = (e) => {
    setAccountName(e.target.value);
    setErrors((prev) => ({ ...prev, accountName: null }));
  };

  const getValidationIcon = () => {
    if (loading) return "⏳";
    if (validationStatus === "valid") return "✅";
    if (validationStatus === "invalid") return "❌";
    return null;
  };

  const getValidationMessage = () => {
    if (loading) return "Validating account...";
    if (validationStatus === "valid") return "Account number is valid";
    if (validationStatus === "invalid") return errors.accountNumber;
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Bank Selection */}
      <div className="form-group">
        <label>Bank</label>
        <select value={selectedBank} onChange={handleBankChange} disabled={disabled} className={errors.bank ? "border-error" : ""}>
          <option value="">Select a bank</option>
          {banks.map((bank) => (
            <option key={bank.code} value={bank.code}>
              {bank.name}
            </option>
          ))}
        </select>
        {errors.bank && <p className="flash-text-caption text-error mt-1">{errors.bank}</p>}
      </div>

      {/* Account Number */}
      <div className="form-group">
        <label>Account Number</label>
        <div className="relative">
          <Input
            type="text"
            placeholder="Enter account number"
            value={accountNumber}
            onChange={handleAccountNumberChange}
            disabled={disabled}
            className={`font-mono ${errors.accountNumber ? "border-error" : ""}`}
            maxLength={20}
          />
          {getValidationIcon() && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <span className="text-lg">{getValidationIcon()}</span>
            </div>
          )}
        </div>
        {getValidationMessage() && (
          <p className={`flash-text-caption mt-1 ${validationStatus === "valid" ? "text-success" : "text-error"}`}>{getValidationMessage()}</p>
        )}
      </div>

      {/* Account Name (optional) */}
      {showAccountName && (
        <div className="form-group">
          <label>Account Holder Name</label>
          <Input
            type="text"
            placeholder="Enter account holder name"
            value={accountName}
            onChange={handleAccountNameChange}
            disabled={disabled}
            className={errors.accountName ? "border-error" : ""}
            maxLength={100}
          />
          {errors.accountName && <p className="flash-text-caption text-error mt-1">{errors.accountName}</p>}
        </div>
      )}
    </div>
  );
};

export default BankAccountForm;
