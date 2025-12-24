// /src/pages/Home.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';

function Home() {
  const navigate = useNavigate();

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f0f2f5',
      padding: '20px'
    }}>
      <h1>Welcome to Our MLM Platform</h1>
      <p style={{ fontSize: '18px', color: '#555', marginBottom: '40px' }}>
        Please login or register to continue
      </p>

      <div style={{ display: 'flex', gap: '20px' }}>
        <button
          onClick={() => navigate('/login')}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            cursor: 'pointer',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: '#007bff',
            color: 'white',
            boxShadow: '0 2px 6px rgba(0,123,255,0.5)'
          }}
        >
          Login
        </button>

        <button
          onClick={() => navigate('/register')}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            cursor: 'pointer',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: '#28a745',
            color: 'white',
            boxShadow: '0 2px 6px rgba(40,167,69,0.5)'
          }}
        >
          Register
        </button>
      </div>
    </div>
  );
}

export default Home;
