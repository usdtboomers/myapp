import React, { useEffect, useState } from 'react';
import api from '../../api/axios'; // Make sure this path is correct
import { useNavigate, useLocation, Link } from 'react-router-dom';
import Select from 'react-select';
import Confetti from 'react-confetti';

// --- Icons Components ---
const EyeOpenIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
);
const EyeSlashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
);
const UserIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
);
const PhoneIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" /></svg>
);
const CheckCircleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-green-400"><path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" /></svg>
);
const XCircleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-red-400"><path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-1.72 6.97a.75.75 0 10-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 101.06 1.06L12 13.06l1.72 1.72a.75.75 0 101.06-1.06L13.06 12l1.72-1.72a.75.75 0 10-1.06-1.06L12 10.94l-1.72-1.72z" clipRule="evenodd" /></svg>
);

function Register() {
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [country, setCountry] = useState('');
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [sponsorId, setSponsorId] = useState('');
  const [sponsorName, setSponsorName] = useState('');
  
  const [errorMsg, setErrorMsg] = useState('');
  const [showPopup, setShowPopup] = useState(false);
  const [registeredData, setRegisteredData] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  // Referral from URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const ref = params.get('ref');
    if (ref) {
      setSponsorId(ref);
      fetchSponsorName(ref);
    }
  }, [location]);

  // Fetch sponsor name
  const fetchSponsorName = async (id) => {
    if (id.length < 3) return;
    try {
      const res = await api.get(`/user/sponsor-name/${id}`);
      setSponsorName(res.data.name);
    } catch {
      setSponsorName('Invalid Sponsor');
    }
  };

  // Restrict to Numbers only for Mobile
