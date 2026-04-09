import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Shield, Zap, Globe, ArrowRight, TrendingUp, 
  Layers, Users, CheckCircle, BarChart, Gem, Star, Lock 
} from 'lucide-react';
import HeroImage from '../../assets/hero.png';
import Logo from '../../assets/usdtboomer.png';

// --- ANIMATED COUNTER COMPONENT ---
const AnimatedCounter = ({ end, duration = 2000, prefix = "", suffix = "", decimals = 0 }) => {
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const counterRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.5 }
    );
    if (counterRef.current) observer.observe(counterRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // Easing function for smooth slowdown at the end
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setCount(easeOutQuart * end);
      if (progress < 1) window.requestAnimationFrame(step);
    };
    window.requestAnimationFrame(step);
  }, [isVisible, end, duration]);

  const formattedNumber = count.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  return (
    <span ref={counterRef}>
      {prefix}{formattedNumber}{suffix}
    </span>
  );
};

const Home = () => {
  const navigate = useNavigate();
  const [supportData, setSupportData] = useState({ name: '', email: '', message: '' });
  const [modalMessage, setModalMessage] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Layout & Scroll Handling
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    const handleScroll = () => setScrolled(window.scrollY > 50);
    
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const handleSupportSubmit = (e) => {
    e.preventDefault();
    setModalMessage('✨ Inquiry Secured! Our wealth advisors will contact you shortly.');
    setIsModalOpen(true);
    setSupportData({ name: '', email: '', message: '' });
  };

  return (
    <div className="boomers-container">
      {/* --- PREMIUM CSS STYLES & ANIMATIONS --- */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800;900&display=swap');

        .boomers-container {
          background-color: #050b14;
          min-height: 100vh;
          color: #f8fafc;
          font-family: 'Inter', sans-serif;
          position: relative;
          overflow-x: hidden;
        }

        /* Abstract Premium Background */
        .bg-grid {
          position: fixed;
          top: 0; left: 0; width: 100vw; height: 100vh;
          background-image: 
            radial-gradient(circle at 15% 50%, rgba(251, 191, 36, 0.08), transparent 25%),
            radial-gradient(circle at 85% 30%, rgba(59, 130, 246, 0.08), transparent 25%);
          z-index: 0;
          pointer-events: none;
        }

        .bg-mesh {
          position: fixed;
          inset: 0;
          background-image: linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
          background-size: 40px 40px;
          z-index: 0;
          pointer-events: none;
        }

        /* Typography & Utilities */
        .text-gradient {
          background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        
        .section-padding { padding: 100px 20px; position: relative; z-index: 10; }
        .max-w { max-width: 1200px; margin: 0 auto; }
        
        /* Buttons */
        .btn {
          text-decoration: none;
          font-weight: 700;
          border-radius: 50px;
          cursor: pointer;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: none;
          white-space: nowrap;
        }
        .btn-primary {
          background: linear-gradient(135deg, #fbbf24, #d97706);
          color: #000;
          padding: 14px 32px;
          font-size: 16px;
          box-shadow: 0 10px 25px rgba(217, 119, 6, 0.3);
        }
        .btn-primary:hover {
          transform: translateY(-3px) scale(1.02);
          box-shadow: 0 15px 35px rgba(217, 119, 6, 0.5);
        }

        /* Glassmorphism Cards */
        .glass-card {
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 24px;
          padding: 40px 30px;
          transition: transform 0.4s ease, border-color 0.4s ease, box-shadow 0.4s ease;
        }
        .glass-card:hover {
          transform: translateY(-10px);
          border-color: rgba(251, 191, 36, 0.4);
          background: rgba(15, 23, 42, 0.8);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5), 0 0 20px rgba(251, 191, 36, 0.1);
        }

        /* Animations */
        @keyframes float { 
          0%, 100% { transform: translateY(0) rotate(0deg); } 
          50% { transform: translateY(-15px) rotate(1deg); } 
        }
        .float-anim { animation: float 6s ease-in-out infinite; }

        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 40px rgba(251, 191, 36, 0.2); }
          50% { box-shadow: 0 0 80px rgba(251, 191, 36, 0.4); }
        }
        .glow-anim { animation: pulseGlow 4s infinite alternate; }

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-up { animation: fadeInUp 1s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
        .delay-1 { animation-delay: 0.2s; opacity: 0; }
        .delay-2 { animation-delay: 0.4s; opacity: 0; }
        .delay-3 { animation-delay: 0.6s; opacity: 0; }

        /* Form Inputs */
        .premium-input {
          width: 100%; padding: 18px 24px; border-radius: 16px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #fff; font-size: 16px; transition: all 0.3s;
          box-sizing: border-box;
        }
        .premium-input:focus {
          outline: none; border-color: #fbbf24;
          background: rgba(255, 255, 255, 0.05);
          box-shadow: 0 0 0 4px rgba(251, 191, 36, 0.1);
        }
        .premium-input::placeholder { color: #64748b; }

        /* Responsive Grids */
        .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px; }
        .grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 30px; }
        
        @media (max-width: 992px) {
          .grid-3 { grid-template-columns: repeat(2, 1fr); }
          .hero-title { font-size: 56px !important; }
        }
        @media (max-width: 768px) {
          .grid-3, .grid-2 { grid-template-columns: 1fr; }
          .hero-title { font-size: 42px !important; }
          .section-padding { padding: 80px 20px; }
          .mobile-col { flex-direction: column !important; text-align: center; }
          .mobile-center { justify-content: center !important; }
        }
      `}</style>

      {/* Background Layers */}
      <div className="bg-grid"></div>
      <div className="bg-mesh"></div>

      {/* --- NAVBAR --- */}
      <nav style={{
        position: 'fixed', top: 0, width: '100%',
        padding: scrolled ? '15px 0' : '25px 0',
        backgroundColor: scrolled ? 'rgba(5, 11, 20, 0.9)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.05)' : 'none',
        transition: 'all 0.4s ease', zIndex: 9999,
      }}>
        <div className="max-w" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
            <img src={Logo} alt="USDT Boomers" style={{ height: isMobile ? '85px' : '85px' }} />
          </Link>
          <div style={{ display: 'flex', gap: isMobile ? '10px' : '15px', alignItems: 'center' }}>
            <Link to="/login" className="btn" style={{ color: '#cbd5e1', padding: isMobile ? '8px 12px' : '10px 20px', fontSize: isMobile ? '14px' : '16px' }}>Sign In</Link>
            <Link to="/register" className="btn btn-primary" style={{ padding: isMobile ? '10px 16px' : '12px 28px', fontSize: isMobile ? '14px' : '16px' }}>Sign Up</Link>
          </div>
        </div>
      </nav>

      <main>
        {/* --- HERO SECTION --- */}
        <section className="section-padding max-w" style={{ 
          minHeight: '100vh', display: 'flex', alignItems: 'center', 
          paddingTop: isMobile ? '140px' : '200px' 
        }}>
          <div className="mobile-col" style={{ 
            display: 'flex', alignItems: 'center', gap: '60px', width: '100%' 
          }}>
            
            {/* Hero Content */}
            <div style={{ flex: '1.2' }} className="animate-up">
              <div style={{ 
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                padding: '8px 16px', background: 'rgba(251, 191, 36, 0.1)', 
                border: '1px solid rgba(251, 191, 36, 0.2)', borderRadius: '30px', 
                color: '#fbbf24', fontSize: '13px', fontWeight: '800', 
                letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '30px' 
              }}>
                <Gem size={16} /> Welcome to Decentralized Wealth
              </div>
              
              <h1 className="hero-title" style={{ 
                fontSize: '76px', fontWeight: '900', color: '#fff', 
                lineHeight: 1.1, marginBottom: '24px', letterSpacing: '-2px' 
              }}>
                Redefining Wealth.<br />
                Empowering <span className="text-gradient">Your Legacy.</span>
              </h1>
              
              <p style={{ 
                fontSize: isMobile ? '16px' : '20px', color: '#94a3b8', 
                lineHeight: 1.6, marginBottom: '45px', maxWidth: '600px', 
                margin: isMobile ? '0 auto 40px' : '0 0 40px' 
              }}>
                USDT BOOMERS is the ultimate P2P crowdfunding ecosystem. Join thousands globally multiplying their digital assets through transparent, automated, and secure smart matrix mechanics.
              </p>
              
              <div className="mobile-center" style={{ display: 'flex', gap: '20px' }}>
                <button onClick={() => navigate('/register')} className="btn btn-primary" style={{ padding: '18px 40px', fontSize: '18px' }}>
                  Start Earning <ArrowRight size={22} />
                </button>
              </div>
            </div>

            {/* Hero Image */}
            <div style={{ flex: '1', display: 'flex', justifyContent: 'center' }} className="animate-up delay-1 float-anim">
               <img src={HeroImage} alt="Platform Preview" style={{ 
                 width: '100%', maxWidth: isMobile ? '350px' : '550px', borderRadius: '40px', 
                 boxShadow: '0 30px 60px -15px rgba(251, 191, 36, 0.2)',
                 border: '1px solid rgba(255,255,255,0.1)'
               }} className="glow-anim" />
            </div>
          </div>
        </section>

        {/* --- DYNAMIC STATS BAR --- */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(15, 23, 42, 0.4)' }}>
          <div className="max-w" style={{ padding: '50px 20px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-around', gap: '30px' }}>
            {[
              { label: "Active Investors", end: 125000, suffix: "+" },
              { label: "Total Volume", prefix: "$", end: 45.2, suffix: "M", decimals: 1 },
              { label: "Countries Reached", end: 150, suffix: "+" },
              { label: "Uptime", end: 99.9, suffix: "%", decimals: 1 }
            ].map((stat, i) => (
              <div key={i} style={{ textAlign: 'center', flex: isMobile ? '1 1 40%' : '1 1 20%' }} className="animate-up delay-2">
                <div className="text-gradient" style={{ fontSize: isMobile ? '32px' : '42px', fontWeight: '900', marginBottom: '8px' }}>
                  <AnimatedCounter end={stat.end} prefix={stat.prefix} suffix={stat.suffix} decimals={stat.decimals} />
                </div>
                <div style={{ color: '#64748b', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600' }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* --- WHAT IS USDT BOOMERS (FEATURES) --- */}
        <section className="section-padding max-w" style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: isMobile ? '36px' : '52px', fontWeight: '900', marginBottom: '24px' }}>
            The Ultimate <span className="text-gradient">Crowdfunding</span> Engine
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '18px', maxWidth: '800px', margin: '0 auto 70px', lineHeight: 1.7 }}>
            USDT BOOMERS is not a traditional investment company; it is a meticulously engineered Peer-to-Peer (P2P) decentralized platform. By leveraging the stability of USDT (Tether), we eliminate market volatility.
          </p>

          <div className="grid-3">
            {[
              { icon: <Layers size={36} />, title: "Smart Matrix Mechanics", desc: "Automated distribution of funds with 0% hidden fees. Pure peer-to-peer synergy." },
              { icon: <Shield size={36} />, title: "Risk-Proof Architecture", desc: "Built on impenetrable protocols. Your funds interact only with verified contracts." },
              { icon: <TrendingUp size={36} />, title: "Exponential Scaling", desc: "Start small and compound your success. Our tiers are built for infinite growth." }
            ].map((feature, i) => (
              <div key={i} className="glass-card animate-up delay-3" style={{ textAlign: 'left' }}>
                <div style={{ background: 'rgba(251, 191, 36, 0.1)', color: '#fbbf24', width: '70px', height: '70px', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '25px' }}>
                  {feature.icon}
                </div>
                <h3 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '15px' }}>{feature.title}</h3>
                <p style={{ color: '#94a3b8', lineHeight: 1.6, fontSize: '16px' }}>{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* --- NEW SECTION: ECOSYSTEM TIERS & REWARDS --- */}
        <section style={{ backgroundColor: '#0b1320', borderTop: '1px solid rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
          <div className="section-padding max-w">
            <div style={{ textAlign: 'center', marginBottom: '60px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#60a5fa', background: 'rgba(59, 130, 246, 0.1)', padding: '8px 16px', borderRadius: '30px', fontWeight: '800', fontSize: '13px', textTransform: 'uppercase', marginBottom: '20px' }}>
                <Star size={16} /> Elite Opportunities
              </div>
              <h2 style={{ fontSize: isMobile ? '32px' : '48px', fontWeight: '900', color: '#fff' }}>
                Explore The <span style={{ color: '#60a5fa' }}>Boomer Tiers</span>
              </h2>
              <p style={{ color: '#94a3b8', marginTop: '15px', fontSize: '18px' }}>Unlock massive potential as you upgrade through our matrix ladders.</p>
            </div>

            <div className="grid-3">
              {[
                { tier: "Starter Matrix", price: "10 USDT", features: ["Global Auto-Pool Access", "Instant P2P Transfers", "Basic Support"] },
                { tier: "Pro Matrix", price: "60 USDT", features: ["Spillover Benefits", "Advanced Dashboard Insights", "Priority Support", "Team Building Bonus"] },
                { tier: "Elite Matrix", price: "120+ USDT", features: ["Unlimited Earning Potential", "VIP Wealth Strategy", "Top-Tier Placement", "Exclusive Community Access"] }
              ].map((pack, index) => (
                <div key={index} className="glass-card" style={{ display: 'flex', flexDirection: 'column', borderColor: index === 1 ? '#fbbf24' : 'rgba(255,255,255,0.08)', transform: index === 1 && !isMobile ? 'scale(1.05)' : 'none' }}>
                  {index === 1 && <div style={{ background: '#fbbf24', color: '#000', fontSize: '12px', fontWeight: '900', textAlign: 'center', padding: '6px', borderRadius: '10px', marginBottom: '20px', textTransform: 'uppercase' }}>Most Popular</div>}
                  <h3 style={{ fontSize: '22px', fontWeight: '700', color: '#fff' }}>{pack.tier}</h3>
                  <div style={{ fontSize: '40px', fontWeight: '900', margin: '20px 0', color: index === 1 ? '#fbbf24' : '#fff' }}>{pack.price}</div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 30px 0', flex: 1 }}>
                    {pack.features.map((feat, fIndex) => (
                      <li key={fIndex} style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#cbd5e1', marginBottom: '15px' }}>
                        <CheckCircle size={18} color={index === 1 ? '#fbbf24' : '#60a5fa'} /> {feat}
                      </li>
                    ))}
                  </ul>
                  <button onClick={() => navigate('/register')} className="btn" style={{ background: index === 1 ? 'linear-gradient(135deg, #fbbf24, #d97706)' : 'rgba(255,255,255,0.05)', color: index === 1 ? '#000' : '#fff', padding: '15px', width: '100%', border: index !== 1 ? '1px solid rgba(255,255,255,0.1)' : 'none' }}>
                    Activate Now
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* --- HOW IT WORKS (STEP-BY-STEP) --- */}
        <section style={{ background: 'linear-gradient(180deg, rgba(15, 23, 42, 0) 0%, rgba(15, 23, 42, 0.8) 100%)', paddingBottom: '120px' }}>
          <div className="section-padding max-w">
            <div className="mobile-col" style={{ display: 'flex', alignItems: 'center', gap: '60px' }}>
              
              <div style={{ flex: '1', textAlign: isMobile ? 'center' : 'left' }}>
                <h2 style={{ fontSize: isMobile ? '36px' : '48px', fontWeight: '900', marginBottom: '30px', lineHeight: 1.2 }}>
                  How to Ignite Your <br/><span className="text-gradient">Wealth Cycle</span>
                </h2>
                <p style={{ color: '#94a3b8', fontSize: '18px', marginBottom: '40px' }}>
                  Joining the revolution is seamless. Follow these steps to activate your position in the world's fastest-growing USDT ecosystem.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', textAlign: 'left' }}>
                  {[
                    { step: "01", title: "Create Your Account", desc: "Register securely on our portal. It takes less than 2 minutes." },
                    { step: "02", title: "Fund Your Wallet", desc: "Deposit USDT (TRC20/BEP20) to ensure lightning-fast, zero-fee transactions." },
                    { step: "03", title: "Activate Crowdfunding Matrix", desc: "Choose your tier and let the automated peer-to-peer distribution do the rest." }
                  ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                      <div style={{ color: '#fbbf24', fontSize: '28px', fontWeight: '900', opacity: 0.5 }}>{item.step}</div>
                      <div>
                        <h4 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>{item.title}</h4>
                        <p style={{ color: '#64748b', lineHeight: 1.5 }}>{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ flex: '1', position: 'relative', display: 'flex', justifyContent: 'center' }} className="float-anim">
                 {/* Abstract visual representation of a matrix */}
                 <div style={{ width: '100%', maxWidth: '400px', height: '400px', background: 'radial-gradient(circle, rgba(251,191,36,0.15) 0%, rgba(15,23,42,0) 70%)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                    <div style={{ width: '130px', height: '130px', borderRadius: '50%', background: 'linear-gradient(135deg, #fbbf24, #d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 50px rgba(251,191,36,0.5)', zIndex: 2 }}>
                       <img src={Logo} alt="Logo" style={{ width: '60%' }}/>
                    </div>
                    {/* Orbit rings */}
                    <div style={{ position: 'absolute', width: '250px', height: '250px', borderRadius: '50%', border: '1px dashed rgba(255,255,255,0.2)', animation: 'spin 20s linear infinite' }}></div>
                    <div style={{ position: 'absolute', width: '380px', height: '380px', borderRadius: '50%', border: '1px dashed rgba(255,255,255,0.1)', animation: 'spin 30s linear infinite reverse' }}></div>
                    <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
                 </div>
              </div>
            </div>
          </div>
        </section>

        {/* --- PREMIUM SUPPORT SECTION --- */}
        <section className="section-padding max-w">
          <div className="glass-card" style={{ maxWidth: '900px', margin: '0 auto', padding: isMobile ? '40px 20px' : '80px 60px', border: '1px solid rgba(251, 191, 36, 0.2)' }}>
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '15px' }}><Lock size={40} color="#fbbf24" /></div>
              <h2 style={{ fontSize: isMobile ? '32px' : '42px', fontWeight: '900', marginBottom: '15px' }}>Priority <span className="text-gradient">Support</span></h2>
              <p style={{ color: '#94a3b8', fontSize: '18px' }}>Our Client Success Team operates 24/7. Connect with us to resolve any queries.</p>
            </div>
             
            <form onSubmit={handleSupportSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div className="mobile-col" style={{ display: 'flex', gap: '24px' }}>
                <input type="text" placeholder="Your Full Name" required className="premium-input" style={{ flex: 1 }} />
                <input type="email" placeholder="Your Email Address" required className="premium-input" style={{ flex: 1 }} />
              </div>
              <textarea placeholder="Outline your inquiry here..." rows="5" required className="premium-input" style={{ resize: 'none' }}></textarea>
              <button type="submit" className="btn btn-primary" style={{ padding: '20px', fontSize: '18px', width: '100%', marginTop: '10px' }}>
                Transmit Message <ArrowRight size={20} />
              </button>
            </form>
          </div>
        </section>

        {/* --- FOOTER --- */}
        <footer style={{ 
          borderTop: '1px solid rgba(255,255,255,0.05)', 
          padding: '60px 20px 40px',
          backgroundColor: '#03070c',
          textAlign: 'center'
        }}>
          <div className="max-w">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px', marginBottom: '25px' }}>
                <img src={Logo} alt="Logo" style={{ height: '45px' }} />
                <span style={{ fontSize: '28px', fontWeight: '900', color: '#fff', letterSpacing: '1px' }}>
                  USDT<span className="text-gradient">BOOMERS</span>
                </span>
            </div>
            <p style={{ color: '#64748b', fontSize: '15px', maxWidth: '500px', margin: '0 auto 30px', lineHeight: 1.6 }}>
              The definitive global standard for decentralized USDT crowdfunding. Build wealth seamlessly, transparently, and infinitely.
            </p>
            <div style={{ height: '1px', width: '100%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)', margin: '30px 0' }}></div>
            <p style={{ color: '#475569', fontSize: '14px', margin: 0 }}>
              &copy; {new Date().getFullYear()} USDT BOOMERS Ecosystem. All rights reserved.
            </p>
          </div>
        </footer>
      </main>

      {/* --- SUCCESS MODAL --- */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)' }}>
          <div className="animate-up" style={{ backgroundColor: '#0f172a', border: '1px solid #fbbf24', padding: '50px 40px', borderRadius: '30px', maxWidth: '450px', width: '100%', textAlign: 'center', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}>
            <div style={{ color: '#fbbf24', marginBottom: '25px', display: 'flex', justifyContent: 'center' }}>
              <CheckCircle size={60} />
            </div>
            <h3 style={{ fontSize: '28px', fontWeight: '900', marginBottom: '15px', color: '#fff' }}>Transmission Successful!</h3>
            <p style={{ color: '#94a3b8', marginBottom: '40px', fontSize: '16px', lineHeight: 1.6 }}>{modalMessage}</p>
            <button onClick={() => setIsModalOpen(false)} className="btn btn-primary" style={{ width: '100%', padding: '16px' }}>
              Acknowledge
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;