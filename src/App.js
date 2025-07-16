import React, { useState, useEffect, useCallback } from "react";
import { Input } from "@fedibtc/ui";
import { webln, formatUSD, isValidLightningAddress, isValidLightningInvoice, generateQRCode } from "./utils/webln";
import { FlashApiProvider, useFlashApi } from "./contexts/FlashApiContext";
import SendToFlashTab from "./components/SendToFlashTab";
import SettleTab from "./components/SettleTab";
import TopUpTab from "./components/TopUpTab";
import PhoneAuthScreen from "./components/PhoneAuthScreen";
import "./App.css";

// Main App Component with Flash API Integration
function AppContent() {
  const { isAuthenticated, user, balance, loading, error, clearError, login, logout, verifyPhoneCode, requestPhoneCode, isFeatureEnabled } = useFlashApi();

  const [activeTab, setActiveTab] = useState("send");
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [memo, setMemo] = useState("");
  const [invoiceAmount, setInvoiceAmount] = useState("");
  const [invoiceMemo, setInvoiceMemo] = useState("");
  const [generatedInvoice, setGeneratedInvoice] = useState("");
  const [weblnEnabled, setWeblnEnabled] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("Connecting...");
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("success");

  // Check WebLN availability
  useEffect(() => {
    const checkWebLN = async () => {
      try {
        if (window.webln) {
          await window.webln.enable();
          setWeblnEnabled(true);
          setConnectionStatus("Connected");
        } else {
          setConnectionStatus("WebLN not available");
        }
      } catch (error) {
        setConnectionStatus("Connection failed");
        console.error("WebLN error:", error);
      }
    };

    checkWebLN();
  }, []);

  // Show toast notification
  const showToastNotification = useCallback((message, type = "success") => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  }, []);

  // Handle send payment
  const handleSend = async () => {
    if (!weblnEnabled) {
      showToastNotification("WebLN not available", "error");
      return;
    }

    if (!amount || !recipient) {
      showToastNotification("Please fill in all fields", "error");
      return;
    }

    if (!isValidLightningAddress(recipient) && !isValidLightningInvoice(recipient)) {
      showToastNotification("Invalid Lightning address or invoice", "error");
      return;
    }

    try {
      await webln.sendPayment(recipient);
      showToastNotification("Payment sent successfully!", "success");
      setAmount("");
      setRecipient("");
      setMemo("");
    } catch (error) {
      showToastNotification("Payment failed: " + error.message, "error");
    }
  };

  // Handle generate invoice
  const handleGenerateInvoice = async () => {
    if (!weblnEnabled) {
      showToastNotification("WebLN not available", "error");
      return;
    }

    if (!invoiceAmount) {
      showToastNotification("Please enter an amount", "error");
      return;
    }

    try {
      const response = await webln.makeInvoice({
        amount: parseInt(invoiceAmount),
        defaultMemo: invoiceMemo,
      });
      setGeneratedInvoice(response.paymentRequest);
      showToastNotification("Invoice generated successfully!", "success");
    } catch (error) {
      showToastNotification("Failed to generate invoice: " + error.message, "error");
    }
  };

  // Handle copy to clipboard
  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      showToastNotification("Copied to clipboard!", "success");
    } catch (error) {
      showToastNotification("Failed to copy", "error");
    }
  };

  // Get available tabs based on features
  const getAvailableTabs = () => {
    const tabs = [
      { id: "send", label: "Send", icon: "📤" },
      { id: "receive", label: "Receive", icon: "📥" },
      { id: "history", label: "History", icon: "📋" },
    ];

    // Add Flash API tabs if authenticated and features are enabled
    if (isAuthenticated) {
      if (isFeatureEnabled("flashSend")) {
        tabs.push({ id: "send-flash", label: "Send to Flash", icon: "⚡" });
      }
      if (isFeatureEnabled("bankSettle")) {
        tabs.push({ id: "settle", label: "Settle", icon: "🏦" });
      }
      if (isFeatureEnabled("bankTopup") || isFeatureEnabled("fygaroTopup")) {
        tabs.push({ id: "topup", label: "Top Up", icon: "💰" });
      }
    }

    return tabs;
  };

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case "send":
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="flash-text-h1 mb-2">Send Payment</h2>
              <p className="flash-text-p2 text-secondary">Send Lightning payments</p>
            </div>

            <div className="flash-card space-y-6">
              <div className="form-group">
                <label>Amount (sats)</label>
                <Input type="number" placeholder="Enter amount in sats" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>

              <div className="form-group">
                <label>Recipient</label>
                <Input type="text" placeholder="Lightning address or invoice" value={recipient} onChange={(e) => setRecipient(e.target.value)} />
              </div>

              <div className="form-group">
                <label>Memo (optional)</label>
                <textarea placeholder="Add a note" value={memo} onChange={(e) => setMemo(e.target.value)} rows={3} />
              </div>

              <div className="button-group">
                <button onClick={handleSend} disabled={!weblnEnabled || !amount || !recipient} className="flash-button">
                  Send Payment
                </button>
              </div>
            </div>
          </div>
        );

      case "receive":
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="flash-text-h1 mb-2">Receive Payment</h2>
              <p className="flash-text-p2 text-secondary">Generate Lightning invoices</p>
            </div>

            <div className="flash-card space-y-6">
              <div className="form-group">
                <label>Amount (sats)</label>
                <Input type="number" placeholder="Enter amount in sats" value={invoiceAmount} onChange={(e) => setInvoiceAmount(e.target.value)} />
              </div>

              <div className="form-group">
                <label>Memo (optional)</label>
                <Input type="text" placeholder="Add a note" value={invoiceMemo} onChange={(e) => setInvoiceMemo(e.target.value)} />
              </div>

              <div className="button-group">
                <button onClick={handleGenerateInvoice} disabled={!weblnEnabled || !invoiceAmount} className="flash-button">
                  Generate Invoice
                </button>
              </div>

              {generatedInvoice && (
                <div className="space-y-6">
                  <div className="text-center">
                    <h3 className="flash-text-h3 mb-4">Generated Invoice</h3>
                    <div className="bg-layer border border-border-light rounded-lg p-6">
                      <div className="mb-6">
                        <img src={generateQRCode(generatedInvoice)} alt="QR Code" className="mx-auto w-48 h-48 max-w-full" />
                      </div>
                      <div className="space-y-4">
                        <div>
                          <p className="flash-text-caption text-secondary mb-2">Invoice:</p>
                          <div className="bg-background border border-border-light rounded p-3 break-all">
                            <p className="flash-text-p4 font-mono text-sm">{generatedInvoice}</p>
                          </div>
                        </div>
                        <div className="button-group">
                          <button onClick={() => handleCopy(generatedInvoice)} className="flash-button-secondary">
                            Copy Invoice
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case "history":
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="flash-text-h1 mb-2">Transaction History</h2>
              <p className="flash-text-p2 text-secondary">View your recent transactions</p>
            </div>

            <div className="flash-card">
              <div className="text-center py-8">
                <div className="text-4xl mb-4">📋</div>
                <p className="flash-text-p2 text-secondary">Transaction history will be displayed here when available.</p>
              </div>
            </div>
          </div>
        );

      case "send-flash":
        return <SendToFlashTab />;

      case "settle":
        return <SettleTab />;

      case "topup":
        return <TopUpTab />;

      default:
        return null;
    }
  };

  // Authentication UI
  if (!isAuthenticated) {
    return <PhoneAuthScreen onLogin={verifyPhoneCode} onRequestCode={requestPhoneCode} loading={loading} error={error} clearError={clearError} />;
  }

  // Main app UI
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-layer border-b border-border-light sticky top-0 z-30">
        <div className="container">
          <div className="flex items-center justify-between py-4 header-content">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold text-lg">⚡</div>
              <div>
                <h1 className="flash-text-h2 text-primary">Flash Fedi Mod</h1>
                <p className="flash-text-caption text-secondary">Welcome, {user?.username || "User"}</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="flash-text-caption text-secondary">Balance</p>
                <p className="flash-text-h3 text-primary font-semibold">{formatUSD(balance)}</p>
              </div>
              <button onClick={logout} className="flash-button-secondary flash-button-sm">
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-6">
        {/* WebLN Status */}
        <div className="mb-6">
          <div className="flash-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`status-indicator ${weblnEnabled ? "success" : "error"}`}></div>
                <div>
                  <p className="flash-text-p3 font-medium">WebLN: {connectionStatus}</p>
                  <p className="flash-text-caption text-secondary">Lightning Network Integration</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="tab-navigation bg-layer rounded-lg p-1 shadow-sm">
            {getAvailableTabs().map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center justify-center space-x-2 py-3 px-4 rounded-md transition-colors min-w-0 flex-1 ${
                  activeTab === tab.id ? "bg-primary text-white shadow-sm" : "text-secondary hover:text-primary hover:bg-primary-light"
                }`}
              >
                <span className="text-lg">{tab.icon}</span>
                <span className="flash-text-p3 font-medium truncate">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">{renderTabContent()}</div>
      </main>

      {/* Toast Notification */}
      {showToast && (
        <div className={`toast ${toastType}`}>
          <p className="flash-text-p3">{toastMessage}</p>
        </div>
      )}
    </div>
  );
}

// Wrapper component with Flash API Provider
function App() {
  return (
    <FlashApiProvider>
      <AppContent />
    </FlashApiProvider>
  );
}

export default App;
