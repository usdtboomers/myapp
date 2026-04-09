import React, { useEffect, useState } from "react";
import api from "../../api/userAxios"; // Corrected import for your Axios instance
import { QRCodeCanvas } from "qrcode.react";

export default function DepositModal({ isOpen, onClose }) {
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Fetch the permanent address when the modal opens
  useEffect(() => {
    if (isOpen) {
      fetchDepositAddress();
    } else {
      // Reset state when closed
      setAddress("");
      setLoading(true);
      setCopied(false);
    }
  }, [isOpen]);

  const fetchDepositAddress = async () => {
    try {
      setLoading(true);
      // Calls the backend to get or generate the user's permanent address
      const res = await api.get("/deposit/get-address"); 
      setAddress(res.data.address);
    } catch (err) {
      console.error("Failed to fetch address", err);
      alert("Could not load deposit address. Please try again.");
      onClose(); // Close modal on error
    } finally {
      setLoading(false);
    }
  };

  const copyText = async () => {
    if (!address) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(address);
      } else {
        const ta = document.createElement("textarea");
        ta.value = address;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert("Copy failed. Please copy manually.");
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: "blur(3px)", display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ width: "100%", maxWidth: 400, background: '#fff', borderRadius: 20, padding: 24, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', position: "relative" }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>
            Deposit USDT 
            <span style={{fontSize: "12px", backgroundColor: "#e0f2f1", color: "#00695c", padding: "2px 6px", borderRadius: "4px", marginLeft: "8px", verticalAlign: "middle"}}>BEP-20</span>
          </h2>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 16, background: '#f3f4f6', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#6b7280" }}>
            Loading your secure deposit address...
          </div>
        ) : (
          <div>
            <div style={{ textAlign: "center", color: "#4b5563", fontSize: "14px", marginBottom: "20px" }}>
              Send any amount of USDT to this address. Your account will be credited automatically after network confirmation.
            </div>

            {/* QR Code */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
              <div style={{ padding: 12, background: '#fff', border: '2px solid #e5e7eb', borderRadius: 16 }}>
                <QRCodeCanvas value={address} size={160} />
              </div>
            </div>

            {/* Address Display & Copy */}
            <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', padding: 16, borderRadius: 12, marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>Your Permanent Deposit Address</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  readOnly
                  value={address}
                  onFocus={(e) => e.target.select()}
                  style={{ flex: 1, background: '#fff', padding: '10px', borderRadius: 8, fontSize: 13, border: '1px solid #d1d5db', outline: 'none' }}
                />
                <button 
                  onClick={copyText} 
                  style={{ background: copied ? '#16a34a' : '#2563eb', color: '#fff', border: 'none', padding: '0 16px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', transition: '0.2s' }}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            {/* Warning Note */}
            <div style={{ textAlign: 'center', padding: 12, borderRadius: 8, background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', fontSize: 13, fontWeight: 500 }}>
              ⚠️ Send only USDT via the BNB Smart Chain (BEP-20) network. Sending other assets will result in permanent loss.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}