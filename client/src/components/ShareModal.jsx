import React, { useState } from 'react';
import { 
  FaShare, FaWhatsapp, FaTelegram, FaFacebook, FaTwitter, 
  FaLinkedin, FaEnvelope, FaCopy, FaCheck, FaTimes, FaWeixin
} from 'react-icons/fa';
import toast from 'react-hot-toast';

const ShareModal = ({ isOpen, onClose, url, title, text }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const shareUrl = url || window.location.href;
  const shareTitle = title || 'Check this out!';
  const shareText = text || '';

  const shareOptions = [
    {
      name: 'WhatsApp',
      icon: FaWhatsapp,
      color: '#25D366',
      url: `https://wa.me/?text=${encodeURIComponent(shareTitle + ' ' + shareUrl)}`
    },
    {
      name: 'WeChat',
      icon: FaWeixin,
      color: '#07C160',
      action: 'copy' // WeChat requires copying link to paste in app
    },
    {
      name: 'Telegram',
      icon: FaTelegram,
      color: '#0088cc',
      url: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`
    },
    {
      name: 'Facebook',
      icon: FaFacebook,
      color: '#1877F2',
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`
    },
    {
      name: 'Twitter',
      icon: FaTwitter,
      color: '#1DA1F2',
      url: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`
    },
    {
      name: 'LinkedIn',
      icon: FaLinkedin,
      color: '#0A66C2',
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`
    },
    {
      name: 'Email',
      icon: FaEnvelope,
      color: '#EA4335',
      url: `mailto:?subject=${encodeURIComponent(shareTitle)}&body=${encodeURIComponent(shareText + '\n\n' + shareUrl)}`
    }
  ];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Link copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy');
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Share failed:', err);
        }
      }
    }
  };

  const handleShareClick = (option) => {
    if (option.action === 'copy') {
      // For WeChat, copy link to clipboard
      navigator.clipboard.writeText(shareUrl).then(() => {
        toast.success('Link copied! Paste in WeChat to share');
      }).catch(() => {
        toast.error('Failed to copy');
      });
      return;
    }
    window.open(option.url, '_blank', 'width=600,height=400');
  };

  return (
    <div className="share-modal-overlay" onClick={onClose}>
      <div className="share-modal" onClick={e => e.stopPropagation()}>
        <div className="share-header">
          <h3><FaShare /> Share</h3>
          <button className="close-btn" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <div className="share-content">
          {/* Copy Link Section */}
          <div className="copy-link-section">
            <input 
              type="text" 
              value={shareUrl} 
              readOnly 
              className="link-input"
            />
            <button 
              className={`copy-btn ${copied ? 'copied' : ''}`}
              onClick={handleCopy}
            >
              {copied ? <FaCheck /> : <FaCopy />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>

          {/* Native Share (Mobile) */}
          {navigator.share && (
            <button className="native-share-btn" onClick={handleNativeShare}>
              <FaShare /> Share via...
            </button>
          )}

          {/* Share Apps Grid */}
          <div className="share-apps">
            {shareOptions.map(option => (
              <button
                key={option.name}
                className="share-app-btn"
                onClick={() => handleShareClick(option)}
                style={{ '--app-color': option.color }}
              >
                <option.icon className="app-icon" />
                <span>{option.name}</span>
              </button>
            ))}
          </div>
        </div>

        <style jsx>{`
          .share-modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            padding: 1rem;
          }
          .share-modal {
            background: #1e1e2e;
            border-radius: 16px;
            max-width: 400px;
            width: 100%;
            overflow: hidden;
            box-shadow: 0 10px 40px rgba(0,0,0,0.5);
          }
          .share-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1rem 1.5rem;
            border-bottom: 1px solid #333;
          }
          .share-header h3 {
            color: #fff;
            margin: 0;
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }
          .close-btn {
            background: none;
            border: none;
            color: #888;
            cursor: pointer;
            font-size: 1.2rem;
            padding: 0.5rem;
          }
          .close-btn:hover { color: #fff; }
          .share-content {
            padding: 1.5rem;
          }
          .copy-link-section {
            display: flex;
            gap: 0.5rem;
            margin-bottom: 1rem;
          }
          .link-input {
            flex: 1;
            background: #2a2a3e;
            border: 1px solid #444;
            border-radius: 8px;
            padding: 0.75rem;
            color: #fff;
            font-size: 0.9rem;
          }
          .copy-btn {
            background: #769656;
            border: none;
            border-radius: 8px;
            padding: 0.75rem 1rem;
            color: #fff;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            transition: all 0.2s;
          }
          .copy-btn:hover { background: #8aad62; }
          .copy-btn.copied { background: #4caf50; }
          .native-share-btn {
            width: 100%;
            background: #3a3a4e;
            border: none;
            border-radius: 8px;
            padding: 1rem;
            color: #fff;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            margin-bottom: 1rem;
            font-size: 1rem;
          }
          .native-share-btn:hover { background: #4a4a5e; }
          .share-apps {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 0.75rem;
          }
          .share-app-btn {
            background: #2a2a3e;
            border: none;
            border-radius: 12px;
            padding: 1rem;
            cursor: pointer;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0.5rem;
            transition: all 0.2s;
          }
          .share-app-btn:hover {
            background: var(--app-color);
            transform: translateY(-2px);
          }
          .app-icon {
            font-size: 1.5rem;
            color: var(--app-color);
          }
          .share-app-btn:hover .app-icon { color: #fff; }
          .share-app-btn span {
            color: #aaa;
            font-size: 0.8rem;
          }
          .share-app-btn:hover span { color: #fff; }
        `}</style>
      </div>
    </div>
  );
};

export default ShareModal;
