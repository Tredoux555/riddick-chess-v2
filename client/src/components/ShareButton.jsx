import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

const ShareButton = () => {
  const [showModal, setShowModal] = useState(false);
  const websiteUrl = 'https://www.riddickchess.site';

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Riddick Chess',
          text: 'Check out this awesome chess platform!',
          url: websiteUrl,
        });
      } catch (err) {
        setShowModal(true);
      }
    } else {
      setShowModal(true);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(websiteUrl);
    alert('Link copied!');
  };

  return (
    <>
      <button
        onClick={handleShare}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
          color: 'white',
          border: 'none',
          borderRadius: '50px',
          padding: '12px 24px',
          fontSize: '16px',
          fontWeight: 'bold',
          cursor: 'pointer',
          boxShadow: '0 4px 15px rgba(139, 92, 246, 0.4)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          zIndex: 1000,
        }}
      >
        📤 Share
      </button>

      {showModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{
              background: '#1a1a2e',
              borderRadius: '20px',
              padding: '30px',
              maxWidth: '400px',
              width: '90%',
              textAlign: 'center',
              border: '2px solid #8b5cf6',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ color: '#fff', marginTop: 0 }}>📤 Share Riddick Chess</h2>
            
            <div style={{ background: '#fff', padding: '20px', borderRadius: '15px', display: 'inline-block', marginBottom: '20px' }}>
              <QRCodeSVG value={websiteUrl} size={180} level="H" includeMargin={true} />
            </div>
            
            <p style={{ color: '#c8d0e0', marginBottom: '20px' }}>Scan the QR code or share the link!</p>

            <div style={{ background: '#0a0a0f', padding: '12px', borderRadius: '10px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ color: '#8b5cf6', flex: 1, fontSize: '14px' }}>{websiteUrl}</span>
              <button onClick={copyLink} style={{ background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontWeight: 'bold' }}>Copy</button>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <a href={`https://twitter.com/intent/tweet?text=Check%20out%20Riddick%20Chess!&url=${websiteUrl}`} target="_blank" rel="noopener noreferrer" style={{ background: '#1da1f2', color: 'white', padding: '10px 20px', borderRadius: '10px', textDecoration: 'none', fontWeight: 'bold' }}>Twitter</a>
              <a href={`https://wa.me/?text=Check%20out%20Riddick%20Chess!%20${websiteUrl}`} target="_blank" rel="noopener noreferrer" style={{ background: '#25d366', color: 'white', padding: '10px 20px', borderRadius: '10px', textDecoration: 'none', fontWeight: 'bold' }}>WhatsApp</a>
              <a href={`weixin://`} onClick={(e) => { e.preventDefault(); alert('Screenshot the QR code and share on WeChat!'); }} style={{ background: '#07c160', color: 'white', padding: '10px 20px', borderRadius: '10px', textDecoration: 'none', fontWeight: 'bold', cursor: 'pointer' }}>WeChat</a>
              <a href={`https://www.xiaohongshu.com`} onClick={(e) => { e.preventDefault(); alert('Screenshot the QR code and share on RedNote!'); }} style={{ background: '#fe2c55', color: 'white', padding: '10px 20px', borderRadius: '10px', textDecoration: 'none', fontWeight: 'bold', cursor: 'pointer' }}>RedNote</a>
            </div>

            <button onClick={() => setShowModal(false)} style={{ marginTop: '20px', background: 'transparent', color: '#c8d0e0', border: '1px solid #94a3b8', borderRadius: '10px', padding: '10px 30px', cursor: 'pointer' }}>Close</button>
          </div>
        </div>
      )}
    </>
  );
};

export default ShareButton;

