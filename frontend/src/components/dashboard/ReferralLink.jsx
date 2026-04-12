import React, { useState } from "react";
import { ClipboardCopy, Check } from "lucide-react";

const ReferralLinkBox = ({ link, userId }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000); // Reset after 2s
  };

  const whatsappShare = `https://wa.me/?text=Join%20using%20my%20referral%20link:%20${encodeURIComponent(link)}`;
  const telegramShare = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=Join%20me%20via%20this%20referral%20link`;

  return (
    <div className="mt-4 bg-white p-3 rounded-lg shadow-sm border border-gray-200 text-sm">
      
      {/* Name / Label Add Kiya Hai */}
      <div className="font-semibold text-gray-700 mb-2">
        Referral Link
      </div>

      {/* Input + Copy (same row) */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          readOnly
          value={link}
          onFocus={(e) => e.target.select()}
          className="flex-1 p-2 border border-gray-300 rounded-md text-xs sm:text-sm"
        />
        <button 
          onClick={handleCopy}
          className="flex items-center gap-1 bg-black text-white px-3 py-2 rounded-md hover:bg-emerald-700 transition text-xs sm:text-sm"
        >
          {copied ? (
            <>
              <Check size={16} />
              Copied
            </>
          ) : (
            <>
              <ClipboardCopy size={16} />
              Copy
            </>
          )}
        </button>
      </div>

      {/* Share buttons (QR Hatane ke baad dono ko side-by-side align kar diya) */}
      <div className="flex items-center mt-3 gap-2">
        <a href={whatsappShare} target="_blank" rel="noreferrer" className="flex-1">
          <button className="w-full bg-green-500 text-white px-3 py-2 rounded-md hover:bg-green-600 text-xs sm:text-sm font-medium transition">
            WhatsApp
          </button>
        </a>
        <a href={telegramShare} target="_blank" rel="noreferrer" className="flex-1">
          <button className="w-full bg-blue-500 text-white px-3 py-2 rounded-md hover:bg-blue-600 text-xs sm:text-sm font-medium transition">
            Telegram
          </button>
        </a>
      </div>

    </div>
  );
};

export default ReferralLinkBox;