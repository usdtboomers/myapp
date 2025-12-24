import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeftCircle, Save, Lock, User, Mail, Smartphone, Wallet, Key } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import MessageModal from '../../components/modals/MessageModal';

function UserProfile() {
  const navigate = useNavigate();
  const { user, updateUser, token } = useAuth();

  /* ================= STATES ================= */
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    mobile: user?.mobile || '',
    walletAddress: user?.walletAddress || '',
  });

  const [profileTxnPassword, setProfileTxnPassword] = useState('');

  const [loginPassword, setLoginPassword] = useState('');
  const [newLoginPassword, setNewLoginPassword] = useState('');

  const [currentTxnPassword, setCurrentTxnPassword] = useState('');
  const [newTxnPassword, setNewTxnPassword] = useState('');

  const [messageModal, setMessageModal] = useState({
    open: false,
    title: '',
    message: '',
    type: 'info',
  });

  const showMessage = (title, message, type = 'info') =>
    setMessageModal({ open: true, title, message, type });

  /* ================= WALLET LOCK LOGIC ================= */
  const walletLockReason = useMemo(() => {
    if (!user) return null;
    if (user.role === 'admin') return null;

    if (
      user.pendingWithdrawals &&
      Object.values(user.pendingWithdrawals).some(v => v > 0)
    ) {
      return '🔒 Wallet address cannot be changed because a withdrawal process has already started.';
    }

    if (
      user.walletAddressChangeCount >= 2 &&
      user.walletAddressChangeWindowStart &&
      Date.now() -
        new Date(user.walletAddressChangeWindowStart).getTime() <
        24 * 60 * 60 * 1000
    ) {
      return '⏳ You can change your wallet address only 2 times within 24 hours.';
    }

    return null;
  }, [user]);

  const isWalletLocked = Boolean(walletLockReason);

  /* ================= HANDLERS ================= */
  const handleChange = e => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSaveProfile = async () => {
    if (!profileTxnPassword) {
      return showMessage(
        'Transaction Password Required',
        'Please enter your transaction password to update profile.',
        'warning'
      );
    }

    if (isWalletLocked && formData.walletAddress !== user.walletAddress) {
      return showMessage('Wallet Address Locked', walletLockReason, 'error');
    }

    try {
      const payload = {
        ...formData,
        oldTxnPassword: profileTxnPassword,
      };

      const res = await axios.put(
        `http://143.198.205.94:5000/api/user/${user.userId}`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      updateUser(res.data.user || res.data);
      setProfileTxnPassword('');

      showMessage(
        'Profile Updated Successfully ✅',
        'Your profile has been updated successfully.',
        'success'
      );
    } catch (err) {
      showMessage(
        err.response?.status === 403 ? 'Update Blocked 🚫' : 'Error',
        err.response?.data?.message ||
          'Profile update blocked due to security rules.',
        'error'
      );
    }
  };

  const handleChangePassword = async type => {
    let payload;

    if (type === 'login') {
      if (!loginPassword || !newLoginPassword) {
        return showMessage(
          'Missing Fields',
          'Please enter current and new login password.',
          'warning'
        );
      }
      payload = { oldPassword: loginPassword, newPassword: newLoginPassword };
    } else {
      if (!currentTxnPassword || !newTxnPassword) {
        return showMessage(
          'Missing Fields',
          'Please enter current and new transaction password.',
          'warning'
        );
      }
      payload = {
        oldTxnPassword: currentTxnPassword,
        newTxnPassword,
      };
    }

    try {
      await axios.put(
        `http://143.198.205.94:5000/api/user/change-password/${user.userId}`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      showMessage(
        'Password Updated 🔐',
        'Your password has been changed successfully.',
        'success'
      );

      if(type === 'login') {
          setLoginPassword('');
          setNewLoginPassword('');
      } else {
          setCurrentTxnPassword('');
          setNewTxnPassword('');
      }
    } catch (err) {
      showMessage(
        'Error',
        err.response?.data?.message || 'Password update failed.',
        'error'
      );
    }
  };

  /* ================= INLINE STYLES ================= */
  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: '#0f172a',
      color: '#e2e8f0',
      padding: '24px',
      fontFamily: 'sans-serif',
    },
    backButton: {
      display: 'flex',
      alignItems: 'center',
      color: '#94a3b8',
      background: 'transparent',
      border: 'none',
      fontSize: '16px',
      cursor: 'pointer',
      marginBottom: '24px',
      fontWeight: '500',
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: '24px',
      maxWidth: '1200px',
      margin: '0 auto',
    },
    card: {
      backgroundColor: '#1e293b',
      border: '1px solid #334155',
      borderRadius: '16px',
      padding: '24px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)',
    },
    cardHeader: {
      fontSize: '18px',
      fontWeight: 'bold',
      color: 'white',
      marginBottom: '20px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      borderBottom: '1px solid #334155',
      paddingBottom: '12px',
    },
    avatarCircle: {
      width: '80px',
      height: '80px',
      borderRadius: '50%',
      background: 'linear-gradient(135deg, #eab308 0%, #a16207 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '32px',
      fontWeight: 'bold',
      color: 'white',
      margin: '0 auto 16px auto',
      boxShadow: '0 4px 10px rgba(234, 179, 8, 0.3)',
    },
    profileName: {
      textAlign: 'center',
      fontSize: '20px',
      fontWeight: 'bold',
      color: 'white',
      margin: '0',
    },
    profileEmail: {
      textAlign: 'center',
      fontSize: '14px',
      color: '#94a3b8',
      marginTop: '4px',
    },
    infoRow: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: '12px 0',
      borderBottom: '1px solid #334155',
      fontSize: '14px',
    },
    infoLabel: {
      color: '#94a3b8',
      fontWeight: 'bold',
    },
    infoValue: {
      color: '#facc15', // Gold
      fontFamily: 'monospace',
      fontWeight: 'bold',
    },
    inputGroup: {
      marginBottom: '16px',
    },
    label: {
      display: 'block',
      fontSize: '12px',
      color: '#94a3b8',
      fontWeight: 'bold',
      textTransform: 'uppercase',
      marginBottom: '6px',
      marginLeft: '4px',
    },
    inputWrapper: {
      display: 'flex',
      alignItems: 'center',
      backgroundColor: '#0f172a',
      border: '1px solid #475569',
      borderRadius: '10px',
      padding: '0 12px',
    },
    icon: {
      color: '#64748b',
      marginRight: '10px',
    },
    input: {
      flex: 1,
      backgroundColor: 'transparent',
      border: 'none',
      color: 'white',
      padding: '12px 0',
      fontSize: '14px',
      outline: 'none',
    },
    saveButton: {
      width: '100%',
      padding: '14px',
      marginTop: '16px',
      background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)', // Emerald
      color: 'white',
      border: 'none',
      borderRadius: '10px',
      fontWeight: 'bold',
      fontSize: '16px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      boxShadow: '0 4px 6px rgba(16, 185, 129, 0.2)',
    },
    updateButton: {
      width: '100%',
      padding: '12px',
      marginTop: '10px',
      backgroundColor: '#3b82f6', // Blue
      color: 'white',
      border: 'none',
      borderRadius: '10px',
      fontWeight: 'bold',
      cursor: 'pointer',
      fontSize: '14px',
    },
    updateButtonTxn: {
      width: '100%',
      padding: '12px',
      marginTop: '10px',
      backgroundColor: '#8b5cf6', // Purple
      color: 'white',
      border: 'none',
      borderRadius: '10px',
      fontWeight: 'bold',
      cursor: 'pointer',
      fontSize: '14px',
    },
    warningBox: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        color: '#fca5a5',
        padding: '10px',
        borderRadius: '8px',
        fontSize: '12px',
        marginTop: '8px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
    }
  };

  if (!user) {
    return (
        <div style={{...styles.container, display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
            Please login first.
        </div>
    );
  }

  return (
    <div style={styles.container}>
      
      {/* Back Button */}
      <button onClick={() => navigate('/dashboard')} style={styles.backButton}>
         <ArrowLeftCircle size={20} style={{marginRight: '8px'}} /> Back to Dashboard
      </button>

      <div style={styles.grid}>
         
         {/* LEFT: Profile Info Card */}
         <div style={{...styles.card, height: 'fit-content'}}>
             <div style={styles.avatarCircle}>
                 {user.name?.charAt(0).toUpperCase() || "U"}
             </div>
             <h2 style={styles.profileName}>{user.name}</h2>
             <p style={styles.profileEmail}>{user.email}</p>
             <br/>
             <div style={{backgroundColor: '#0f172a', padding: '16px', borderRadius: '12px', border: '1px solid #334155'}}>
                 <div style={styles.infoRow}>
                    <span style={styles.infoLabel}>User ID</span>
                    <span style={styles.infoValue}>{user.userId}</span>
                 </div>
                 <div style={{...styles.infoRow, borderBottom: 'none'}}>
                    <span style={styles.infoLabel}>Sponsor ID</span>
                    <span style={{...styles.infoValue, color: 'white'}}>{user.sponsorId || 'N/A'}</span>
                 </div>
             </div>
         </div>

         {/* CENTER: Edit Profile Form */}
         <div style={styles.card}>
            <div style={styles.cardHeader}>
               <User size={20} color="#eab308" /> Personal Details
            </div>
            
            <div style={styles.inputGroup}>
               <label style={styles.label}>Full Name</label>
               <div style={styles.inputWrapper}>
                  <User size={16} style={styles.icon} />
                  <input name="name" value={formData.name} onChange={handleChange} style={styles.input} />
               </div>
            </div>

            <div style={styles.inputGroup}>
               <label style={styles.label}>Email</label>
               <div style={styles.inputWrapper}>
                  <Mail size={16} style={styles.icon} />
                  <input name="email" value={formData.email} onChange={handleChange} style={styles.input} />
               </div>
            </div>

            <div style={styles.inputGroup}>
               <label style={styles.label}>Mobile</label>
               <div style={styles.inputWrapper}>
                  <Smartphone size={16} style={styles.icon} />
                  <input name="mobile" value={formData.mobile} onChange={handleChange} style={styles.input} />
               </div>
            </div>

            <div style={styles.inputGroup}>
               <label style={styles.label}>USDT Wallet Address (BEP20)</label>
               <div style={{...styles.inputWrapper, opacity: isWalletLocked ? 0.5 : 1}}>
                  <Wallet size={16} style={styles.icon} />
                  <input 
                    name="walletAddress" 
                    value={formData.walletAddress} 
                    onChange={handleChange} 
                    disabled={isWalletLocked}
                    style={{...styles.input, cursor: isWalletLocked ? 'not-allowed' : 'text'}} 
                   />
               </div>
               {isWalletLocked && (
                 <div style={styles.warningBox}>
                    <Lock size={14} /> {walletLockReason}
                 </div>
               )}
            </div>

            <div style={{marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #334155'}}>
                <label style={styles.label}>Confirm with Transaction Password</label>
                <div style={styles.inputWrapper}>
                   <Key size={16} style={styles.icon} />
                   <input 
                     type="password" 
                     placeholder="Enter Transaction Password"
                     value={profileTxnPassword} 
                     onChange={e => setProfileTxnPassword(e.target.value)} 
                     style={styles.input} 
                    />
                </div>
                <button onClick={handleSaveProfile} style={styles.saveButton}>
                   <Save size={18} /> Save Changes
                </button>
            </div>
         </div>

         {/* RIGHT: Security Settings */}
         <div style={{display: 'flex', flexDirection: 'column', gap: '24px'}}>
             
             {/* Login Password Card */}
             <div style={styles.card}>
                 <div style={styles.cardHeader}>
                    <Key size={20} color="#3b82f6" /> Login Password
                 </div>
                 <div style={styles.inputGroup}>
                    <input 
                      type="password" 
                      placeholder="Current Password" 
                      value={loginPassword} 
                      onChange={e => setLoginPassword(e.target.value)} 
                      style={styles.inputWrapper} 
                      className="w-full text-white p-3 bg-[#0f172a] rounded-lg border border-slate-600 outline-none"
                    />
                 </div>
                 <div style={styles.inputGroup}>
                    <input 
                      type="password" 
                      placeholder="New Password" 
                      value={newLoginPassword} 
                      onChange={e => setNewLoginPassword(e.target.value)} 
                      style={styles.inputWrapper} 
                      className="w-full text-white p-3 bg-[#0f172a] rounded-lg border border-slate-600 outline-none"
                    />
                 </div>
                 <button onClick={() => handleChangePassword('login')} style={styles.updateButton}>
                    Update Login Password
                 </button>
             </div>

             {/* Transaction Password Card */}
             <div style={styles.card}>
                 <div style={styles.cardHeader}>
                    <Lock size={20} color="#8b5cf6" /> Transaction Password
                 </div>
                 <div style={styles.inputGroup}>
                    <input 
                      type="password" 
                      placeholder="Current Txn Password" 
                      value={currentTxnPassword} 
                      onChange={e => setCurrentTxnPassword(e.target.value)} 
                      style={styles.inputWrapper} 
                      className="w-full text-white p-3 bg-[#0f172a] rounded-lg border border-slate-600 outline-none"
                    />
                 </div>
                 <div style={styles.inputGroup}>
                    <input 
                      type="password" 
                      placeholder="New Txn Password" 
                      value={newTxnPassword} 
                      onChange={e => setNewTxnPassword(e.target.value)} 
                      style={styles.inputWrapper} 
                      className="w-full text-white p-3 bg-[#0f172a] rounded-lg border border-slate-600 outline-none"
                    />
                 </div>
                 <button onClick={() => handleChangePassword('txn')} style={styles.updateButtonTxn}>
                    Update Txn Password
                 </button>
             </div>

         </div>

      </div>

      <MessageModal
        isOpen={messageModal.open}
        onClose={() => setMessageModal({ ...messageModal, open: false })}
        title={messageModal.title}
        message={messageModal.message}
        type={messageModal.type}
      />

    </div>
  );
}

export default UserProfile;