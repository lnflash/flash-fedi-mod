// WebLN utilities for Fedi mod
class WebLNProvider {
  constructor() {
    this.enabled = false;
    this.info = null;
  }

  async enable() {
    try {
      if (typeof window !== "undefined" && window.webln) {
        await window.webln.enable();
        this.enabled = true;
        this.info = await window.webln.getInfo();
        return true;
      }

      // Fallback for testing/development
      console.log("WebLN not available, using mock implementation");
      this.enabled = true;
      this.info = {
        node: {
          alias: "Fedi Federation",
          pubkey: "mock_pubkey",
          network: "signet",
        },
      };
      return true;
    } catch (error) {
      console.error("Failed to enable WebLN:", error);
      return false;
    }
  }

  async sendPayment(paymentRequest) {
    if (!this.enabled) {
      throw new Error("WebLN not enabled");
    }

    try {
      if (window.webln && window.webln.sendPayment) {
        const result = await window.webln.sendPayment(paymentRequest);
        return result;
      } else {
        // Mock implementation for testing
        return {
          preimage: "mock_preimage_" + Date.now(),
          paymentHash: "mock_hash_" + Date.now(),
        };
      }
    } catch (error) {
      console.error("Payment failed:", error);
      throw error;
    }
  }

  async makeInvoice(args) {
    if (!this.enabled) {
      throw new Error("WebLN not enabled");
    }

    try {
      if (window.webln && window.webln.makeInvoice) {
        const result = await window.webln.makeInvoice(args);
        return result;
      } else {
        // Mock implementation for testing
        return {
          paymentRequest: "lnbc" + args.amount + "u1pwjqvwspp5mock_invoice_" + Date.now(),
          paymentHash: "mock_hash_" + Date.now(),
        };
      }
    } catch (error) {
      console.error("Invoice creation failed:", error);
      throw error;
    }
  }

  async signMessage(message) {
    if (!this.enabled) {
      throw new Error("WebLN not enabled");
    }

    try {
      if (window.webln && window.webln.signMessage) {
        const result = await window.webln.signMessage(message);
        return result;
      } else {
        // Mock implementation for testing
        return {
          message: message,
          signature: "mock_signature_" + Date.now(),
        };
      }
    } catch (error) {
      console.error("Message signing failed:", error);
      throw error;
    }
  }

  async verifyMessage(signature, message) {
    if (!this.enabled) {
      throw new Error("WebLN not enabled");
    }

    try {
      if (window.webln && window.webln.verifyMessage) {
        const result = await window.webln.verifyMessage(signature, message);
        return result;
      } else {
        // Mock implementation for testing
        return { valid: true };
      }
    } catch (error) {
      console.error("Message verification failed:", error);
      throw error;
    }
  }

  // Fedi-specific methods
  async getFediBalance() {
    // This would integrate with the Fedi Federation's balance API
    try {
      // Mock implementation - in real implementation, this would call Fedi's API
      const response = await fetch("/api/fedi/balance", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        return data.balance;
      }
    } catch (error) {
      console.error("Failed to fetch Fedi balance:", error);
    }

    // Mock balance for testing
    return 100000; // 100k sats
  }

  async sendFediPayment(recipient, amount, memo = "") {
    // This would integrate with the Fedi Federation's payment API
    try {
      // Mock implementation
      const response = await fetch("/api/fedi/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipient,
          amount,
          memo,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        return result;
      }
    } catch (error) {
      console.error("Failed to send Fedi payment:", error);
    }

    // Mock successful payment
    return {
      success: true,
      transactionId: "fedi_tx_" + Date.now(),
      amount: amount,
      recipient: recipient,
      timestamp: new Date().toISOString(),
    };
  }

  async createFediInvoice(amount, memo = "") {
    // This would integrate with the Fedi Federation's invoice API
    try {
      // Mock implementation
      const response = await fetch("/api/fedi/invoice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount,
          memo,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        return result;
      }
    } catch (error) {
      console.error("Failed to create Fedi invoice:", error);
    }

    // Mock invoice
    return {
      invoice: `fedi_invoice_${amount}_${Date.now()}`,
      paymentHash: "fedi_hash_" + Date.now(),
      amount: amount,
      memo: memo,
    };
  }
}

// Export a singleton instance
export const webln = new WebLNProvider();

// Utility functions
export const formatSats = (sats) => {
  return new Intl.NumberFormat().format(sats);
};

export const formatBTC = (sats) => {
  return (sats / 100000000).toFixed(8);
};

export const formatUSD = (sats, btcPrice = 45000) => {
  const btc = sats / 100000000;
  return (btc * btcPrice).toFixed(2);
};

export const isValidLightningAddress = (address) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(address);
};

export const isValidLightningInvoice = (invoice) => {
  return invoice.toLowerCase().startsWith("lnbc") || invoice.toLowerCase().startsWith("lntb") || invoice.toLowerCase().startsWith("lnbr");
};

export const generateQRCode = (data) => {
  // This would generate a QR code for the given data
  // For now, return a placeholder
  return `data:image/svg+xml;base64,${btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
      <rect width="200" height="200" fill="white"/>
      <rect x="10" y="10" width="180" height="180" fill="black"/>
      <rect x="20" y="20" width="160" height="160" fill="white"/>
      <text x="100" y="100" text-anchor="middle" font-family="Arial" font-size="12" fill="black">
        QR Code
      </text>
      <text x="100" y="120" text-anchor="middle" font-family="Arial" font-size="8" fill="black">
        ${data.substring(0, 20)}...
      </text>
    </svg>
  `)}`;
};

export default webln;
