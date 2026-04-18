import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { CheckCircle, XCircle, Send, ShieldCheck, LogOut, Loader2 } from 'lucide-react'; // Icons ke liye

const TelegramPopup = ({ currentUser }) => {
    const [isVerified, setIsVerified] = useState(true);
    const [isDataLoaded, setIsDataLoaded] = useState(false);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState({ type: '', msg: '' }); // 'success' ya 'error' store karne ke liye

    useEffect(() => {
        if (currentUser && typeof currentUser.isTelegramJoined !== 'undefined') {
            setIsVerified(currentUser.isTelegramJoined);
            setIsDataLoaded(true);
        }
    }, [currentUser]);

    // Auto-stop polling jab verify ho jaye
    useEffect(() => {
        if (!isDataLoaded || isVerified) return;

        const checkStatus = async () => {
            try {
                const idToCheck = currentUser?.userId || currentUser?._id;
                const res = await api.get(`/user/${idToCheck}`);
                if (res.data.user.isTelegramJoined) {
                    setIsVerified(true);
                }
            } catch (error) {}
        };

        const interval = setInterval(checkStatus, 25000);
        return () => clearInterval(interval);
    }, [isVerified, currentUser, isDataLoaded]);

    const handleManualCheck = async () => {
        setLoading(true);
        setStatus({ type: '', msg: '' }); // Purana message clear karo
        try {
            const idToCheck = currentUser?._id || currentUser?.userId;
            const res = await api.get(`/user/${idToCheck}`);

            if (res.data.user.isTelegramJoined) {
                setStatus({ type: 'success', msg: 'Account Verified Successfully! ✅' });
                // 2 second baad popup gayab ho jaye
                setTimeout(() => setIsVerified(true), 2000);
            } else {
                setStatus({ type: 'error', msg: "Verification failed! Please join channel and start the bot first. ❌" });
            }
        } catch (error) {
            setStatus({ type: 'error', msg: 'Connection error. Please try again later.' });
        } finally {
            setLoading(false);
        }
    };

    const handleJoinClick = (e) => {
        e.preventDefault();
        window.location.href = "tg://resolve?domain=usdt_boomers";
        setTimeout(() => { window.open("https://t.me/usdt_boomers", '_blank'); }, 500);
    };

    const handleVerifyClick = () => {
        const botUsername = "Usdt_Boomers_Bot";
        const userId = currentUser?._id || currentUser?.userId;
        window.open(`https://t.me/${botUsername}?start=${userId}`, '_blank');
    };

    const handleLogout = () => {
        localStorage.clear();
        window.location.href = "/login";
    };

    if (!isDataLoaded || isVerified) return null;

    return (
        <div style={overlayStyle}>
            <div style={modalStyle}>
                {/* Header Section */}
                <div style={headerStyle}>
                    <ShieldCheck size={40} color="#229ED9" />
                    <h2 style={titleStyle}>Telegram Verification</h2>
                    <p style={subtitleStyle}>Join our community to unlock your Earnings </p>
                </div>

                {/* Steps Section */}
                <div style={stepsContainer}>
                    <button onClick={handleJoinClick} style={stepButtonStyle}>
                        <span style={stepNumber}>1</span>
                        <span style={stepText}>Join Official Channel</span>
                        <Send size={18} />
                    </button>

                    <button onClick={handleVerifyClick} style={stepButtonStyle}>
                        <span style={stepNumber}>2</span>
                        <span style={stepText}>Start Verification Bot</span>
                        <ShieldCheck size={18} />
                    </button>
                </div>

                <div style={dividerStyle}></div>

                {/* Status Messages (No more window.alerts!) */}
                {status.msg && (
                    <div style={{
                        ...messageBoxStyle,
                        backgroundColor: status.type === 'success' ? '#f0fdf4' : '#fef2f2',
                        color: status.type === 'success' ? '#16a34a' : '#dc2626',
                        border: `1px solid ${status.type === 'success' ? '#bbf7d0' : '#fecaca'}`
                    }}>
                        {status.type === 'success' ? <CheckCircle size={18} /> : <XCircle size={18} />}
                        {status.msg}
                    </div>
                )}

                {/* Main Action Button */}
                <button 
                    onClick={handleManualCheck} 
                    disabled={loading}
                    style={{...verifyButtonStyle, opacity: loading ? 0.7 : 1}}
                >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : "Verify My Status ✅"}
                </button>

                <button onClick={handleLogout} style={logoutButtonStyle}>
                    <LogOut size={14} /> Logout and try later
                </button>
            </div>
        </div>
    );
};

// --- MODERN STYLES ---

const overlayStyle = {
    position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.85)',
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    zIndex: 9999, backdropFilter: 'blur(8px)', padding: '20px'
};

const modalStyle = {
    backgroundColor: '#ffffff', padding: '40px 30px', borderRadius: '24px',
    textAlign: 'center', maxWidth: '400px', width: '100%',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    border: '1px solid #e2e8f0', position: 'relative'
};

const headerStyle = {
    display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '25px'
};

const titleStyle = {
    fontSize: '24px', fontWeight: '850', color: '#0f172a', margin: '15px 0 5px'
};

const subtitleStyle = {
    fontSize: '14px', color: '#64748b', lineHeight: '1.5'
};

const stepsContainer = {
    display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px'
};

const stepButtonStyle = {
    display: 'flex', alignItems: 'center', gap: '15px', padding: '12px 20px',
    backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px',
    cursor: 'pointer', transition: 'all 0.2s ease', color: '#334155', fontWeight: '600'
};

const stepNumber = {
    backgroundColor: '#229ED9', color: '#fff', width: '24px', height: '24px',
    borderRadius: '50%', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center'
};

const stepText = { flex: 1, textAlign: 'left', fontSize: '14px' };

const dividerStyle = { height: '1px', backgroundColor: '#f1f5f9', margin: '20px 0' };

const messageBoxStyle = {
    padding: '12px', borderRadius: '12px', fontSize: '13px', fontWeight: '600',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
    marginBottom: '20px', animation: 'fadeIn 0.3s ease'
};

const verifyButtonStyle = {
    width: '100%', padding: '16px', backgroundColor: '#16a34a', color: '#fff',
    border: 'none', borderRadius: '16px', fontWeight: 'bold', fontSize: '16px',
    cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(22, 163, 74, 0.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
};

const logoutButtonStyle = {
    marginTop: '25px', color: '#94a3b8', background: 'none', border: 'none',
    cursor: 'pointer', fontSize: '13px', fontWeight: '600', display: 'inline-flex',
    alignItems: 'center', gap: '5px'
};

export default TelegramPopup;