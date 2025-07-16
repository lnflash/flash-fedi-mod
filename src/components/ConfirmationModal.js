import React from "react";

const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  details = [],
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmButtonClass = "flash-button",
  cancelButtonClass = "flash-button-secondary",
  loading = false,
}) => {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
  };

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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={handleBackdropClick}>
      <div className="flash-card max-w-md w-full mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="flash-text-h2">{title}</h2>
          {!loading && (
            <button onClick={handleClose} className="text-text02 hover:text-text01 transition-colors">
              ✕
            </button>
          )}
        </div>

        {/* Message */}
        <p className="flash-text-p2 text-text02 mb-4">{message}</p>

        {/* Details */}
        {details.length > 0 && (
          <div className="bg-grey5 rounded-lg p-4 mb-4">
            <div className="space-y-2">
              {details.map((detail, index) => (
                <div key={index} className="flex justify-between">
                  <span className="flash-text-p3 text-text02">{detail.label}:</span>
                  <span className="flash-text-p3 font-medium">{detail.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex space-x-3">
          <button onClick={handleClose} disabled={loading} className={`flex-1 ${cancelButtonClass} disabled:opacity-50 disabled:cursor-not-allowed`}>
            {cancelText}
          </button>
          <button onClick={handleConfirm} disabled={loading} className={`flex-1 ${confirmButtonClass} disabled:opacity-50 disabled:cursor-not-allowed`}>
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Processing...
              </div>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
