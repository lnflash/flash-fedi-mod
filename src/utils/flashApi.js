/**
 * Flash API Client
 * Handles all communication with Flash API endpoints
 */

// Error codes for consistent error handling
export const ERROR_CODES = {
  INVALID_USERNAME: "INVALID_USERNAME",
  INSUFFICIENT_BALANCE: "INSUFFICIENT_BALANCE",
  INVALID_BANK_ACCOUNT: "INVALID_BANK_ACCOUNT",
  PAYMENT_FAILED: "PAYMENT_FAILED",
  NETWORK_ERROR: "NETWORK_ERROR",
  AUTHENTICATION_FAILED: "AUTHENTICATION_FAILED",
  RATE_LIMITED: "RATE_LIMITED",
  INVALID_AMOUNT: "INVALID_AMOUNT",
  USER_NOT_FOUND: "USER_NOT_FOUND",
  BANK_API_ERROR: "BANK_API_ERROR",
  SETTLEMENT_LIMIT_EXCEEDED: "SETTLEMENT_LIMIT_EXCEEDED",
};

// Custom error class for Flash API errors
export class FlashApiError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = "FlashApiError";
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
};

class FlashApiClient {
  constructor(baseUrl, apiKey = null) {
    // Always use the environment variable if it's set, otherwise fall back to the provided baseUrl
    this.baseUrl = process.env.REACT_APP_FLASH_API_BASE_URL || baseUrl || "https://api.flashapp.me";
    this.apiKey = apiKey || process.env.REACT_APP_FLASH_API_KEY;
    this.token = process.env.REACT_APP_FLASH_AUTH_TOKEN || null; // Bearer token from environment
    this.refreshToken = null;
    this.tokenExpiry = null;

    // Feature flags
    this.features = {
      flashSend: process.env.REACT_APP_ENABLE_FLASH_SEND === "true",
      bankSettle: process.env.REACT_APP_ENABLE_BANK_SETTLE === "true",
      bankTopup: process.env.REACT_APP_ENABLE_BANK_TOPUP === "true",
      fygaroTopup: process.env.REACT_APP_ENABLE_FYGARO_TOPUP === "true",
    };
  }

  /**
   * Helper method to make GraphQL requests
   */
  async makeGraphQLRequest(query, variables = {}, retryCount = 0) {
    const url = `${this.baseUrl}/graphql`;

    // Prepare headers
    const headers = {
      "Content-Type": "application/json",
    };

    // Add authentication headers
    if (this.token) {
      // Ensure proper Bearer token format for GraphQL
      if (this.token.startsWith("Bearer ")) {
        headers["Authorization"] = this.token;
      } else if (this.token.startsWith("ory_")) {
        // Flash API uses "ory_" prefix tokens
        headers["Authorization"] = `Bearer ${this.token}`;
      } else {
        headers["Authorization"] = `Bearer ${this.token}`;
      }
    }

    if (this.apiKey) {
      headers["X-API-Key"] = this.apiKey;
    }

    const config = {
      method: "POST",
      headers,
      body: JSON.stringify({
        query,
        variables,
      }),
    };

    try {
      const response = await fetch(url, config);

      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = response.headers.get("Retry-After") || 60;
        throw new FlashApiError("Rate limited. Please try again later.", ERROR_CODES.RATE_LIMITED, { retryAfter: parseInt(retryAfter) });
      }

      // Handle authentication errors
      if (response.status === 401) {
        // Try to refresh token if we have one
        if (this.refreshToken && retryCount === 0) {
          await this.refreshAuthToken();
          return this.makeGraphQLRequest(query, variables, retryCount + 1);
        }
        throw new FlashApiError("Authentication failed. Please log in again.", ERROR_CODES.AUTHENTICATION_FAILED);
      }

      // Handle other HTTP errors
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new FlashApiError(
          errorData.message || `HTTP ${response.status}: ${response.statusText}`,
          this.mapHttpStatusToErrorCode(response.status),
          errorData
        );
      }

      const result = await response.json();

