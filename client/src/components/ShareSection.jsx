import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

const ShareSection = () => {
  const websiteUrl = 'https://www.riddickchess.site';
  const [copied, setCopied] = useState(false);

  const copyLink = () => {
    navigator.clipboard.writeText(websiteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: 'Riddick Chess',
        text: 'Check out this awesome chess platform!',
        url: websiteUrl,
      });
    }
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, #1a1a2e 0%, #2d1b4e 100%)',
      borderRadius: '24px',
      padding: '40px',
      margin: '30px auto',
      maxWidth: '500px',
      textAlign: 'center',
      border: '3px solid #8b5cf6',
      boxShadow: '0 20px 60px rgba(139, 92, 246, 0.3)',
    }}>
      <h2 style={{ 
        color: '#fff', 
        fontSize: '28px', 
        marginTop: 0,
        marginBottom: '10px',
      }}>
        📤 Share Riddick Chess!
      </h2>
      <p style={{ color: '#a78bfa', marginBottom: '25px', fontSize: '16px' }}>
        Invite your friends to play chess!
      </p>

      {/* Big QR Code */}
      <div style={{
        background: '#ffffff',
        padding: '25px',
        borderRadius: '20px',
        display: 'inline-block',
        marginBottom: '25px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
      }}>
        <QRCodeSVG 
          value={websiteUrl} 
          size={220}
          level="H"
          includeMargin={true}
          style={{ display: 'block' }}
        />
      </div>

      <p style={{ color: '#94a3b8', marginBottom: '20px', fontSize: '14px' }}>
        👆 Scan with your phone camera
      </p>

      {/* Link copy section */}
      <div style={{
        background: '#0a0a0f',
        padding: '15px',
        borderRadius: '12px',
        marginBottom: '25px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}>
        <span style={{ color: '#8b5cf6', flex: 1, fontSize: '15px', fontWeight: '500' }}>
          {websiteUrl}
        </span>
        <button
          onClick={copyLink}
          style={{
            background: copied ? '#22c55e' : '#8b5cf6',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            padding: '12px 24px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '14px',
            transition: 'background 0.3s',
          }}
        >
          {copied ? '✓ Copied!' : 'Copy'}
        </button>
      </div>

      {/* Big Share Button */}
      <button
        onClick={handleShare}
        style={{
          background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
          color: 'white',
          border: 'none',
          borderRadius: '16px',
          padding: '18px 50px',
          fontSize: '20px',
          fontWeight: 'bold',
          cursor: 'pointer',
          boxShadow: '0 8px 30px rgba(139, 92, 246, 0.5)',
          marginBottom: '25px',
          width: '100%',
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
        onMouseOver={(e) => {
          e.target.style.transform = 'scale(1.02)';
          e.target.style.boxShadow = '0 12px 40px rgba(139, 92, 246, 0.7)';
        }}
        onMouseOut={(e) => {
          e.target.style.transform = 'scale(1)';
          e.target.style.boxShadow = '0 8px 30px rgba(139, 92, 246, 0.5)';
        }}
      >
        📤 Share Now
      </button>

      {/* Social buttons */}
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
        <a href={`https://twitter.com/intent/tweet?text=Check%20out%20Riddick%20Chess!&url=${websiteUrl}`} target="_blank" rel="noopener noreferrer" style={{ background: '#1da1f2', color: 'white', padding: '12px 20px', borderRadius: '12px', textDecoration: 'none', fontWeight: 'bold', fontSize: '14px' }}>Twitter</a>
        <a href={`https://wa.me/?text=Check%20out%20Riddick%20Chess!%20${websiteUrl}`} target="_blank" rel="noopener noreferrer" style={{ background: '#25d366', color: 'white', padding: '12px 20px', borderRadius: '12px', textDecoration: 'none', fontWeight: 'bold', fontSize: '14px' }}>WhatsApp</a>
        <a href="#" onClick={(e) => { e.preventDefault(); alert('Screenshot the QR code and share on WeChat!'); }} style={{ background: '#07c160', color: 'white', padding: '12px 20px', borderRadius: '12px', textDecoration: 'none', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' }}>WeChat</a>
        <a href="#" onClick={(e) => { e.preventDefault(); alert('Screenshot the QR code and share on RedNote!'); }} style={{ background: '#fe2c55', color: 'white', padding: '12px 20px', borderRadius: '12px', textDecoration: 'none', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' }}>RedNote</a>
      </div>
    </div>
  );
};

export default ShareSection;

