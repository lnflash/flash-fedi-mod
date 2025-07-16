import React, { useState, useEffect, useCallback } from "react";
import { Input } from "@fedibtc/ui";
import flashApi from "../utils/flashApi";

const PhoneAuthScreen = ({ onLogin, loading, error, clearError, onRequestCode }) => {
  const [step, setStep] = useState("phone"); // "phone" or "code"
  const [phoneNumber, setPhoneNumber] = useState("");
  const [countryCode, setCountryCode] = useState("JM"); // Default to Jamaica
  const [verificationCode, setVerificationCode] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [isRequestingCode, setIsRequestingCode] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  const [testingProxy, setTestingProxy] = useState(false);

  // Test proxy configuration
  const testProxy = async () => {
    setTestingProxy(true);
    try {
      console.log("Testing proxy configuration...");
      await flashApi.testConnection();
      alert("Proxy test successful! Check console for details.");
    } catch (error) {
      console.error("Proxy test failed:", error);
      alert("Proxy test failed: " + error.message);
    } finally {
      setTestingProxy(false);
    }
  };

  // Countdown timer for resend code
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Validate phone number format
  const validatePhoneNumber = (phone) => {
    // Basic validation for Jamaican phone numbers
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 7 || cleanPhone.length > 10) {
      return false;
    }
    return true;
  };

  // Handle phone number submission
  const handleSubmitPhone = async () => {
    setPhoneError("");

    if (!phoneNumber.trim()) {
      setPhoneError("Please enter your phone number");
      return;
    }

    if (!validatePhoneNumber(phoneNumber)) {
      setPhoneError("Please enter a valid phone number");
      return;
    }

    setIsRequestingCode(true);

    try {
      // Call the actual API to request verification code
      if (onRequestCode) {
        await onRequestCode(phoneNumber, countryCode);
      } else {
        // Fallback to mock API call for testing
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      // Move to code verification step
      setStep("code");
      setCountdown(30); // 30 second countdown
    } catch (error) {
      setPhoneError(error.message || "Failed to send verification code. Please try again.");
    } finally {
      setIsRequestingCode(false);
    }
  };

  // Handle verification code submission
  const handleSubmitCode = async () => {
    if (!verificationCode.trim()) {
      return;
    }

    if (verificationCode.length !== 6) {
      return;
    }

    // Call the login function with phone and code
    await onLogin(phoneNumber, verificationCode);
  };

  // Handle resend code
  const handleResendCode = async () => {
    if (countdown > 0) return;

    setIsRequestingCode(true);

    try {
      // Call the actual API to request verification code
      if (onRequestCode) {
        await onRequestCode(phoneNumber, countryCode);
      } else {
        // Fallback to mock API call for testing
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      setCountdown(30);
    } catch (error) {
      // Handle error silently for resend
      console.error("Failed to resend code:", error);
    } finally {
      setIsRequestingCode(false);
    }
  };

  // Format phone number as user types
  const formatPhoneNumber = (value) => {
    const clean = value.replace(/\D/g, "");
    if (clean.length <= 3) {
      return clean;
    } else if (clean.length <= 6) {
      return `${clean.slice(0, 3)}-${clean.slice(3)}`;
    } else {
      return `${clean.slice(0, 3)}-${clean.slice(3, 6)}-${clean.slice(6, 10)}`;
    }
  };

  const handlePhoneChange = (e) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneNumber(formatted);
    setPhoneError("");
  };

  const handleCodeChange = (e) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
    setVerificationCode(value);
  };

  // Country codes for common countries
  const countryOptions = [
    { code: "JM", name: "Jamaica", dialCode: "+1" },
    { code: "US", name: "United States", dialCode: "+1" },
    { code: "CA", name: "Canada", dialCode: "+1" },
    { code: "GB", name: "United Kingdom", dialCode: "+44" },
    { code: "SV", name: "El Salvador", dialCode: "+503" },
  ];

  if (step === "phone") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="flash-card max-w-md w-full space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">⚡</div>
            <h1 className="flash-text-h1 mb-2">Flash Fedi Mod</h1>
            <p className="flash-text-p2 text-secondary">Enter your phone number to continue</p>
          </div>

          {error && (
            <div className="bg-error border border-error p-4 rounded-lg">
              <p className="flash-text-p2 text-error">{error}</p>
              <button onClick={clearError} className="flash-text-caption text-error underline mt-2">
                Dismiss
              </button>
            </div>
          )}

          <div className="space-y-6">
            <div className="form-group">
              <label>Phone Number</label>
              <div className="flex space-x-2">
                <select value={countryCode} onChange={(e) => setCountryCode(e.target.value)} className="flex-shrink-0">
                  {countryOptions.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.dialCode} {country.name}
                    </option>
                  ))}
                </select>
                <Input type="tel" placeholder="123-456-7890" value={phoneNumber} onChange={handlePhoneChange} className="flex-1" />
              </div>
              {phoneError && <p className="flash-text-caption text-error mt-1">{phoneError}</p>}
            </div>

            <div className="button-group">
              <button onClick={handleSubmitPhone} disabled={loading || isRequestingCode || !phoneNumber.trim()} className="flash-button">
                {isRequestingCode ? "Sending Code..." : "Send Verification Code"}
              </button>

              {/* Test Proxy Button */}
              <button onClick={testProxy} disabled={testingProxy} className="flash-button-secondary">
                {testingProxy ? "Testing..." : "Test Proxy Configuration"}
              </button>
            </div>
          </div>

          <div className="text-center">
            <p className="flash-text-caption text-secondary">We'll send you a verification code via SMS</p>
          </div>
        </div>
      </div>
    );
  }

  // Verification code step
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="flash-card max-w-md w-full space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">📱</div>
          <h1 className="flash-text-h1 mb-2">Enter Verification Code</h1>
          <p className="flash-text-p2 text-secondary">We sent a 6-digit code to {phoneNumber}</p>
        </div>

        {error && (
          <div className="bg-error border border-error p-4 rounded-lg">
            <p className="flash-text-p2 text-error">{error}</p>
            <button onClick={clearError} className="flash-text-caption text-error underline mt-2">
              Dismiss
            </button>
          </div>
        )}

        <div className="space-y-6">
          <div className="form-group">
            <label>Verification Code</label>
            <Input
              type="text"
              placeholder="123456"
              value={verificationCode}
              onChange={handleCodeChange}
              maxLength={6}
              className="text-center text-2xl tracking-widest"
            />
          </div>

          <div className="button-group">
            <button onClick={handleSubmitCode} disabled={loading || verificationCode.length !== 6} className="flash-button">
              {loading ? "Verifying..." : "Verify & Sign In"}
            </button>
          </div>

          <div className="text-center space-y-2">
            <button
              onClick={handleResendCode}
              disabled={countdown > 0 || isRequestingCode}
              className="flash-text-caption text-primary underline disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {countdown > 0 ? `Resend code in ${countdown}s` : isRequestingCode ? "Sending..." : "Resend code"}
            </button>

            <button onClick={() => setStep("phone")} className="block flash-text-caption text-secondary underline">
              Change phone number
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PhoneAuthScreen;
