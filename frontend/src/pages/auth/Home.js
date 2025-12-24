import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Zap, Globe, Mail, ArrowRight, X, User, MessageSquare } from 'lucide-react'; // Using Lucide Icons for premium look
import HeroImage from '../../assets/hero.png';
import Logo from '../../assets/eliteinfinitylogo.png';

const Home = () => {
  const navigate = useNavigate();
  const [supportData, setSupportData] = useState({ name: '', email: '', message: '' });
  const [modalMessage, setModalMessage] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Handle Scroll Effect for Navbar
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSupportChange = (e) => {
    setSupportData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSupportSubmit = (e) => {
    e.preventDefault();
    setModalMessage('✨ Message Sent! Our team will contact you shortly.');
    setIsModalOpen(true);
    setSupportData({ name: '', email: '', message: '' });
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 font-sans selection:bg-yellow-500/30 overflow-x-hidden">
      
      {/* --- GLOBAL STYLES & ANIMATIONS --- */}
      <style>{`
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
          100% { transform: translateY(0px); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-fade-in { animation: fadeIn 0.8s ease-out forwards; }
        .delay-100 { animation-delay: 0.1s; }
        .delay-200 { animation-delay: 0.2s; }
        .delay-300 { animation-delay: 0.3s; }
        
        .bg-grid-pattern {
          background-image: radial-gradient(#334155 1px, transparent 1px);
          background-size: 30px 30px;
          opacity: 0.2;
        }
        
        /* Custom Scrollbar */
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: #0f172a; }
        ::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #475569; }
      `}</style>

      {/* Background Grid */}
      <div className="fixed inset-0 bg-grid-pattern pointer-events-none"></div>

      {/* --- NAVBAR --- */}
      <nav className={`fixed top-0 w-full text-white z-50 transition-all duration-300 ${scrolled ? 'bg-[#0f172a]/90 backdrop-blur-md border-b border-slate-800 py-3' : 'bg-transparent py-5'}`}>
        <div className="max-w-7xl mx-auto text-white px-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
             <img src={Logo} alt="Logo" className="h-10 md:h-12 drop-shadow-lg" />
             <span className="text-xl font-bold text-white hidden sm:block tracking-wide">Elite<span className="text-yellow-500">Infinity</span></span>
          </div>
          <div className="flex gap-4">
             <button 
               onClick={() => navigate('/login')}
               className="px-6 py-2 rounded-full font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition-all"
             >
               Login
             </button>
             <button 
               onClick={() => navigate('/register')}
               className="px-6 py-2 rounded-full font-bold bg-gradient-to-r from-yellow-500 to-amber-600 text-black shadow-lg shadow-yellow-500/20 hover:scale-105 transition-all"
             >
               Sign Up
             </button>
          </div>
        </div>
      </nav>

      {/* --- HERO SECTION --- */}
      <section className="relative  text-white pt-32 pb-20 md:pt-48 md:pb-32 px-6 overflow-hidden">
        <div className="max-w-7xl text-white mx-auto flex flex-col-reverse lg:flex-row items-center gap-12 lg:gap-20">
          
          {/* Left Content */}
          <div className="flex-1 text-center text-white lg:text-left z-10 animate-fade-in">
            <div className="inline-block px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider mb-6">
              🚀 Welcome to the Future
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold text-white leading-tight mb-6">
              Build Your <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500">
                Digital Legacy
              </span>
            </h1>
            <p className="text-lg text-white text-slate-400 mb-8 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              EliteInfinity connects you with opportunities. Create, thrive, and succeed in a vibrant digital ecosystem designed for growth.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <button 
                onClick={() => navigate('/register')}
                className="px-8 py-4 rounded-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xl shadow-blue-600/20 hover:scale-105 transition-all flex items-center justify-center gap-2"
              >
                Get Started <ArrowRight size={20} />
              </button>
              <button 
                onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}
                className="px-8 py-4 rounded-xl font-bold bg-slate-800 text-white border border-slate-700 hover:bg-slate-700 transition-all"
              >
                Learn More
              </button>
            </div>
          </div>

          {/* Right Image */}
          <div className="flex-1 relative z-10 animate-float delay-200">
             <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/20 to-purple-500/20 blur-3xl rounded-full"></div>
             <img 
               src={HeroImage} 
               alt="Hero" 
               className="relative w-full max-w-lg mx-auto rounded-2xl shadow-2xl border border-slate-700/50 backdrop-blur-sm"
             />
          </div>
        </div>
      </section>

      {/* --- FEATURES SECTION --- */}
      <section id="features" className="py-20 bg-slate-900/50 border-y border-slate-800 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16 animate-fade-in">
             <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Why Choose Us?</h2>
             <p className="text-slate-400 text-white max-w-xl mx-auto">We provide the tools and support you need to reach new heights.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
             {/* Feature 1 */}
             <div className="group p-8 rounded-2xl bg-slate-800/50 border border-slate-700 hover:border-blue-500/50 hover:bg-slate-800 transition-all hover:-translate-y-2 duration-300">
                <div className="w-14 h-14 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 mb-6 group-hover:scale-110 transition-transform">
                   <Zap size={32} />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Innovation</h3>
                <p className="text-slate-400 text-white text-sm leading-relaxed">
                  We bring fresh ideas and modern solutions to help you succeed in the digital space.
                </p>
             </div>

             {/* Feature 2 */}
             <div className="group p-8 rounded-2xl bg-slate-800/50 border border-slate-700 hover:border-emerald-500/50 hover:bg-slate-800 transition-all hover:-translate-y-2 duration-300 delay-100">
                <div className="w-14 h-14 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-6 group-hover:scale-110 transition-transform">
                   <Globe size={32} />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Collaboration</h3>
                <p className="text-slate-400 text-white text-sm leading-relaxed">
                  Connect with like-minded individuals and grow together in a supportive environment.
                </p>
             </div>

             {/* Feature 3 */}
             <div className="group p-8 rounded-2xl bg-slate-800/50 border border-slate-700 hover:border-purple-500/50 hover:bg-slate-800 transition-all hover:-translate-y-2 duration-300 delay-200">
                <div className="w-14 h-14 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 mb-6 group-hover:scale-110 transition-transform">
                   <Shield size={32} />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Secure Growth</h3>
                <p className="text-slate-400 text-white text-sm leading-relaxed">
                  Empower yourself with secure tools and resources designed to expand your opportunities.
                </p>
             </div>
          </div>
        </div>
      </section>

      {/* --- SUPPORT SECTION --- */}
      <section className="py-24 px-6 relative">
        <div className="max-w-4xl mx-auto bg-slate-900 border border-slate-700 rounded-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden">
          {/* Decorative Glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/5 rounded-full blur-3xl pointer-events-none"></div>

          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-white mb-3">Need Support?</h2>
            <p className="text-white">
              Have questions? Contact us at <span className="text-yellow-400 font-medium">support@eliteinfinity.com</span> or fill the form below.
            </p>
          </div>

          <form onSubmit={handleSupportSubmit} className="space-y-5 relative z-10">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="relative">
                   <User className="absolute left-4 top-3.5 text-slate-500" size={18} />
                   <input
                     type="text"
                     name="name"
                     value={supportData.name}
                     onChange={handleSupportChange}
                     required
                     placeholder="Your Full Name"
                     className="w-full bg-slate-800/50 border border-slate-700 text-white rounded-xl py-3 pl-12 pr-4 outline-none focus:border-yellow-500 focus:bg-slate-800 transition-all"
                   />
                </div>
                <div className="relative">
                   <Mail className="absolute left-4 top-3.5 text-slate-500" size={18} />
                   <input
                     type="email"
                     name="email"
                     value={supportData.email}
                     onChange={handleSupportChange}
                     required
                     placeholder="Email Address"
                     className="w-full bg-slate-800/50 border border-slate-700 text-white rounded-xl py-3 pl-12 pr-4 outline-none focus:border-yellow-500 focus:bg-slate-800 transition-all"
                   />
                </div>
             </div>
             
             <div className="relative">
                <MessageSquare className="absolute left-4 top-3.5 text-slate-500" size={18} />
                <textarea
                  name="message"
                  value={supportData.message}
                  onChange={handleSupportChange}
                  required
                  rows={4}
                  placeholder="How can we help you?"
                  className="w-full bg-slate-800/50 border border-slate-700 text-white rounded-xl py-3 pl-12 pr-4 outline-none focus:border-yellow-500 focus:bg-slate-800 transition-all resize-none"
                />
             </div>

             <button 
               type="submit"
               className="w-full py-4 rounded-xl font-bold text-black bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 shadow-lg shadow-amber-500/20 transition-all transform hover:-translate-y-1 active:scale-95"
             >
               Submit Request
             </button>
          </form>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="border-t border-slate-800 bg-[#0b1121] py-10 text-center relative z-10">
        <div className="max-w-7xl mx-auto text-white px-6">
           <img src={Logo} alt="Logo" className="h-8 mx-auto mb-4 opacity-80" />
           <p className="text-slate-500 text-sm mb-2">
             &copy; {new Date().getFullYear()} EliteInfinity. All rights reserved.
           </p>
           <p className="text-slate-600 text-xs">
             Connecting people, ideas, and opportunities in a dynamic digital environment.
           </p>
        </div>
      </footer>

      {/* --- SUCCESS MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/90 backdrop-blur-sm z-[100] p-4 animate-fade-in">
          <div className="bg-slate-900 border border-emerald-500/30 p-8 rounded-2xl shadow-2xl max-w-sm w-full text-center relative">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-white"
            >
              <X size={24} />
            </button>
            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
               <Zap className="text-emerald-400" size={32} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Success!</h3>
            <p className="text-slate-300 mb-6">{modalMessage}</p>
            <button
              onClick={() => setIsModalOpen(false)}
              className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default Home;