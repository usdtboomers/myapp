// MessageModal.jsx
import React from "react";

const MessageModal = ({
  isOpen,
  onClose,
  title = "Message",
  message = "",
  type = "info",
  zIndex = 2000, // default z-index
}) => {
  if (!isOpen) return null;

  const colors = {
    success: "text-green-600",
    error: "text-red-600",
    warning: "text-yellow-600",
    info: "text-blue-600",
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4"
      style={{ zIndex }}
    >
      <div className="bg-white rounded-2xl shadow-lg p-4 w-full max-w-sm flex flex-col text-center">
        {/* Title */}
        <h2 className={`text-lg font-semibold mb-2 ${colors[type]}`}>{title}</h2>

        {/* Scrollable message area */}
        <div className="flex-1 overflow-y-auto px-2 max-h-40">
          <p className="text-sm text-gray-700">{message}</p>
        </div>

        {/* OK Button */}
        <button
          onClick={onClose}
          className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-full shadow hover:bg-blue-700 transition text-sm w-full"
        >
          OK
        </button>
      </div>
    </div>
  );
};

export default MessageModal;
