import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import flashApi from "../utils/flashApi";

// Create the context
const FlashApiContext = createContext();

// Custom hook to use the Flash API context
export const useFlashApi = () => {
  const context = useContext(FlashApiContext);
  if (!context) {
    throw new Error("useFlashApi must be used within a FlashApiProvider");
  }
  return context;
};

// Provider component
export const FlashApiProvider = ({ children }) => {
  // State management
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [settlements, setSettlements] = useState([]);
  const [topups, setTopups] = useState([]);

  // Initialize authentication state on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Check if we have stored tokens
        const storedToken = localStorage.getItem("flash_token");
        const storedRefreshToken = localStorage.getItem("flash_refresh_token");

        if (storedToken && storedRefreshToken) {
          // Set tokens in API client
          flashApi.token = storedToken;
          flashApi.refreshToken = storedRefreshToken;

          // Check if token is still valid
          if (flashApi.isAuthenticated()) {
            setIsAuthenticated(true);
            // Load user data directly here instead of calling loadUserData
            try {
              setLoading(true);
              setError(null);

              // Load balance
              const balanceData = await flashApi.getBalance();
              setBalance(balanceData.balance || 0);

              // Load recent transactions
              const transactionData = await flashApi.getTransactionHistory(20, 0);
              setTransactions(transactionData);
            } catch (error) {
              console.error("Failed to load user data:", error);
              setError(error.message);
            } finally {
              setLoading(false);
            }
          } else {
            // Try to refresh token
            try {
              await flashApi.refreshAuthToken();
              setIsAuthenticated(true);
              // Load user data directly here instead of calling loadUserData
              try {
                setLoading(true);
                setError(null);

                // Load balance
                const balanceData = await flashApi.getBalance();
                setBalance(balanceData.balance || 0);

                // Load recent transactions
                const transactionData = await flashApi.getTransactionHistory(20, 0);
                setTransactions(transactionData);
              } catch (error) {
                console.error("Failed to load user data:", error);
                setError(error.message);
              } finally {
                setLoading(false);
              }
            } catch (refreshError) {
              // Refresh failed, clear tokens
              flashApi.logout();
              setIsAuthenticated(false);
            }
          }
        }
      } catch (error) {
        console.error("Failed to initialize authentication:", error);
        flashApi.logout();
        setIsAuthenticated(false);
      }
    };

    initializeAuth();
  }, []);

  // Load user data (balance, transactions, etc.)
  const loadUserData = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      setLoading(true);
      setError(null);

      // Load balance
      const balanceData = await flashApi.getBalance();
      setBalance(balanceData.balance || 0);

      // Load recent transactions
      const transactionData = await flashApi.getTransactionHistory(20, 0);
      setTransactions(transactionData);
    } catch (error) {
      console.error("Failed to load user data:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Authentication methods
  const login = useCallback(
    async (username, password) => {
      try {
        setLoading(true);
        setError(null);

        const response = await flashApi.authenticate(username, password);

        setIsAuthenticated(true);
        setUser(response.user || { username });

        // Load user data after successful login
        await loadUserData();

        return response;
      } catch (error) {
        setError(error.message);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [loadUserData]
  );

  // Phone authentication methods
  const requestPhoneCode = useCallback(async (phoneNumber, countryCode = "JM") => {
    try {
      setLoading(true);
      setError(null);

      const response = await flashApi.requestPhoneCode(phoneNumber, countryCode);
      return response;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const verifyPhoneCode = useCallback(
    async (phoneNumber, code) => {
      try {
        setLoading(true);
        setError(null);

        const response = await flashApi.verifyPhoneCode(phoneNumber, code);

        setIsAuthenticated(true);
        setUser(response.me || { phoneNumber });

        // Load user data after successful login
        await loadUserData();

        return response;
      } catch (error) {
        setError(error.message);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [loadUserData]
  );

  const logout = useCallback(() => {
    flashApi.logout();
    setIsAuthenticated(false);
    setUser(null);
    setBalance(0);
    setTransactions([]);
    setSettlements([]);
    setTopups([]);
    setError(null);
  }, []);

  // Send to Flash username
  const sendToUsername = useCallback(async (username, amount, memo = "", currency = "USD") => {
    try {
      setLoading(true);
      setError(null);

      const response = await flashApi.sendToUsername(username, amount, memo, currency);

      // Add to transactions
      const newTransaction = {
        id: response.transaction_id || Date.now(),
        type: "send",
        amount: amount,
        recipient: username,
        memo: memo,
        timestamp: new Date().toISOString(),
        status: "confirmed",
        currency: currency,
        transactionId: response.transaction_id,
      };

      setTransactions((prev) => [newTransaction, ...prev]);

      // Update balance
      setBalance((prev) => prev - amount);

      return response;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Bank settlement
  const settleToBank = useCallback(async (bankDetails, amount, currency = "USD") => {
    try {
      setLoading(true);
      setError(null);

      const response = await flashApi.settleToBank(bankDetails, amount, currency);

      // Add to settlements
      const newSettlement = {
        id: response.settlement_id || Date.now(),
        type: "settle",
        amount: amount,
        bankDetails: bankDetails,
        timestamp: new Date().toISOString(),
        status: "pending",
        currency: currency,
        settlementId: response.settlement_id,
      };

      setSettlements((prev) => [newSettlement, ...prev]);

      // Update balance
      setBalance((prev) => prev - amount);

      return response;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get settlement status
  const getSettlementStatus = useCallback(async (settlementId) => {
    try {
      const response = await flashApi.getSettlementStatus(settlementId);

      // Update settlement status
      setSettlements((prev) => prev.map((settlement) => (settlement.settlementId === settlementId ? { ...settlement, status: response.status } : settlement)));

      return response;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  }, []);

  // Bank top up
  const topupBank = useCallback(async (bankDetails, amount, currency = "USD") => {
    try {
      setLoading(true);
      setError(null);

      const response = await flashApi.topupBank(bankDetails, amount, currency);

      // Add to topups
      const newTopup = {
        id: response.topup_id || Date.now(),
        type: "topup_bank",
        amount: amount,
        bankDetails: bankDetails,
        timestamp: new Date().toISOString(),
        status: "pending",
        currency: currency,
        topupId: response.topup_id,
      };

      setTopups((prev) => [newTopup, ...prev]);

      return response;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Fygaro card top up
  const topupCard = useCallback(async (amount, currency = "USD") => {
    try {
      setLoading(true);
      setError(null);

      const response = await flashApi.getFygaroPaymentLink(amount, currency);

      // Add to topups
      const newTopup = {
        id: Date.now(),
        type: "topup_card",
        amount: amount,
        timestamp: new Date().toISOString(),
        status: "pending",
        currency: currency,
        paymentUrl: response.payment_url,
      };

      setTopups((prev) => [newTopup, ...prev]);

      return response;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get top up status
  const getTopupStatus = useCallback(async (topupId) => {
    try {
      const response = await flashApi.getTopupStatus(topupId);

      // Update topup status
      setTopups((prev) => prev.map((topup) => (topup.topupId === topupId ? { ...topup, status: response.status } : topup)));

      // If topup is successful, update balance
      if (response.status === "completed") {
        setBalance((prev) => prev + response.amount);
      }

      return response;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  }, []);

  // Utility methods
  const refreshBalance = useCallback(async () => {
    try {
      const balanceData = await flashApi.getBalance();
      setBalance(balanceData.balance || 0);
    } catch (error) {
      setError(error.message);
    }
  }, []);

  const refreshTransactions = useCallback(async () => {
    try {
      const transactionData = await flashApi.getTransactionHistory(20, 0);
      setTransactions(transactionData);
    } catch (error) {
      setError(error.message);
    }
  }, []);

  const getSupportedBanks = useCallback(async () => {
    try {
      return await flashApi.getSupportedBanks();
    } catch (error) {
      setError(error.message);
      throw error;
    }
  }, []);

  const validateBankAccount = useCallback(async (bankCode, accountNumber) => {
    try {
      return await flashApi.validateBankAccount(bankCode, accountNumber);
    } catch (error) {
      setError(error.message);
      throw error;
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Check if features are enabled
  const isFeatureEnabled = useCallback((feature) => {
    return flashApi.isFeatureEnabled(feature);
  }, []);

  const getEnabledFeatures = useCallback(() => {
    return flashApi.getEnabledFeatures();
  }, []);

  // Context value
  const value = {
    // State
    isAuthenticated,
    user,
    balance,
    transactions,
    settlements,
    topups,
    loading,
    error,

    // Authentication
    login,
    logout,
    requestPhoneCode,
    verifyPhoneCode,

    // API methods
    sendToUsername,
    settleToBank,
    getSettlementStatus,
    topupBank,
    topupCard,
    getTopupStatus,

    // Utility methods
    refreshBalance,
    refreshTransactions,
    getSupportedBanks,
    validateBankAccount,
    clearError,
    isFeatureEnabled,
    getEnabledFeatures,

    // Load user data
    loadUserData,
  };

  return <FlashApiContext.Provider value={value}>{children}</FlashApiContext.Provider>;
};

export default FlashApiContext;
