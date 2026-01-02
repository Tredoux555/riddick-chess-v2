import { useEffect } from 'react';

const FakeAdmin = () => {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'auto'; };
  }, []);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: '#000',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999
    }}>
      <div style={{ fontSize: '150px', marginBottom: '20px' }}>🖕</div>
      <h1 style={{ 
        color: '#fff', 
        fontSize: '72px', 
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: '10px',
        margin: 0
      }}>
        HA IDIOT
      </h1>
      <p style={{ color: '#666', marginTop: '30px', fontSize: '14px' }}>
        Nice try though 😂
      </p>
    </div>
  );
};

export default FakeAdmin;
