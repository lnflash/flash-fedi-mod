import React, { useState } from "react";
import { useFlashApi } from "../contexts/FlashApiContext";
import BankAccountForm from "./BankAccountForm";
import AmountInput from "./AmountInput";
import ConfirmationModal from "./ConfirmationModal";
import FygaroWebview from "./FygaroWebview";

const TopUpTab = () => {
  const { topupBank, topupCard, balance, loading, error, clearError, isFeatureEnabled } = useFlashApi();

  const [fundingMethod, setFundingMethod] = useState("bank"); // 'bank' or 'card'
  const [bankDetails, setBankDetails] = useState(null);
  const [amount, setAmount] = useState(0);
  const [currency, setCurrency] = useState("USD");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showFygaroWebview, setShowFygaroWebview] = useState(false);
  const [fygaroPaymentUrl, setFygaroPaymentUrl] = useState("");
  const [isAmountValid, setIsAmountValid] = useState(false);
  const [errors, setErrors] = useState({});

  // Check if features are enabled
  const bankTopupEnabled = isFeatureEnabled("bankTopup");
  const fygaroTopupEnabled = isFeatureEnabled("fygaroTopup");

  if (!bankTopupEnabled && !fygaroTopupEnabled) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-4">🚧</div>
        <h2 className="flash-text-h2 mb-2">Feature Not Available</h2>
        <p className="flash-text-p2 text-text02">Top up features are not currently enabled. Please check back later.</p>
      </div>
    );
  }

  const handleAmountValidation = (isValid, amountValue) => {
    setIsAmountValid(isValid);
    setAmount(amountValue);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!isAmountValid || amount <= 0) {
      newErrors.amount = "Please enter a valid amount";
    }

    if (fundingMethod === "bank" && !bankDetails) {
      newErrors.bank = "Please enter bank account details";
    }

    // Minimum top up amount
    if (amount < 5) {
      newErrors.amount = "Minimum top up amount is $5";
    }

    // Maximum top up amount
    if (amount > 10000) {
      newErrors.amount = "Maximum top up amount is $10,000";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleTopUp = () => {
    if (validateForm()) {
      if (fundingMethod === "bank") {
        setShowConfirmation(true);
      } else {
        handleCardTopUp();
      }
    }
  };

  const handleBankTopUp = async () => {
    try {
      await topupBank(bankDetails, amount, currency);
      setShowConfirmation(false);

      // Reset form
      setBankDetails(null);
      setAmount(0);
      setErrors({});

      // Show success message
      alert("Bank top up initiated successfully! You will receive a confirmation email.");
    } catch (error) {
      setShowConfirmation(false);
      // Error is already handled by the context
    }
  };

  const handleCardTopUp = async () => {
    try {
      const response = await topupCard(amount, currency);
      setFygaroPaymentUrl(response.payment_url);
      setShowFygaroWebview(true);
    } catch (error) {
      // Error is already handled by the context
    }
  };

  const handleFygaroSuccess = (data) => {
    setShowFygaroWebview(false);
    setAmount(0);
    setErrors({});
    alert("Card payment successful! Your account will be credited shortly.");
  };

  const handleFygaroError = (error) => {
    setShowFygaroWebview(false);
    alert(`Payment failed: ${error}`);
  };

  const handleFygaroCancel = () => {
    setShowFygaroWebview(false);
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
    if (fundingMethod === "bank") {
      // Bank transfer fees
      return 0; // Usually free for bank transfers
    } else {
      // Card payment fees
      const baseFee = 2.5;
      const percentageFee = amount * 0.029; // 2.9%
      return baseFee + percentageFee;
    }
  };

  const calculateTotalAmount = (amount) => {
    return amount + calculateFee(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="flash-text-h1 mb-2">Top Up Wallet</h2>
        <p className="flash-text-p2 text-text02">Add funds to your Flash wallet</p>
      </div>

      {/* Balance Display */}
      <div className="flash-card text-center">
        <p className="flash-text-caption text-text02 mb-1">Current Balance</p>
        <p className="flash-text-h1 text-text01">{formatBalance(balance)}</p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="flash-card bg-error9 border border-error p-4">
          <p className="flash-text-p2 text-error">{error}</p>
          <button onClick={clearError} className="flash-text-caption text-error underline mt-2">
            Dismiss
          </button>
        </div>
      )}

      {/* Form */}
      <div className="flash-card space-y-4">
        {/* Funding Method Selection */}
        <div>
          <label className="block flash-text-p4 text-text02 mb-2">Funding Method</label>
          <div className="grid grid-cols-2 gap-3">
            {bankTopupEnabled && (
              <button
                onClick={() => setFundingMethod("bank")}
                className={`p-4 border rounded-lg text-center transition-colors ${
                  fundingMethod === "bank" ? "border-primary bg-primary text-white" : "border-border01 bg-layer text-text01 hover:border-primary"
                }`}
              >
                <div className="text-2xl mb-2">🏦</div>
                <p className="flash-text-p3 font-medium">Bank Transfer</p>
                <p className="flash-text-caption">Free, 1-3 days</p>
              </button>
            )}

            {fygaroTopupEnabled && (
              <button
                onClick={() => setFundingMethod("card")}
                className={`p-4 border rounded-lg text-center transition-colors ${
                  fundingMethod === "card" ? "border-primary bg-primary text-white" : "border-border01 bg-layer text-text01 hover:border-primary"
                }`}
              >
                <div className="text-2xl mb-2">💳</div>
                <p className="flash-text-p3 font-medium">Debit/Credit Card</p>
                <p className="flash-text-caption">Instant, small fee</p>
              </button>
            )}
          </div>
        </div>

        {/* Bank Account Form (only for bank transfers) */}
        {fundingMethod === "bank" && bankTopupEnabled && (
          <div>
            <label className="block flash-text-p4 text-text02 mb-2">Bank Account Details</label>
            <BankAccountForm onBankDetailsChange={setBankDetails} showAccountName={false} validateAccount={true} disabled={loading} />
            {errors.bank && <p className="flash-text-caption text-error mt-1">{errors.bank}</p>}
          </div>
        )}

        {/* Currency Selection */}
        <div>
          <label className="block flash-text-p4 text-text02 mb-2">Currency</label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            disabled={loading}
            className={`w-full p-3 border rounded-lg bg-layer text-text01 font-sora ${"border-border01"} ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <option value="USD">USD - US Dollar</option>
            <option value="JMD">JMD - Jamaican Dollar</option>
          </select>
        </div>

        {/* Amount Input */}
        <div>
          <label className="block flash-text-p4 text-text02 mb-2">Top Up Amount</label>
          <AmountInput
            value={amount}
            onChange={setAmount}
            currency={currency}
            minAmount={5}
            maxAmount={10000}
            placeholder="Enter amount"
            disabled={loading}
            onValidationChange={handleAmountValidation}
          />
          {errors.amount && <p className="flash-text-caption text-error mt-1">{errors.amount}</p>}
        </div>

        {/* Fee and Total Display */}
        {amount > 0 && (
          <div className="bg-grey5 rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <span className="flash-text-p3 text-text02">Top Up Amount:</span>
              <span className="flash-text-p3 font-medium">
                {getCurrencySymbol()}
                {amount.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="flash-text-p3 text-text02">{fundingMethod === "bank" ? "Processing Fee:" : "Card Fee:"}</span>
              <span className="flash-text-p3 font-medium text-error">
                +{getCurrencySymbol()}
                {calculateFee(amount).toFixed(2)}
              </span>
            </div>
            <div className="border-t border-border01 pt-2">
              <div className="flex justify-between">
                <span className="flash-text-p2 font-medium">Total to Pay:</span>
                <span className="flash-text-p2 font-bold text-primary">
                  {getCurrencySymbol()}
                  {calculateTotalAmount(amount).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Processing Time Info */}
        <div className="bg-warning9 border border-warning rounded-lg p-4">
          <div className="flex items-start">
            <span className="text-warning text-lg mr-2">⏱️</span>
            <div>
              <p className="flash-text-p3 font-medium text-warning">Processing Time</p>
              <p className="flash-text-caption text-text02">
                {fundingMethod === "bank"
                  ? "Bank transfers typically take 1-3 business days to complete."
                  : "Card payments are processed instantly and credited to your account immediately."}
              </p>
            </div>
          </div>
        </div>

        {/* Top Up Button */}
        <button
          onClick={handleTopUp}
          disabled={loading || !isAmountValid || amount < 5 || amount > 10000 || (fundingMethod === "bank" && !bankDetails)}
          className="w-full flash-button disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Processing...
            </div>
          ) : (
            `Top Up ${getCurrencySymbol()}${amount.toFixed(2)}`
          )}
        </button>
      </div>

      {/* Confirmation Modal for Bank Transfers */}
      <ConfirmationModal
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        onConfirm={handleBankTopUp}
        title="Confirm Bank Top Up"
        message={`Are you sure you want to top up ${getCurrencySymbol()}${amount.toFixed(2)} from your bank account?`}
        details={[
          { label: "Bank", value: bankDetails?.bank_name || "Selected Bank" },
          { label: "Account", value: `****${bankDetails?.account_number?.slice(-4)}` },
          { label: "Amount", value: `${getCurrencySymbol()}${amount.toFixed(2)}` },
          { label: "Fee", value: `${getCurrencySymbol()}${calculateFee(amount).toFixed(2)}` },
          { label: "Total", value: `${getCurrencySymbol()}${calculateTotalAmount(amount).toFixed(2)}` },
          { label: "Processing Time", value: "1-3 business days" },
        ]}
        confirmText="Confirm Top Up"
        loading={loading}
      />

      {/* Fygaro Webview for Card Payments */}
      <FygaroWebview
        paymentUrl={fygaroPaymentUrl}
        isOpen={showFygaroWebview}
        onClose={() => setShowFygaroWebview(false)}
        onSuccess={handleFygaroSuccess}
        onError={handleFygaroError}
        onCancel={handleFygaroCancel}
      />

      {/* Help Text */}
      <div className="text-center">
        <p className="flash-text-caption text-text02">💡 Tip: Bank transfers are free but take longer. Card payments are instant but have a small fee.</p>
      </div>
    </div>
  );
};

export default TopUpTab;
