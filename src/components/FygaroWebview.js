import React, { useState, useEffect } from "react";

const FygaroWebview = ({ paymentUrl, isOpen, onClose, onSuccess, onError, onCancel }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && paymentUrl) {
      setLoading(true);
      setError(null);
    }
  }, [isOpen, paymentUrl]);

  const handleLoadStart = () => {
    setLoading(true);
    setError(null);
  };

  const handleLoadEnd = () => {
    setLoading(false);
  };

  const handleError = (e) => {
    setLoading(false);
    setError("Failed to load payment page. Please try again.");
    console.error("Fygaro webview error:", e);
  };

  // Note: handleMessage is defined but not used in current implementation
  // It will be used when Fygaro iframe messaging is implemented
  // const handleMessage = (event) => {
  //   // Handle messages from Fygaro iframe
  //   try {
  //     const data = event.data;

  //     if (data.type === "fygaro_payment_success") {
  //       onSuccess(data);
  //       onClose();
  //     } else if (data.type === "fygaro_payment_error") {
  //       onError(data.error);
  //       onClose();
  //     } else if (data.type === "fygaro_payment_cancel") {
  //       onCancel();
  //       onClose();
  //     }
  //   } catch (error) {
  //     console.error("Error handling Fygaro message:", error);
  //   }
  // };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !loading) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={handleBackdropClick}>
      <div className="flash-card max-w-2xl w-full mx-auto h-96 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-bold mr-3">💳</div>
            <div>
              <h2 className="flash-text-h2">Secure Payment</h2>
              <p className="flash-text-caption">Powered by Fygaro</p>
            </div>
          </div>
          {!loading && (
            <button onClick={handleClose} className="text-text02 hover:text-text01 transition-colors p-2">
              ✕
            </button>
          )}
        </div>

        {/* Webview Container */}
        <div className="flex-1 relative bg-white rounded-lg overflow-hidden">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="flash-text-caption">Loading secure payment page...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
              <div className="text-center p-4">
                <div className="text-error text-4xl mb-2">⚠️</div>
                <p className="flash-text-p2 text-error mb-4">{error}</p>
                <button onClick={() => window.location.reload()} className="flash-button">
                  Try Again
                </button>
              </div>
            </div>
          )}

          {paymentUrl && (
            <iframe
              src={paymentUrl}
              className="w-full h-full border-0"
              onLoadStart={handleLoadStart}
              onLoad={handleLoadEnd}
              onError={handleError}
              title="Fygaro Payment"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation"
            />
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 text-center">
          <p className="flash-text-caption text-text02">🔒 Your payment information is secure and encrypted</p>
          <div className="flex items-center justify-center mt-2 space-x-4">
            <div className="flex items-center">
              <span className="text-green mr-1">✓</span>
              <span className="flash-text-caption">SSL Encrypted</span>
            </div>
            <div className="flex items-center">
              <span className="text-green mr-1">✓</span>
              <span className="flash-text-caption">PCI Compliant</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FygaroWebview;
