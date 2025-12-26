import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, Zap, Globe, Mail, ArrowRight, X, User, MessageSquare } from 'lucide-react';
import HeroImage from '../../assets/hero.png';
import Logo from '../../assets/eliteinfinitylogo.png';

const Home = () => {
  const navigate = useNavigate();
  const [supportData, setSupportData] = useState({ name: '', email: '', message: '' });
  const [modalMessage, setModalMessage] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Layout aur Scroll Handle karne ke liye
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    const handleScroll = () => setScrolled(window.scrollY > 20);
    
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const handleSupportSubmit = (e) => {
    e.preventDefault();
    setModalMessage('✨ Message Sent! Our team will contact you shortly.');
    setIsModalOpen(true);
    setSupportData({ name: '', email: '', message: '' });
  };

  // --- PREMIUM INLINE STYLES ---
  const styles = {
    container: {
      backgroundColor: '#0f172a',
      minHeight: '100vh',
      color: '#f8fafc',
      position: 'relative',
      overflowX: 'hidden',
      fontFamily: 'sans-serif',
    },
    backgroundGrid: {
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundImage: 'radial-gradient(#334155 1px, transparent 1px)',
      backgroundSize: '30px 30px',
      opacity: 0.15,
      zIndex: 0,
      pointerEvents: 'none',
    },
    navbar: {
      position: 'fixed',
      top: 0, width: '100%',
      padding: scrolled ? '12px 0' : '24px 0',
      backgroundColor: scrolled ? 'rgba(15, 23, 42, 0.95)' : 'transparent',
      backdropFilter: scrolled ? 'blur(12px)' : 'none',
      borderBottom: scrolled ? '1px solid #1e293b' : 'none',
      transition: 'all 0.4s ease',
      zIndex: 9999,
    },
    navContent: {
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '0 20px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    btnLink: {
      textDecoration: 'none',
      fontWeight: '700',
      padding: '10px 24px',
      borderRadius: '50px',
      cursor: 'pointer',
      fontSize: '15px',
      transition: '0.3s',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
    },
    btnPrimary: {
      background: 'linear-gradient(135deg, #fbbf24, #d97706)',
      color: '#000',
      border: 'none',
      boxShadow: '0 8px 20px rgba(217, 119, 6, 0.3)',
    },
    heroSection: {
      maxWidth: '1200px',
      margin: '0 auto',
      padding: isMobile ? '140px 20px 60px' : '200px 20px 100px',
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      alignItems: 'center',
      gap: '50px',
      position: 'relative',
      zIndex: 10,
    },
    featureCard: {
      flex: '1',
      minWidth: '280px',
      padding: '40px 30px',
      backgroundColor: 'rgba(30, 41, 59, 0.5)',
      borderRadius: '24px',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      backdropFilter: 'blur(10px)',
      textAlign: 'left',
    }
  };

  return (
    <div style={styles.container}>
      <style>{`
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }
        .float-anim { animation: float 5s ease-in-out infinite; }
        input::placeholder, textarea::placeholder { color: #64748b; }
      `}</style>

      {/* Background Layer */}
      <div style={styles.backgroundGrid}></div>

      {/* --- NAVBAR --- */}
      <nav style={styles.navbar}>
        <div style={styles.navContent}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <img src={Logo} alt="Logo" style={{ height: isMobile ? '35px' : '45px' }} />
           
          </Link>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <Link to="/login" style={{ ...styles.btnLink, color: '#94a3b8', padding: '10px 15px' }}>Login</Link>
            <Link to="/register" style={{ ...styles.btnLink, ...styles.btnPrimary, padding: isMobile ? '8px 16px' : '10px 24px' }}>Sign Up</Link>
          </div>
        </div>
      </nav>

      <main>
        {/* --- HERO SECTION --- */}
        <section style={styles.heroSection}>
          <div style={{ flex: '1.2', textAlign: isMobile ? 'center' : 'left' }}>
            <div style={{ display: 'inline-block', padding: '6px 14px', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', fontSize: '12px', fontWeight: '800', borderRadius: '20px', marginBottom: '20px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
              🚀 THE TOKEN ECONOMY REVOLUTION
            </div>
            <h1 style={{ fontSize: isMobile ? '40px' : '70px', fontWeight: '900', color: '#fff', lineHeight: 1.1, marginBottom: '25px', letterSpacing: '-1px' }}>
              Build Your <br />
              <span style={{ background: 'linear-gradient(to right, #fbbf24, #f59e0b, #ef4444)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Digital Legacy
              </span>
            </h1>
            <p style={{ fontSize: '18px', color: '#94a3b8', marginBottom: '40px', maxWidth: '550px', margin: isMobile ? '0 auto 40px' : '0 0 40px' }}>
              EliteInfinity connects you with global opportunities. Thrive in a vibrant digital ecosystem designed for sustainable growth.
            </p>
            <div style={{ display: 'flex', justifyContent: isMobile ? 'center' : 'flex-start' }}>
              <button onClick={() => navigate('/register')} style={{ ...styles.btnLink, ...styles.btnPrimary, padding: '16px 36px', fontSize: '17px' }}>
                Get Started <ArrowRight size={20} />
              </button>
            </div>
          </div>

          <div style={{ flex: '1', display: 'flex', justifyContent: 'center' }} className="float-anim">
             <img src={HeroImage} alt="Hero" style={{ width: '100%', maxWidth: '500px', borderRadius: '30px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }} />
          </div>
        </section>

        {/* --- FEATURES SECTION --- */}
        <section id="features" style={{ backgroundColor: 'rgba(15, 23, 42, 0.7)', padding: '100px 20px', borderTop: '1px solid #1e293b' }}>
           <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
              <h2 style={{ fontSize: isMobile ? '32px' : '42px', fontWeight: '800', color: '#fff', marginBottom: '60px' }}>Why Choose Us?</h2>
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '25px', justifyContent: 'center' }}>
                {[
                  { icon: <Zap size={32} />, title: "Innovation", text: "Fresh ideas and modern solutions for the decentralized space." },
                  { icon: <Globe size={32} />, title: "Global Reach", text: "Connect with individuals and grow together worldwide." },
                  { icon: <Shield size={32} />, title: "Secure Growth", text: "Secure tools and resources designed to protect your assets." }
                ].map((item, i) => (
                  <div key={i} style={styles.featureCard}>
                    <div style={{ color: '#fbbf24', marginBottom: '20px', backgroundColor: 'rgba(251, 191, 36, 0.1)', width: '60px', height: '60px', borderRadius: '15px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>{item.icon}</div>
                    <h3 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '12px' }}>{item.title}</h3>
                    <p style={{ color: '#94a3b8', lineHeight: 1.6 }}>{item.text}</p>
                  </div>
                ))}
              </div>
           </div>
        </section>

        {/* --- SUPPORT SECTION --- */}
        <section style={{ padding: '100px 20px' }}>
          <div style={{ maxWidth: '850px', margin: '0 auto', backgroundColor: '#0f172a', padding: isMobile ? '40px 20px' : '60px 40px', borderRadius: '32px', border: '1px solid #1e293b', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)' }}>
             <h2 style={{ fontSize: '32px', fontWeight: '800', textAlign: 'center', marginBottom: '15px' }}>Need Support?</h2>
             <p style={{ textAlign: 'center', color: '#94a3b8', marginBottom: '40px' }}>Our team is here to help you 24/7</p>
             
             <form onSubmit={handleSupportSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '20px' }}>
                  <input type="text" placeholder="Full Name" required style={{ flex: 1, padding: '16px', borderRadius: '12px', backgroundColor: '#1e293b', border: '1px solid #334155', color: '#fff', outline: 'none' }} />
                  <input type="email" placeholder="Email Address" required style={{ flex: 1, padding: '16px', borderRadius: '12px', backgroundColor: '#1e293b', border: '1px solid #334155', color: '#fff', outline: 'none' }} />
                </div>
                <textarea placeholder="How can we help you?" rows="5" required style={{ padding: '16px', borderRadius: '12px', backgroundColor: '#1e293b', border: '1px solid #334155', color: '#fff', outline: 'none', resize: 'none' }}></textarea>
                <button type="submit" style={{ ...styles.btnLink, ...styles.btnPrimary, justifyContent: 'center', padding: '18px', fontSize: '16px', marginTop: '10px' }}>
                  Send Message
                </button>
             </form>
          </div>
        </section>

        {/* --- FOOTER --- */}
     <footer style={{ 
    borderTop: '1px solid #1e293b', 
    padding: isMobile ? '40px 20px' : '60px 0', // Mobile par padding kam kar di
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center', // Horizontal center
    justifyContent: 'center', // Vertical center
    backgroundColor: '#0b1121',
    width: '100%'
}}>
    {/* Logo aur Brand Name Center mein */}
    <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '12px', 
        marginBottom: '20px',
        justifyContent: 'center' 
    }}>
        <img src={Logo} alt="Logo" style={{ height: '35px', opacity: 0.8 }} />
        <span style={{ 
            fontSize: '22px', 
            fontWeight: '800', 
            color: '#fff',
            letterSpacing: '0.5px'
        }}>
            Elite<span style={{ color: '#fbbf24' }}>Infinity</span>
        </span>
    </div>

    {/* Copyright Text */}
    <p style={{ 
        color: '#475569', 
        fontSize: '14px', 
        margin: 0,
        textAlign: 'center'
    }}>
        &copy; {new Date().getFullYear()} EliteInfinity. All rights reserved.
    </p>
</footer>
      </main>

      {/* --- MODAL --- */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)' }}>
          <div style={{ backgroundColor: '#0f172a', border: '1px solid #fbbf24', padding: '40px', borderRadius: '24px', maxWidth: '400px', width: '100%', textAlign: 'center' }}>
            <div className='pl-24' style={{ color: '#fbbf24', marginBottom: '20px' }}><Zap size={50} /></div>
            <h3 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '10px' }}>Success!</h3>
            <p style={{ color: '#94a3b8', marginBottom: '30px' }}>{modalMessage}</p>
            <button onClick={() => setIsModalOpen(false)} style={{ ...styles.btnLink, ...styles.btnPrimary, width: '100%', justifyContent: 'center' }}>Continue</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;