// Restrict to Numbers only and Prevent starting with '0'
  const handleMobileChange = (e) => {
    let value = e.target.value.replace(/\D/g, ''); // Pehle sirf numbers allow karo
    value = value.replace(/^0+/, ''); // Phir agar starting mein '0' hai toh usko hata do
    setMobile(value);
  };

  // Registration
  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    // Field Checks
    if (!name || !mobile || !email || !country || !password || !confirmPassword) {
      setErrorMsg('All fields are required.');
      return;
    }

    // India 10-digit Check
    if (country === 'India' && mobile.length !== 10) {
      setErrorMsg('Mobile number must be exactly 10 digits for India.');
      return;
    }

    // Password Checks
    if (password === '123456') {
      setErrorMsg('Password is too weak. Please do not use 123456.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    try {
      const response = await api.post('/auth/register', {
        name, mobile, email, country, password, sponsorId,
      });

      // ✅ Setting name from response (Make sure backend is sending it!)
      setRegisteredData({
        userId: response.data.userId,
        password: response.data.password || password,
        name: response.data.name || name,
      });

      setShowPopup(true);
      setShowConfetti(true);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Registration failed.');
    }
  };

  const handlePopupClose = () => {
    setShowPopup(false);
    setShowConfetti(false);
    navigate('/login');
  };

  const countryOptions = [
    { value: 'Afghanistan', label: 'Afghanistan +93' },
    { value: 'Albania', label: 'Albania +355' },
    { value: 'Algeria', label: 'Algeria +213' },
    { value: 'Argentina', label: 'Argentina +54' },
    { value: 'Australia', label: 'Australia +61' },
    { value: 'Austria', label: 'Austria +43' },
    { value: 'Bahrain', label: 'Bahrain +973' },
    { value: 'Bangladesh', label: 'Bangladesh +880' },
    { value: 'Belgium', label: 'Belgium +32' },
    { value: 'Bhutan', label: 'Bhutan +975' },
    { value: 'Brazil', label: 'Brazil +55' },
    { value: 'Canada', label: 'Canada +1' },
    { value: 'China', label: 'China +86' },
    { value: 'Colombia', label: 'Colombia +57' },
    { value: 'Denmark', label: 'Denmark +45' },
    { value: 'Egypt', label: 'Egypt +20' },
    { value: 'Finland', label: 'Finland +358' },
    { value: 'France', label: 'France +33' },
    { value: 'Germany', label: 'Germany +49' },
    { value: 'Ghana', label: 'Ghana +233' },
    { value: 'Greece', label: 'Greece +30' },
    { value: 'Hong Kong', label: 'Hong Kong +852' },
    { value: 'India', label: 'India +91' },
    { value: 'Indonesia', label: 'Indonesia +62' },
    { value: 'Iran', label: 'Iran +98' },
    { value: 'Iraq', label: 'Iraq +964' },
    { value: 'Ireland', label: 'Ireland +353' },
    { value: 'Israel', label: 'Israel +972' },
    { value: 'Italy', label: 'Italy +39' },
    { value: 'Japan', label: 'Japan +81' },
    { value: 'Jordan', label: 'Jordan +962' },
    { value: 'Kenya', label: 'Kenya +254' },
    { value: 'Kuwait', label: 'Kuwait +965' },
    { value: 'Malaysia', label: 'Malaysia +60' },
    { value: 'Maldives', label: 'Maldives +960' },
    { value: 'Mauritius', label: 'Mauritius +230' },
    { value: 'Mexico', label: 'Mexico +52' },
    { value: 'Morocco', label: 'Morocco +212' },
    { value: 'Myanmar', label: 'Myanmar +95' },
    { value: 'Nepal', label: 'Nepal +977' },
    { value: 'Netherlands', label: 'Netherlands +31' },
    { value: 'New Zealand', label: 'New Zealand +64' },
    { value: 'Nigeria', label: 'Nigeria +234' },
    { value: 'Norway', label: 'Norway +47' },
    { value: 'Oman', label: 'Oman +968' },
    { value: 'Pakistan', label: 'Pakistan +92' },
    { value: 'Philippines', label: 'Philippines +63' },
    { value: 'Poland', label: 'Poland +48' },
    { value: 'Portugal', label: 'Portugal +351' },
    { value: 'Qatar', label: 'Qatar +974' },
    { value: 'Russia', label: 'Russia +7' },
    { value: 'Saudi Arabia', label: 'Saudi Arabia +966' },
    { value: 'Singapore', label: 'Singapore +65' },
    { value: 'South Africa', label: 'South Africa +27' },
    { value: 'South Korea', label: 'South Korea +82' },
    { value: 'Spain', label: 'Spain +34' },
    { value: 'Sri Lanka', label: 'Sri Lanka +94' },
    { value: 'Sweden', label: 'Sweden +46' },
    { value: 'Switzerland', label: 'Switzerland +41' },
    { value: 'Taiwan', label: 'Taiwan +886' },
    { value: 'Thailand', label: 'Thailand +66' },
    { value: 'Turkey', label: 'Turkey +90' },
    { value: 'UAE', label: 'UAE +971' },
    { value: 'UK', label: 'United Kingdom +44' },
    { value: 'USA', label: 'United States +1' },
    { value: 'Ukraine', label: 'Ukraine +380' },
    { value: 'Vietnam', label: 'Vietnam +84' },
    { value: 'Yemen', label: 'Yemen +967' },
  ];

  const customSelectStyles = {
    control: (base, state) => ({
      ...base,
      background: 'rgba(255, 255, 255, 0.05)',
      borderColor: state.isFocused ? '#06b6d4' : 'rgba(255, 255, 255, 0.1)',
      padding: '5px',
      borderRadius: '0.75rem',
      boxShadow: 'none',
      cursor: 'pointer',
      color: 'white',
      minHeight: '48px',
    }),
    singleValue: (base) => ({ ...base, color: 'white' }),
    input: (base) => ({ ...base, color: 'white' }),
    menu: (base) => ({ ...base, background: '#0f172a', border: '1px solid #334155', borderRadius: '12px', zIndex: 50 }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isFocused ? '#334155' : 'transparent',
      color: 'white',
      cursor: 'pointer',
    }),
    placeholder: (base) => ({ ...base, color: 'rgba(255,255,255,0.4)' }),
  };

  return (
    <div className="min-h-screen bg-[#0a1f44] text-black flex flex-col items-center justify-start p-4 pt-32 relative overflow-hidden font-sans selection:bg-cyan-500 selection:text-black">
      
      {/* Navbar */}
      <nav className="fixed text-white top-0 left-0 w-full z-50 bg-black border-b border-[#D4AF37]/30 px-6 py-1 shadow-lg shadow-black/50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <img 
            src="/usdtboomer.png" 
            alt="USDT Boomers Logo"
            className="h-16 pr-6 object-contain"
          />
          <div>
            <Link to="/" className="bg-yellow-400 text-black font-bold py-2 px-6 rounded-lg mx-2 hover:bg-yellow-300 transition">
              Home
            </Link>
            <Link to="/login" className="bg-yellow-500 text-black font-bold py-2 px-6 rounded-lg mx-2 hover:bg-yellow-400 transition">
              LOGIN
            </Link>
          </div>
        </div>
      </nav>

      {/* Background Glows */}
      <div className="fixed top-[-10%] left-[-10%] w-96 h-96 bg-blue-600 rounded-full mix-blend-multiply filter blur-[128px] opacity-20 animate-blob"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-96 h-96 bg-purple-600 rounded-full mix-blend-multiply filter blur-[128px] opacity-20 animate-blob animation-delay-2000"></div>

      <div className="w-full max-w-lg relative z-10">
        
        <div className="text-center mb-6">
           <img
              src="/usdtboomer.png"
              alt="USDT BOOMERS"
              className="h-24 mx-auto mb-4 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] animate-pulse"
            />
          <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-cyan-200 to-blue-400">
            Create Account
          </h2>
          <p className="text-white text-sm mt-1">Join the USDT BOOMERS community today</p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 md:p-8 rounded-3xl shadow-2xl">
          <form onSubmit={handleRegister} className="space-y-5">
            
            {/* Sponsor ID Field */}
            <div>
              <label className="block text-xs font-medium text-blue-200 mb-1 ml-1 uppercase tracking-wider">Sponsor ID</label>
              <div className="relative group">
                <input
                  type="text"
                  value={sponsorId}
onChange={(e) => { 
  const val = e.target.value.replace(/\D/g, ''); // Sirf numbers allow karega
  setSponsorId(val); 
  fetchSponsorName(val); 
}}                  className={`w-full bg-white/5 border ${sponsorName === 'Invalid Sponsor' ? 'border-red-500 focus:ring-red-500' : (sponsorName && sponsorId) ? 'border-green-500 focus:ring-green-500' : 'border-white/10 focus:ring-cyan-500'} rounded-xl px-4 py-3 text-black placeholder-white/20 focus:outline-none focus:ring-2 transition-all pl-11`}
                  placeholder="Enter Sponsor ID"
                />
                <div className="absolute left-3 top-3.5 text-black/40 group-focus-within:text-cyan-400 transition-colors">
                    <UserIcon />
                </div>
                <div className="absolute right-3 top-3">
                   {sponsorName === 'Invalid Sponsor' && <XCircleIcon />}
                   {sponsorName && sponsorName !== 'Invalid Sponsor' && <CheckCircleIcon />}
                </div>
              </div>
              {sponsorName && (
                <p className={`text-xs mt-1 ml-1 font-medium ${sponsorName === 'Invalid Sponsor' ? 'text-red-400' : 'text-green-400'}`}>
                   {sponsorName === 'Invalid Sponsor' ? 'Invalid Sponsor ID' : `Sponsor: ${sponsorName}`}
                </p>
              )}
            </div>

            {/* ORDER CHANGED: Full Name -> Email -> Country -> Mobile -> Password -> Confirm Password */}
            
            {/* Full Name */}
            <div>
               <label className="text-xs font-medium text-blue-200 ml-1 uppercase tracking-wider">Full Name</label>
               <div className="relative group mt-1">
                   <input
                     type="text"
                     value={name}
                     onChange={(e) => setName(e.target.value)}
                     className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pl-10 text-black focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
                     placeholder="Enter Full Name"
                   />
                   <div className="absolute left-3 top-3.5 text-black/40 group-focus-within:text-cyan-400 transition-colors">
                     <UserIcon />
                   </div>
               </div>
            </div>

            {/* Email */}
            <div>
                <label className="text-xs font-medium text-blue-200 ml-1 uppercase tracking-wider">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-black focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
                  placeholder="you@example.com"
                />
            </div>

             {/* Country Select */}
            <div>
               <label className="text-xs font-medium text-blue-200 ml-1 uppercase tracking-wider">Country</label>
               <div className="mt-1">
                 <Select 
                    options={countryOptions} 
                    onChange={(s) => setCountry(s.value)} 
                    styles={customSelectStyles} 
                    placeholder="Select Country"
                 />
               </div>
            </div>

            {/* Mobile (Numbers Only Check applied here) */}
            <div>
               <label className="text-xs font-medium text-blue-200 ml-1 uppercase tracking-wider">Mobile Number</label>
               <div className="relative group mt-1">
                   <input
                     type="tel"
                     value={mobile}
                     onChange={handleMobileChange}
                     className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pl-10 text-black focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
                     placeholder="Enter Mobile Number"
                   />
                   <div className="absolute left-3 top-3.5 text-black/40 group-focus-within:text-cyan-400 transition-colors">
                     <PhoneIcon />
                   </div>
               </div>
               {country === 'India' && (
                 <p className="text-[10px] text-yellow-300 ml-1 mt-1">* India requires exactly 10 digits</p>
               )}
            </div>

            {/* Passwords - Simplified to Login & Confirm */}
            <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="text-xs font-medium text-blue-200 ml-1 uppercase tracking-wider">Password</label>
                  <div className="relative mt-1 group">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-black focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all pr-10"
                        placeholder="••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3.5 text-black/40 hover:text-black transition-colors focus:outline-none"
                      >
                        {showPassword ? <EyeSlashIcon /> : <EyeOpenIcon />}
                      </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-blue-200 ml-1 uppercase tracking-wider">Confirm Password</label>
                  <div className="relative mt-1 group">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-black focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all pr-10"
                        placeholder="••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-3.5 text-black/40 hover:text-black transition-colors focus:outline-none"
                      >
                        {showConfirmPassword ? <EyeSlashIcon /> : <EyeOpenIcon />}
                      </button>
                  </div>
                </div>
            </div>

            {/* Error Message Display */}
            {errorMsg && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-200 text-sm p-3 rounded-lg text-center animate-pulse flex items-center justify-center gap-2">
                 <XCircleIcon /> <span>{errorMsg}</span>
              </div>
            )}

            <div className="pt-2 space-y-3">
              <button className="w-full py-4 bg-yellow-600 rounded-xl font-bold text-lg bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-400 hover:to-yellow-800 text-black shadow-lg shadow-cyan-500/25 transform hover:-translate-y-1 transition-all duration-200 tracking-wide">
                REGISTER NOW
              </button>
              
              <button 
                type="button" 
                onClick={() => navigate('/login')}
                className="w-full py-3 rounded-xl font-medium text-sm text-blue-200 hover:text-black hover:bg-white/5 transition-all"
              >
                Already have an account? <span className="text-cyan-400">Login here</span>
              </button>
            </div>

          </form>
        </div>
      </div>

      {/* Success Modal (Txn Password Removed from Display) */}
    {showPopup && registeredData && (
        <div style={modalOverlay}>
          {showConfetti && (
            <Confetti width={window.innerWidth} height={window.innerHeight} numberOfPieces={400} gravity={0.18} recycle style={{ position: 'absolute', top: 0, left: 0, zIndex: 1 }} />
          )}
          <div style={{ ...modalBox, position: 'relative', zIndex: 10, textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
              <img src="/usdtboomer.png" alt="Logo" style={{ height: 80, width: 'auto', maxWidth: '100%' }} />
            </div>
            <div style={{ textAlign: 'center' }}>
              {/* Ye heading ab hamesha ek hi line mein dikhegi */}
              <h2 style={{ 
                color: '#facc15', 
                fontSize: '1.1rem', 
                fontWeight: 'bold', 
                marginBottom: 10, 
                whiteSpace: 'nowrap' 
              }}>
                🎉 Congratulations & Welcome! 🎉
              </h2>
              
              {/* Dear ke baad user ka naam aayega aur aage ka message */}
              <p style={{ fontSize: '1rem', color: '#fff', marginBottom: '15px' }}>
                Dear <strong style={{ color: '#4ade80' }}>{registeredData.name}</strong>, your registration has been successfully completed! ✅
              </p>
            </div>
            
            <div style={{ textAlign: 'left', background: 'rgba(0, 0, 0, 0.2)', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
              <p style={{ marginBottom: '8px' }}>
                <strong>User ID:</strong> <span style={{ color: '#4ade80' }}>{registeredData.userId}</span>
              </p>
              <p style={{ marginBottom: '8px' }}>
                <strong>Password:</strong> <span style={{ color: '#facc15' }}>{registeredData.password}</span>
              </p>
              <p style={{ marginBottom: '0' }}>
                <strong>Transaction Password:</strong> <span style={{ color: '#facc15' }}>{registeredData.password}</span>
              </p>
            </div>

            {/* 🔥 NAYA ADD KIYA GAYA OFFER BANNER 🔥 */}
            <div style={{
              background: 'linear-gradient(45deg, rgba(234, 179, 8, 0.1), rgba(234, 179, 8, 0.3))',
              border: '1px solid #eab308',
              borderRadius: '8px',
              padding: '10px',
              marginBottom: '15px',
              textAlign: 'center',
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
            }}>
              <h3 style={{ color: '#eab308', fontSize: '14px', fontWeight: 'bold', marginBottom: '4px', textTransform: 'uppercase' }}>
                🎁 Limited Time Pre Launching Offer!
              </h3>
             <p style={{ color: '#fff', fontSize: '12px', margin: 0, lineHeight: '1.4' }}>
  Login now and activate your <strong style={{color: '#4ade80'}}>$10 Package absolutely FREE!</strong> Pramote your referral link, Expand your network and Earn sustanatial Rewards. Offer valid only till <strong style={{color: '#facc15'}}>30th April</strong>! 🚀
</p>
            </div>

            <p className="font-bold" style={{ color: '#ff4d4d', fontSize: 14, marginBottom: 15 }}>
              📸 Please take a screenshot of this information for your records.
            </p>
            
            <button onClick={handlePopupClose} style={{ ...primaryBtn, width: '100%' }}>LOGIN TO CLAIM FREE $10</button>
          </div>
        </div>
      )}
    </div>
  );
}

const primaryBtn = { width: '100%', padding: 12, marginTop: 10, borderRadius: 8, border: 'none', backgroundColor: '#2563eb', color: '#fff', fontSize: 16, cursor: 'pointer' };
const modalOverlay = { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 };
const modalBox = { backgroundColor: '#111827', padding: 25, borderRadius: 16, width: '90%', maxWidth: 400, textAlign: 'center', color: '#fff', boxShadow: '0 0 30px rgba(255,215,0,0.8)', ring: '4px solid #facc15' };

export default Register;