      // Handle GraphQL errors
      if (result.errors && result.errors.length > 0) {
        const error = result.errors[0];
        throw new FlashApiError(error.message || "GraphQL error occurred", error.extensions?.code || ERROR_CODES.NETWORK_ERROR, error);
      }

      return result.data;
    } catch (error) {
      // Handle network errors with retry logic
      if (error.name === "TypeError" && retryCount < RETRY_CONFIG.maxRetries) {
        const delay = Math.min(RETRY_CONFIG.baseDelay * Math.pow(2, retryCount), RETRY_CONFIG.maxDelay);

        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.makeGraphQLRequest(query, variables, retryCount + 1);
      }

      // Re-throw FlashApiError instances
      if (error instanceof FlashApiError) {
        throw error;
      }

      // Wrap other errors
      throw new FlashApiError(error.message || "Network error occurred", ERROR_CODES.NETWORK_ERROR, { originalError: error });
    }
  }

  /**
   * Helper method to make unauthenticated GraphQL requests (for OTP, etc.)
   */
  async makeUnauthenticatedGraphQLRequest(query, variables = {}, retryCount = 0) {
    const url = `${this.baseUrl}/graphql`;

    // Prepare headers (no authentication)
    const headers = {
      "Content-Type": "application/json",
    };

    // Only add API key if available (for rate limiting, etc.)
    if (this.apiKey) {
      headers["X-API-Key"] = this.apiKey;
    }

    const config = {
      method: "POST",
      headers,
      body: JSON.stringify({
        query,
        variables,
      }),
    };

    try {
      const response = await fetch(url, config);

      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = response.headers.get("Retry-After") || 60;
        throw new FlashApiError("Rate limited. Please try again later.", ERROR_CODES.RATE_LIMITED, { retryAfter: parseInt(retryAfter) });
      }

      // Handle other HTTP errors
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("GraphQL HTTP Error Response:", {
          status: response.status,
          statusText: response.statusText,
          errorData: errorData,
          url: url,
          query: query,
          variables: variables,
        });
        throw new FlashApiError(
          errorData.message || `HTTP ${response.status}: ${response.statusText}`,
          this.mapHttpStatusToErrorCode(response.status),
          errorData
        );
      }

      const result = await response.json();

      // Handle GraphQL errors
      if (result.errors && result.errors.length > 0) {
        const error = result.errors[0];
        console.error("GraphQL Error Response:", {
          errors: result.errors,
          data: result.data,
          query: query,
          variables: variables,
        });
        throw new FlashApiError(error.message || "GraphQL error occurred", error.extensions?.code || ERROR_CODES.NETWORK_ERROR, error);
      }

      return result.data;
    } catch (error) {
      // Handle network errors with retry logic
      if (error.name === "TypeError" && retryCount < RETRY_CONFIG.maxRetries) {
        const delay = Math.min(RETRY_CONFIG.baseDelay * Math.pow(2, retryCount), RETRY_CONFIG.maxDelay);

        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.makeUnauthenticatedGraphQLRequest(query, variables, retryCount + 1);
      }

      // Re-throw FlashApiError instances
      if (error instanceof FlashApiError) {
        throw error;
      }

      // Wrap other errors
      throw new FlashApiError(error.message || "Network error occurred", ERROR_CODES.NETWORK_ERROR, { originalError: error });
    }
  }

  /**
   * Helper method to make HTTP requests with retry logic (for non-GraphQL endpoints)
   */
  async makeRequest(endpoint, options = {}, retryCount = 0) {
    const url = `${this.baseUrl}${endpoint}`;

    // Prepare headers
    const headers = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    // Add authentication headers
    if (this.token) {
      // Check if token already has "Bearer " prefix
      if (this.token.startsWith("Bearer ")) {
        headers["Authorization"] = this.token;
      } else {
        headers["Authorization"] = `Bearer ${this.token}`;
      }
    }

    if (this.apiKey) {
      headers["X-API-Key"] = this.apiKey;
    }

    const config = {
      method: options.method || "GET",
      headers,
      ...options,
    };

    try {
      const response = await fetch(url, config);

      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = response.headers.get("Retry-After") || 60;
        throw new FlashApiError("Rate limited. Please try again later.", ERROR_CODES.RATE_LIMITED, { retryAfter: parseInt(retryAfter) });
      }

      // Handle authentication errors
      if (response.status === 401) {
        // Try to refresh token if we have one
        if (this.refreshToken && retryCount === 0) {
          await this.refreshAuthToken();
          return this.makeRequest(endpoint, options, retryCount + 1);
        }
        throw new FlashApiError("Authentication failed. Please log in again.", ERROR_CODES.AUTHENTICATION_FAILED);
      }

      // Handle other HTTP errors
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new FlashApiError(
          errorData.message || `HTTP ${response.status}: ${response.statusText}`,
          this.mapHttpStatusToErrorCode(response.status),
          errorData
        );
      }

      return await response.json();
    } catch (error) {
      // Handle network errors with retry logic
      if (error.name === "TypeError" && retryCount < RETRY_CONFIG.maxRetries) {
        const delay = Math.min(RETRY_CONFIG.baseDelay * Math.pow(2, retryCount), RETRY_CONFIG.maxDelay);

        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.makeRequest(endpoint, options, retryCount + 1);
      }

      // Re-throw FlashApiError instances
      if (error instanceof FlashApiError) {
        throw error;
      }

      // Wrap other errors
      throw new FlashApiError(error.message || "Network error occurred", ERROR_CODES.NETWORK_ERROR, { originalError: error });
    }
  }

  /**
   * Map HTTP status codes to error codes
   */
  mapHttpStatusToErrorCode(status) {
    const statusMap = {
      400: ERROR_CODES.INVALID_AMOUNT,
      401: ERROR_CODES.AUTHENTICATION_FAILED,
      403: ERROR_CODES.INSUFFICIENT_BALANCE,
      404: ERROR_CODES.USER_NOT_FOUND,
      429: ERROR_CODES.RATE_LIMITED,
      500: ERROR_CODES.BANK_API_ERROR,
      502: ERROR_CODES.BANK_API_ERROR,
      503: ERROR_CODES.BANK_API_ERROR,
    };
    return statusMap[status] || ERROR_CODES.NETWORK_ERROR;
  }

  /**
   * Authentication methods
   */
  async authenticate(username, password) {
    try {
      const response = await this.makeRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });

      this.token = response.access_token;
      this.refreshToken = response.refresh_token;
      this.tokenExpiry = new Date(Date.now() + response.expires_in * 1000);

      // Store tokens securely (consider using httpOnly cookies in production)
      localStorage.setItem("flash_token", this.token);
      localStorage.setItem("flash_refresh_token", this.refreshToken);

      return response;
    } catch (error) {
      throw new FlashApiError("Authentication failed. Please check your credentials.", ERROR_CODES.AUTHENTICATION_FAILED, { originalError: error });
    }
  }

  /**
   * Phone authentication methods
   */
  async requestPhoneCode(phoneNumber, countryCode = "JM") {
    try {
      // Format phone number to international format
      let formattedPhone = phoneNumber;

      // Remove any non-digit characters except +
      formattedPhone = formattedPhone.replace(/[^\d+]/g, "");

      // If it doesn't start with +, add the country code
      if (!formattedPhone.startsWith("+")) {
        // Add country code based on the countryCode parameter
        const countryCallingCodes = {
          JM: "+1", // Jamaica
          US: "+1", // United States
          CA: "+1", // Canada
          GB: "+44", // United Kingdom
          SV: "+503", // El Salvador
          // Add more as needed
        };

        const callingCode = countryCallingCodes[countryCode] || "+1";
        formattedPhone = callingCode + formattedPhone;
      }

      console.log("Formatted phone number:", formattedPhone);

      // Use captchaRequestAuthCode mutation (requires captcha validation)
      const query = `
        mutation CaptchaRequestAuthCode($input: CaptchaRequestAuthCodeInput!) {
          captchaRequestAuthCode(input: $input) {
            success
            errors {
              message
              code
            }
          }
        }
      `;

      // For testing purposes, use mock captcha values
      // In production, these should come from a real captcha service
      const variables = {
        input: {
          phone: formattedPhone,
          channel: "SMS", // or "WHATSAPP"
          challengeCode: "mock_challenge_code",
          validationCode: "mock_validation_code",
          secCode: "mock_sec_code",
        },
      };

      const response = await this.makeUnauthenticatedGraphQLRequest(query, variables);
      return response.captchaRequestAuthCode;
    } catch (error) {
      throw new FlashApiError("Failed to send verification code. Please try again.", ERROR_CODES.AUTHENTICATION_FAILED, { originalError: error });
    }
  }

  async verifyPhoneCode(phoneNumber, code) {
    try {
      // Format phone number to international format (same as requestPhoneCode)
      let formattedPhone = phoneNumber;

      // Remove any non-digit characters except +
      formattedPhone = formattedPhone.replace(/[^\d+]/g, "");

      // If it doesn't start with +, add the country code (default to JM)
      if (!formattedPhone.startsWith("+")) {
        const countryCallingCodes = {
          JM: "+1", // Jamaica
          US: "+1", // United States
          CA: "+1", // Canada
          GB: "+44", // United Kingdom
          SV: "+503", // El Salvador
        };

        const callingCode = countryCallingCodes["JM"] || "+1";
        formattedPhone = callingCode + formattedPhone;
      }

      console.log("Verifying phone number:", formattedPhone);

      // Use userLogin mutation (unauthenticated) for code verification
      const query = `
        mutation UserLogin($input: UserLoginInput!) {
          userLogin(input: $input) {
            authToken
            totpRequired
            errors {
              message
              code
            }
          }
        }
      `;

      const variables = {
        input: {
          phone: formattedPhone,
          code: code,
        },
      };

      const response = await this.makeUnauthenticatedGraphQLRequest(query, variables);
      const result = response.userLogin;

      if (result.errors && result.errors.length > 0) {
        const errorMessage = result.errors[0].message || "Verification failed";
        throw new FlashApiError(errorMessage, ERROR_CODES.AUTHENTICATION_FAILED);
      }

      if (result.authToken) {
        // Store auth token
        this.token = result.authToken;
        this.tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        // Store token securely
        if (typeof window !== "undefined" && window.localStorage) {
          localStorage.setItem("flash_token", this.token);
        }

        // Get user info using the auth token
        try {
          const userQuery = `
            query Me {
              me {
                id
                username
                phone
              }
            }
          `;

          const userResponse = await this.makeGraphQLRequest(userQuery);
          if (userResponse.me) {
            this.user = userResponse.me;
            localStorage.setItem("flash_user", JSON.stringify(userResponse.me));
          }
        } catch (userError) {
          console.warn("Failed to fetch user info:", userError);
          // Don't fail the login if we can't get user info
        }

        return {
          authToken: result.authToken,
          totpRequired: result.totpRequired,
          me: this.user,
        };
      } else {
        throw new FlashApiError("Verification failed", ERROR_CODES.AUTHENTICATION_FAILED);
      }
    } catch (error) {
      if (error instanceof FlashApiError) {
        throw error;
      }
      throw new FlashApiError("Failed to verify code. Please try again.", ERROR_CODES.AUTHENTICATION_FAILED, { originalError: error });
    }
  }

  async refreshAuthToken() {
    if (!this.refreshToken) {
      throw new FlashApiError("No refresh token available", ERROR_CODES.AUTHENTICATION_FAILED);
    }

    try {
      const response = await this.makeRequest("/auth/refresh", {
        method: "POST",
        body: JSON.stringify({ refresh_token: this.refreshToken }),
      });

      this.token = response.access_token;
      this.refreshToken = response.refresh_token;
      this.tokenExpiry = new Date(Date.now() + response.expires_in * 1000);

      localStorage.setItem("flash_token", this.token);
      localStorage.setItem("flash_refresh_token", this.refreshToken);

      return response;
    } catch (error) {
      // Clear invalid tokens
      this.logout();
      throw new FlashApiError("Token refresh failed. Please log in again.", ERROR_CODES.AUTHENTICATION_FAILED);
    }
  }

  logout() {
    this.token = null;
    this.refreshToken = null;
    this.tokenExpiry = null;
    localStorage.removeItem("flash_token");
    localStorage.removeItem("flash_refresh_token");
  }

  isAuthenticated() {
    return !!this.token && (!this.tokenExpiry || this.tokenExpiry > new Date());
  }

  /**
   * Send to Flash username methods
   */
  async sendToUsername(username, amount, memo = "", currency = "USD") {
    if (!this.features.flashSend) {
      throw new FlashApiError("Send to Flash feature is not enabled", ERROR_CODES.NETWORK_ERROR);
    }

    // Validate inputs
    if (!username || username.length < 3 || username.length > 20) {
      throw new FlashApiError("Invalid username format. Must be 3-20 characters.", ERROR_CODES.INVALID_USERNAME);
    }

    if (!amount || amount <= 0) {
      throw new FlashApiError("Invalid amount. Must be greater than 0.", ERROR_CODES.INVALID_AMOUNT);
    }

    if (memo && memo.length > 500) {
      throw new FlashApiError("Memo too long. Maximum 500 characters.", ERROR_CODES.INVALID_AMOUNT);
    }

    try {
      const response = await this.makeRequest("/flash/send-to-username", {
        method: "POST",
        body: JSON.stringify({
          username,
          amount,
          memo,
          currency,
        }),
      });

      return response;
    } catch (error) {
      if (error.code === ERROR_CODES.USER_NOT_FOUND) {
        throw new FlashApiError(`User "${username}" not found. Please check the username and try again.`, ERROR_CODES.USER_NOT_FOUND);
      }
      throw error;
    }
  }

  /**
   * Bank settlement methods
   */
  async settleToBank(bankDetails, amount, currency = "USD") {
    if (!this.features.bankSettle) {
      throw new FlashApiError("Bank settlement feature is not enabled", ERROR_CODES.NETWORK_ERROR);
    }

    // Validate bank details
    if (!bankDetails.bank_code || !bankDetails.account_number || !bankDetails.account_name) {
      throw new FlashApiError("Invalid bank details. Please provide bank code, account number, and account name.", ERROR_CODES.INVALID_BANK_ACCOUNT);
    }

    if (!amount || amount <= 0) {
      throw new FlashApiError("Invalid amount. Must be greater than 0.", ERROR_CODES.INVALID_AMOUNT);
    }

    try {
      const response = await this.makeRequest("/flash/settle-to-bank", {
        method: "POST",
        body: JSON.stringify({
          bank_code: bankDetails.bank_code,
          account_number: bankDetails.account_number,
          account_name: bankDetails.account_name,
          amount,
          currency,
        }),
      });

      return response;
    } catch (error) {
      if (error.code === ERROR_CODES.SETTLEMENT_LIMIT_EXCEEDED) {
        throw new FlashApiError("Settlement amount exceeds daily limit. Please try a smaller amount.", ERROR_CODES.SETTLEMENT_LIMIT_EXCEEDED);
      }
      throw error;
    }
  }

  async getSettlementStatus(settlementId) {
    if (!this.features.bankSettle) {
      throw new FlashApiError("Bank settlement feature is not enabled", ERROR_CODES.NETWORK_ERROR);
    }

    try {
      const response = await this.makeRequest(`/flash/settlement-status/${settlementId}`);
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Top up methods
   */
  async topupBank(bankDetails, amount, currency = "USD") {
    if (!this.features.bankTopup) {
      throw new FlashApiError("Bank top up feature is not enabled", ERROR_CODES.NETWORK_ERROR);
    }

    // Validate bank details
    if (!bankDetails.bank_code || !bankDetails.account_number) {
      throw new FlashApiError("Invalid bank details. Please provide bank code and account number.", ERROR_CODES.INVALID_BANK_ACCOUNT);
    }

    if (!amount || amount <= 0) {
      throw new FlashApiError("Invalid amount. Must be greater than 0.", ERROR_CODES.INVALID_AMOUNT);
    }

    try {
      const response = await this.makeRequest("/flash/topup-bank", {
        method: "POST",
        body: JSON.stringify({
          bank_code: bankDetails.bank_code,
          account_number: bankDetails.account_number,
          amount,
          currency,
        }),
      });

      return response;
    } catch (error) {
      throw error;
    }
  }

  async getFygaroPaymentLink(amount, currency = "USD", returnUrl = null) {
    if (!this.features.fygaroTopup) {
      throw new FlashApiError("Fygaro top up feature is not enabled", ERROR_CODES.NETWORK_ERROR);
    }

    if (!amount || amount <= 0) {
      throw new FlashApiError("Invalid amount. Must be greater than 0.", ERROR_CODES.INVALID_AMOUNT);
    }

    try {
      const response = await this.makeRequest("/flash/fygaro-payment-link", {
        method: "POST",
        body: JSON.stringify({
          amount,
          currency,
          return_url: returnUrl || `${window.location.origin}/topup-success`,
        }),
      });

      return response;
    } catch (error) {
      throw error;
    }
  }

  async getTopupStatus(topupId) {
    try {
      const response = await this.makeRequest(`/flash/topup-status/${topupId}`);
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Utility methods
   */
  async getSupportedBanks() {
    try {
      const response = await this.makeRequest("/flash/supported-banks");
      return response.banks || [];
    } catch (error) {
      throw error;
    }
  }

  async validateBankAccount(bankCode, accountNumber) {
    try {
      const response = await this.makeRequest("/flash/validate-bank-account", {
        method: "POST",
        body: JSON.stringify({
          bank_code: bankCode,
          account_number: accountNumber,
        }),
      });

      return response;
    } catch (error) {
      throw error;
    }
  }

  async getBalance() {
    try {
      const response = await this.makeRequest("/flash/balance");
      return response;
    } catch (error) {
      throw error;
    }
  }

  async getTransactionHistory(limit = 50, offset = 0) {
    try {
      const response = await this.makeRequest(`/flash/transactions?limit=${limit}&offset=${offset}`);
      return response.transactions || [];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Test method to verify API connection
   */
  async testConnection() {
    try {
      console.log("Testing GraphQL API connection...");
      console.log("Base URL:", this.baseUrl);
      console.log("Environment:", process.env.NODE_ENV);

      // Show the actual URL that will be used
      const testUrl = `${this.baseUrl}/graphql`;
      console.log("Test URL:", testUrl);

      // Use a simple query to test connection - this should work even without authentication
      const query = `
        query TestConnection {
          __typename
        }
      `;

      const response = await this.makeUnauthenticatedGraphQLRequest(query);
      console.log("GraphQL API connection successful:", response);
      return response;
    } catch (error) {
      console.error("GraphQL API connection failed:", error);
      throw error;
    }
  }

  /**
   * Test phone authentication endpoints
   */
  async testPhoneAuth() {
    try {
      console.log("Testing phone authentication GraphQL mutations...");

      // Test request phone code mutation
      const testPhone = "876-425-0250";
      const testCountry = "JM";

      console.log("Testing request phone code mutation...");
      const requestResponse = await this.requestPhoneCode(testPhone, testCountry);

      console.log("Request phone code response:", requestResponse);
      return requestResponse;
    } catch (error) {
      console.error("Phone auth test failed:", error);
      throw error;
    }
  }

  /**
   * Feature flag checks
   */
  isFeatureEnabled(feature) {
    return this.features[feature] || false;
  }

  getEnabledFeatures() {
    return Object.keys(this.features).filter((feature) => this.features[feature]);
  }
}

// Create and export a singleton instance
const flashApi = new FlashApiClient();

export default flashApi;
