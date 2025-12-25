import React, { useState, useEffect, useRef } from 'react';
import api from 'api/axios';
import { Link, useNavigate } from 'react-router-dom';
import { User, Lock, ArrowRight, Eye, EyeOff, Check } from 'lucide-react';

// ----------------------------------------------------------------------
// ✅ REAL IMPORT
// ----------------------------------------------------------------------
import { useAuth } from '../../context/AuthContext';

// ----------------------------------------------------------------------

const UserLogin = () => {
  // --- STATE ---
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [savedUsers, setSavedUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();
  const inputRef = useRef(null);

  // --- LOGIC: Load Saved Users ---
  useEffect(() => {
    const users = JSON.parse(localStorage.getItem('savedUsers') || '[]');
    setSavedUsers(users);
  }, []);

  // --- LOGIC: Handle Click Outside Dropdown ---
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (inputRef.current && !inputRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- LOGIC: Filter Users ---
  useEffect(() => {
    if (userId === '') {
      setFilteredUsers(savedUsers);
    } else {
      setFilteredUsers(
        savedUsers.filter(u =>
          u.id.toLowerCase().includes(userId.toLowerCase())
        )
      );
    }
  }, [userId, savedUsers]);

  // --- LOGIC: Select User ---
  const handleUserSelect = (id) => {
    const user = savedUsers.find(u => u.id === id);
    if (user) {
      setUserId(user.id);
      setPassword(user.password);
      setRememberMe(true);
      setDropdownOpen(false);
    }
  };

  // --- LOGIC: Handle Login ---
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Real API Call
      const res = await api.post('/auth/login', {
        userId,
        password,
      });

      const { token, user } = res.data;
      login(user, token);

      if (rememberMe) {
        const updatedUsers = savedUsers.filter(u => u.id !== userId);
        updatedUsers.unshift({ id: userId, password });
        localStorage.setItem('savedUsers', JSON.stringify(updatedUsers));
        setSavedUsers(updatedUsers);
      }

      // Simulate API delay
      setTimeout(() => {
        setLoading(false);
        navigate('/dashboard');
      }, 1500);

    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 font-sans selection:bg-yellow-500/30 overflow-x-hidden flex items-center justify-center p-4 relative">
      
      {/* --- GLOBAL STYLES & ANIMATIONS --- */}
      <style>{`
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
          100% { transform: translateY(0px); }
        }
        @keyframes glow {
          0% { box-shadow: 0 0 15px rgba(234, 179, 8, 0.35), 0 0 35px rgba(234, 179, 8, 0.25); }
          50% { box-shadow: 0 0 40px rgba(234, 179, 8, 0.75), 0 0 90px rgba(234, 179, 8, 0.45); }
          100% { box-shadow: 0 0 15px rgba(234, 179, 8, 0.35), 0 0 35px rgba(234, 179, 8, 0.25); }
        }
        @keyframes shineMove {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes fadeSlideUp {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-float { animation: float 5s ease-in-out infinite; }
        .animate-glow { animation: glow 3s ease-in-out infinite; }
        .bg-grid-pattern {
          background-image: radial-gradient(#334155 1px, transparent 1px);
          background-size: 30px 30px;
          opacity: 0.2;
        }
        /* Custom Scrollbar */
        .custom-scroll::-webkit-scrollbar { width: 4px; }
        .custom-scroll::-webkit-scrollbar-track { background: #1e293b; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #475569; border-radius: 4px; }
      `}</style>

      {/* Background Grid */}
      <div className="fixed inset-0 bg-grid-pattern pointer-events-none"></div>

      {/* --- MAIN CONTAINER --- */}
      <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-3xl shadow-2xl p-8 md:p-10 relative z-10 animate-in fade-in zoom-in duration-500">
        
        {/* Logo Section */}
        <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-slate-800/80 mb-6 animate-float animate-glow border border-slate-700 shadow-xl overflow-hidden p-3">
                <img 
                  src="/eliteinfinitylogo.png" 
                  alt="Elite Infinity" 
                  className="w-full h-full object-contain"
                />
            </div>

            <h2 
              className="text-4xl font-black tracking-tight mb-2"
              style={{
                backgroundImage: 'linear-gradient(to right, #ffffff, #22d3ee, #ffffff)',
                backgroundSize: '200% auto',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                animation: 'shineMove 3s linear infinite, fadeSlideUp 0.8s ease-out forwards'
              }}
            >
              Welcome Back
            </h2>
            <p className="text-white mt-2 text-sm">Sign in to your Elite Infinity account</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm text-center font-medium animate-pulse">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-6">
            
            {/* User ID Input with Dropdown */}
            <div className="relative group" ref={inputRef}>
                <label className="block text-xs text-white font-bold uppercase mb-1 ml-1 tracking-wider">User ID</label>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-slate-500 group-focus-within:text-yellow-500 transition-colors" />
                    </div>
                    <input
                        type="text"
                        value={userId}
                        onChange={(e) => setUserId(e.target.value)}
                        onFocus={() => setDropdownOpen(true)}
                        className="w-full bg-slate-800 border border-slate-700 text-black rounded-xl py-3 pl-10 pr-4 outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 transition-all placeholder-slate-600"
                        placeholder="Enter your User ID"
                        required
                    />
                </div>

                {/* Saved Users Dropdown */}
                {dropdownOpen && filteredUsers.length > 0 && (
                  <ul 
                    className="absolute left-0 bg-black right-0 bg-[#0f172a]/95 backdrop-blur-xl border border-cyan-500/30 rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.5)] z-50 max-h-48 overflow-y-auto custom-scroll animate-in fade-in slide-in-from-top-2 duration-200 mt-2"
                    style={{ scrollbarWidth: 'thin', scrollbarColor: '#22d3ee #0f172a' }}
                  >
                    {filteredUsers.map((u, idx) => (
                      <li
                        key={idx}
                        className="group px-4 py-3 cursor-pointer flex justify-between items-center border-b border-white/5 last:border-0 hover:bg-cyan-500/10 transition-all duration-200 hover:pl-5"
                        onClick={() => handleUserSelect(u.id)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-cyan-500/20 group-hover:scale-110 transition-all">
                             <span className="text-gray-400 group-hover:text-cyan-400 text-xs">👤</span>
                          </div>
                          <span className="font-mono text-sm font-semibold text-gray-300 ">
                            {u.id}
                          </span>
                        </div>
                        <span className="text-[10px] uppercase tracking-widest font-bold text-gray-500 bg-black/30 px-2 py-1 rounded border border-white/5 group-hover:border-cyan-500/30 group-hover:text-cyan-400 transition-all">
                          Saved
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
            </div>

            {/* Password Input */}
            <div className="relative group">
                <label className="block text-xs text-white font-bold uppercase mb-1 ml-1 tracking-wider">Password</label>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-slate-500 group-focus-within:text-yellow-500 transition-colors" />
                    </div>
                    <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 text-black rounded-xl py-3 pl-10 pr-12 outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 transition-all placeholder-slate-600"
                        placeholder="Enter your password"
                        required
                    />
                    <button 
                        type="button" 
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-yellow-500 transition-colors"
                    >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                </div>
            </div>

            {/* 🔥 FIXED REMEMBER ME CHECKBOX 🔥 */}
            <div className="flex items-center justify-between text-sm mt-4">
              <label className="flex items-center gap-3 cursor-pointer group select-none">
                
                {/* Custom Checkbox Box */}
                <div 
                  className={`relative flex items-center justify-center h-5 w-5 rounded border transition-all duration-200 
                    ${rememberMe 
                      ? 'bg-cyan-500 border-cyan-500' 
                      : 'bg-slate-800 border-slate-600 group-hover:border-cyan-400'
                    }`}
                >
                  {/* Invisible Input to handle click */}
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  
                  {/* Explicit White Tick (Only shows when rememberMe is true) */}
                  {rememberMe && (
                    <svg 
                      width="12" 
                      height="12" 
                      viewBox="0 0 14 14" 
                      fill="none" 
                      xmlns="http://www.w3.org/2000/svg"
                      className="animate-in zoom-in duration-200"
                    >
                      <path 
                        d="M3 7L6 10L11 4" 
                        stroke="white" 
                        strokeWidth="3" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>

                <span className="text-gray-400 group-hover:text-white transition-colors text-sm font-medium">
                  Remember Me
                </span>
              </label>
              
              <Link 
                to="/forgot-password" 
                className="text-cyan-400 text-white hover:text-cyan-300 text-sm font-bold transition-colors hover:underline"
              >
                Forgot Password?
              </Link>
            </div>


            {/* Submit Button */}
            <button 
                type="submit" 
                disabled={loading}
                className={`w-full py-4 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-black font-bold text-lg shadow-lg shadow-amber-500/20 transition-all transform hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-2
                 ${loading ? 'opacity-70 cursor-not-allowed' : ''}
                `}
            >
                {loading ? (
                    <span className="flex items-center gap-2">
                        <svg className="animate-spin h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Authenticating...
                    </span>
                ) : (
                    <>
                        Secure Login <ArrowRight size={20} strokeWidth={3} />
                    </>
                )}
            </button>

        </form>

        {/* Register Link */}
        <p className="text-center text-white mt-8 text-slate-400 text-sm">
            Don't have an account?{' '}
            <Link 
                to="/register" 
                className="text-white hover:text-yellow-400 font-bold transition-all hover:underline"
            >
                Register now
            </Link>
        </p>

      </div>
    </div>
  );
};

export default UserLogin;