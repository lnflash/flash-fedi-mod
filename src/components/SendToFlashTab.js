import React, { useState } from "react";
import { Input } from "@fedibtc/ui";
import { useFlashApi } from "../contexts/FlashApiContext";
import AmountInput from "./AmountInput";
import ConfirmationModal from "./ConfirmationModal";

const SendToFlashTab = () => {
  const { sendToUsername, balance, loading, error, clearError } = useFlashApi();

  const [username, setUsername] = useState("");
  const [amount, setAmount] = useState(0);
  const [memo, setMemo] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isAmountValid, setIsAmountValid] = useState(false);
  const [errors, setErrors] = useState({});

  const handleUsernameChange = (e) => {
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "");
    setUsername(value);
    setErrors((prev) => ({ ...prev, username: null }));
  };

  const handleAmountValidation = (isValid, amountValue) => {
    setIsAmountValid(isValid);
    setAmount(amountValue);
  };

  const handleMemoChange = (e) => {
    const value = e.target.value;
    setMemo(value);
    if (value.length > 500) {
      setErrors((prev) => ({ ...prev, memo: "Memo too long. Maximum 500 characters." }));
    } else {
      setErrors((prev) => ({ ...prev, memo: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!username || username.length < 3) {
      newErrors.username = "Username must be at least 3 characters";
    }

    if (!isAmountValid || amount <= 0) {
      newErrors.amount = "Please enter a valid amount";
    }

    if (amount > balance) {
      newErrors.amount = "Insufficient balance";
    }

    if (memo && memo.length > 500) {
      newErrors.memo = "Memo too long. Maximum 500 characters.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSend = () => {
    if (validateForm()) {
      setShowConfirmation(true);
    }
  };

  const handleConfirmSend = async () => {
    try {
      await sendToUsername(username, amount, memo, currency);
      setShowConfirmation(false);

      // Reset form
      setUsername("");
      setAmount(0);
      setMemo("");
      setErrors({});

      // Show success message (you can implement a toast notification here)
      alert("Payment sent successfully!");
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
      case "BTC":
        return "₿";
      default:
        return currency;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="flash-text-h1 mb-2">Send to Flash User</h2>
        <p className="flash-text-p2 text-text02">Send money to any Flash user by their username</p>
      </div>

      {/* Balance Display */}
      <div className="flash-card text-center">
        <p className="flash-text-caption text-text02 mb-1">Available Balance</p>
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
        {/* Username Input */}
        <div>
          <label className="block flash-text-p4 text-text02 mb-2">Flash Username</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text02">@</span>
            <Input
              type="text"
              placeholder="username"
              value={username}
              onChange={handleUsernameChange}
              disabled={loading}
              className={`w-full p-3 border rounded-lg bg-layer text-text01 ${username ? "pl-8" : ""} ${errors.username ? "border-error" : "border-border01"} ${
                loading ? "opacity-50 cursor-not-allowed" : ""
              }`}
              maxLength={20}
            />
          </div>
          {errors.username && <p className="flash-text-caption text-error mt-1">{errors.username}</p>}
        </div>

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
            <option value="BTC">BTC - Bitcoin</option>
          </select>
        </div>

        {/* Amount Input */}
        <div>
          <label className="block flash-text-p4 text-text02 mb-2">Amount</label>
          <AmountInput
            value={amount}
            onChange={setAmount}
            currency={currency}
            minAmount={0.01}
            maxAmount={balance}
            placeholder="Enter amount"
            disabled={loading}
            onValidationChange={handleAmountValidation}
          />
          {errors.amount && <p className="flash-text-caption text-error mt-1">{errors.amount}</p>}
        </div>

        {/* Memo Input */}
        <div>
          <label className="block flash-text-p4 text-text02 mb-2">Memo (Optional)</label>
          <textarea
            placeholder="Add a note for the recipient"
            value={memo}
            onChange={handleMemoChange}
            disabled={loading}
            className={`w-full p-3 border rounded-lg bg-layer text-text01 resize-none ${errors.memo ? "border-error" : "border-border01"} ${
              loading ? "opacity-50 cursor-not-allowed" : ""
            }`}
            rows={3}
            maxLength={500}
          />
          <div className="flex justify-between mt-1">
            {errors.memo && <p className="flash-text-caption text-error">{errors.memo}</p>}
            <p className="flash-text-caption text-text02 ml-auto">{memo.length}/500</p>
          </div>
        </div>

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={loading || !username || !isAmountValid || amount > balance}
          className="w-full flash-button disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Sending...
            </div>
          ) : (
            `Send ${getCurrencySymbol()}${amount.toFixed(2)} to @${username}`
          )}
        </button>
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        onConfirm={handleConfirmSend}
        title="Confirm Payment"
        message={`Are you sure you want to send ${getCurrencySymbol()}${amount.toFixed(2)} to @${username}?`}
        details={[
          { label: "Recipient", value: `@${username}` },
          { label: "Amount", value: `${getCurrencySymbol()}${amount.toFixed(2)}` },
          { label: "Currency", value: currency },
          { label: "Memo", value: memo || "No memo" },
          { label: "Balance After", value: formatBalance(balance - amount) },
        ]}
        confirmText="Send Payment"
        loading={loading}
      />

      {/* Help Text */}
      <div className="text-center">
        <p className="flash-text-caption text-text02">💡 Tip: Make sure you have the correct username before sending</p>
      </div>
    </div>
  );
};

export default SendToFlashTab;
