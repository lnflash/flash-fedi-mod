import React, { useState } from "react";
import { useFlashApi } from "../contexts/FlashApiContext";
import BankAccountForm from "./BankAccountForm";
import AmountInput from "./AmountInput";
import ConfirmationModal from "./ConfirmationModal";

const SettleTab = () => {
  const { settleToBank, balance, loading, error, clearError, isFeatureEnabled } = useFlashApi();

  const [bankDetails, setBankDetails] = useState(null);
  const [amount, setAmount] = useState(0);
  const [currency, setCurrency] = useState("USD");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isAmountValid, setIsAmountValid] = useState(false);
  const [errors, setErrors] = useState({});

  // Check if feature is enabled
  if (!isFeatureEnabled("bankSettle")) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-4">🚧</div>
        <h2 className="flash-text-h2 mb-2">Feature Not Available</h2>
        <p className="flash-text-p2 text-text02">Bank settlement is not currently enabled. Please check back later.</p>
      </div>
    );
  }

  const handleAmountValidation = (isValid, amountValue) => {
    setIsAmountValid(isValid);
    setAmount(amountValue);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!bankDetails) {
      newErrors.bank = "Please enter bank account details";
    }

    if (!isAmountValid || amount <= 0) {
      newErrors.amount = "Please enter a valid amount";
    }

    if (amount > balance) {
      newErrors.amount = "Insufficient balance";
    }

    // Minimum settlement amount
    if (amount < 10) {
      newErrors.amount = "Minimum settlement amount is $10";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSettle = () => {
    if (validateForm()) {
      setShowConfirmation(true);
    }
  };

  const handleConfirmSettle = async () => {
    try {
      await settleToBank(bankDetails, amount, currency);
      setShowConfirmation(false);

      // Reset form
      setBankDetails(null);
      setAmount(0);
      setErrors({});

      // Show success message
      alert("Settlement initiated successfully! You will receive a confirmation email.");
    } catch (error) {
      setShowConfirmation(false);
      // Error is already handled by the context
    }
  };

  const formatBalance = (bal) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(bal);
  };

  const getCurrencySymbol = () => {
    switch (currency) {
      case "USD":
        return "$";
      case "JMD":
        return "J$";
      default:
        return currency;
    }
  };

  const calculateFee = (amount) => {
    // Example fee calculation - adjust based on actual Flash API
    const baseFee = 2.5;
    const percentageFee = amount * 0.01; // 1%
    return Math.max(baseFee, percentageFee);
  };

  const calculateNetAmount = (amount) => {
    return amount - calculateFee(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="flash-text-h1 mb-2">Settle to Bank</h2>
        <p className="flash-text-p2 text-secondary">Transfer your Flash balance to your local bank account</p>
      </div>

      {/* Balance Display */}
      <div className="flash-card text-center">
        <p className="flash-text-caption text-secondary mb-1">Available Balance</p>
        <p className="flash-text-h1 text-primary font-semibold">{formatBalance(balance)}</p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="flash-card bg-error border border-error p-4">
          <p className="flash-text-p2 text-error">{error}</p>
          <button onClick={clearError} className="flash-text-caption text-error underline mt-2">
            Dismiss
          </button>
        </div>
      )}

      {/* Form */}
      <div className="flash-card space-y-6">
        {/* Bank Account Form */}
        <div className="form-group">
          <label>Bank Account Details</label>
          <BankAccountForm onBankDetailsChange={setBankDetails} showAccountName={true} validateAccount={true} disabled={loading} />
          {errors.bank && <p className="flash-text-caption text-error mt-1">{errors.bank}</p>}
        </div>

        {/* Currency Selection */}
        <div className="form-group">
          <label>Currency</label>
          <select value={currency} onChange={(e) => setCurrency(e.target.value)} disabled={loading} className={loading ? "opacity-50 cursor-not-allowed" : ""}>
            <option value="USD">USD - US Dollar</option>
            <option value="JMD">JMD - Jamaican Dollar</option>
          </select>
        </div>

        {/* Amount Input */}
        <div className="form-group">
          <label>Settlement Amount</label>
          <AmountInput
            value={amount}
            onChange={setAmount}
            currency={currency}
            minAmount={10}
            maxAmount={balance}
            placeholder="Enter amount"
            disabled={loading}
            onValidationChange={handleAmountValidation}
          />
          {errors.amount && <p className="flash-text-caption text-error mt-1">{errors.amount}</p>}
        </div>

        {/* Fee and Net Amount Display */}
        {amount > 0 && (
          <div className="bg-background border border-border-light rounded-lg p-4 space-y-3">
            <div className="flex justify-between">
              <span className="flash-text-p3 text-secondary">Settlement Amount:</span>
              <span className="flash-text-p3 font-medium">
                {getCurrencySymbol()}
                {amount.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="flash-text-p3 text-secondary">Processing Fee:</span>
              <span className="flash-text-p3 font-medium text-error">
                -{getCurrencySymbol()}
                {calculateFee(amount).toFixed(2)}
              </span>
            </div>
            <div className="border-t border-border-light pt-3">
              <div className="flex justify-between">
                <span className="flash-text-p2 font-medium">Net Amount:</span>
                <span className="flash-text-p2 font-bold text-success">
                  {getCurrencySymbol()}
                  {calculateNetAmount(amount).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Settlement Time Info */}
        <div className="bg-warning border border-warning rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <span className="text-warning text-lg">⏱️</span>
            <div>
              <p className="flash-text-p3 font-medium text-warning">Processing Time</p>
              <p className="flash-text-caption text-secondary">
                Bank settlements typically take 1-3 business days to complete. You will receive an email confirmation once the transfer is initiated.
              </p>
            </div>
          </div>
        </div>

        {/* Settle Button */}
        <div className="button-group">
          <button onClick={handleSettle} disabled={loading || !bankDetails || !isAmountValid || amount > balance || amount < 10} className="flash-button">
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="loading-spinner mr-2"></div>
                Processing...
              </div>
            ) : (
              `Settle ${getCurrencySymbol()}${amount.toFixed(2)} to Bank`
            )}
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        onConfirm={handleConfirmSettle}
        title="Confirm Settlement"
        message={`Are you sure you want to settle ${getCurrencySymbol()}${amount.toFixed(2)} to your bank account?`}
        details={[
          { label: "Bank", value: bankDetails?.bank_name || "Selected Bank" },
          { label: "Account", value: `****${bankDetails?.account_number?.slice(-4)}` },
          { label: "Amount", value: `${getCurrencySymbol()}${amount.toFixed(2)}` },
          { label: "Fee", value: `${getCurrencySymbol()}${calculateFee(amount).toFixed(2)}` },
          { label: "Net Amount", value: `${getCurrencySymbol()}${calculateNetAmount(amount).toFixed(2)}` },
          { label: "Processing Time", value: "1-3 business days" },
        ]}
        confirmText="Confirm Settlement"
        loading={loading}
      />

      {/* Help Text */}
      <div className="text-center">
        <p className="flash-text-caption text-secondary">💡 Tip: Make sure your bank account details are correct before settling</p>
      </div>
    </div>
  );
};

export default SettleTab;
