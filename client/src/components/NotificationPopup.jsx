import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { FaTrophy, FaBell, FaTimes, FaCheck } from 'react-icons/fa';

const NotificationPopup = () => {
  const { socket } = useSocket();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activePopup, setActivePopup] = useState(null);

  // Load unread notifications on mount
  const loadNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const [notifRes, countRes] = await Promise.all([
        axios.get('/api/notifications/unread'),
        axios.get('/api/notifications/count')
      ]);
      setNotifications(notifRes.data || []);
      setUnreadCount(countRes.data?.count || 0);

      // Show popup for the most recent unread tournament invite
      const unreadInvite = (notifRes.data || []).find(
        n => n.type === 'tournament_invite' && !n.read_at
      );
      if (unreadInvite && !activePopup) {
        setActivePopup(unreadInvite);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  }, [user, activePopup]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Listen for real-time notifications
  useEffect(() => {
    if (!socket) return;

    const handleNotification = (notif) => {
      setNotifications(prev => [notif, ...prev]);
      setUnreadCount(prev => prev + 1);
      // Show popup immediately for tournament invites
      if (notif.type === 'tournament_invite') {
        setActivePopup(notif);
      }
    };

    socket.on('notification', handleNotification);
    return () => socket.off('notification', handleNotification);
  }, [socket]);

  const handleAccept = async (notif) => {
    try {
      await axios.post(`/api/notifications/${notif.id}/read`);
      setActivePopup(null);
      setUnreadCount(prev => Math.max(0, prev - 1));
      setNotifications(prev => prev.filter(n => n.id !== notif.id));
      const data = typeof notif.data === 'string' ? JSON.parse(notif.data) : notif.data;
      navigate(`/tournament/${data.tournamentId}`);
    } catch (err) { console.error(err); }
  };

  const handleDismiss = async (notif) => {
    try {
      await axios.post(`/api/notifications/${notif.id}/dismiss`);
      setActivePopup(null);
      setUnreadCount(prev => Math.max(0, prev - 1));
      setNotifications(prev => prev.filter(n => n.id !== notif.id));
    } catch (err) { console.error(err); }
  };

  const handleDismissAll = async () => {
    try {
      await axios.post('/api/notifications/dismiss-all');
      setNotifications([]);
      setUnreadCount(0);
      setShowDropdown(false);
    } catch (err) { console.error(err); }
  };

  if (!user) return null;

  return (
    <>
      {/* Bell Icon with Badge */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => { setShowDropdown(!showDropdown); if (!showDropdown) loadNotifications(); }}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-primary)', fontSize: '18px', padding: '6px',
            position: 'relative'
          }}
          title="Notifications"
        >
          <FaBell />
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute', top: '-2px', right: '-4px',
              background: '#ef4444', color: 'white', borderRadius: '50%',
              width: '18px', height: '18px', fontSize: '11px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 'bold'
            }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* Dropdown List */}
        {showDropdown && (
          <div style={{
            position: 'absolute', top: '100%', right: 0,
            background: 'var(--bg-card-solid, #1e1e2e)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px', width: '320px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            zIndex: 10000, overflow: 'hidden'
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '12px 16px', borderBottom: '1px solid var(--border-color)'
            }}>
              <strong style={{ color: 'var(--text-primary)' }}>Notifications</strong>
              {notifications.length > 0 && (
                <button onClick={handleDismissAll} style={{
                  background: 'none', border: 'none', color: 'var(--text-secondary)',
                  cursor: 'pointer', fontSize: '12px'
                }}>
                  Clear all
                </button>
              )}
            </div>
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {notifications.length === 0 ? (
                <p style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)', margin: 0 }}>
                  No notifications
                </p>
              ) : (
                notifications.map(n => {
                  const data = typeof n.data === 'string' ? JSON.parse(n.data) : n.data;
                  return (
                    <div key={n.id} style={{
                      padding: '12px 16px', borderBottom: '1px solid var(--border-color)',
                      display: 'flex', alignItems: 'center', gap: '10px',
                      background: n.read_at ? 'transparent' : 'rgba(99, 102, 241, 0.08)',
                      cursor: 'pointer'
                    }} onClick={() => handleAccept(n)}>
                      <FaTrophy style={{ color: '#f59e0b', flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 'bold', fontSize: '13px', color: 'var(--text-primary)' }}>{n.title}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{n.message}</div>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); handleDismiss(n); }}
                        style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}>
                        <FaTimes />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Full-Screen Popup for Tournament Invites */}
      {activePopup && (() => {
        const data = typeof activePopup.data === 'string' ? JSON.parse(activePopup.data) : activePopup.data;
        return (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 99999
          }}>
            <div style={{
              background: 'var(--bg-card-solid, #1e1e2e)',
              borderRadius: '16px', padding: '32px',
              textAlign: 'center', maxWidth: '400px', width: '90%',
              border: '2px solid #f59e0b',
              boxShadow: '0 0 40px rgba(245, 158, 11, 0.2)'
            }}>
              <FaTrophy style={{ fontSize: '48px', color: '#f59e0b', marginBottom: '16px' }} />
              <h2 style={{ color: 'var(--text-primary)', margin: '0 0 8px 0' }}>Tournament Invite!</h2>
              <p style={{ color: 'var(--text-secondary)', margin: '0 0 24px 0', fontSize: '16px' }}>
                Join <strong style={{ color: '#f59e0b' }}>{data.tournamentName}</strong>?
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button onClick={() => handleDismiss(activePopup)} style={{
                  padding: '12px 32px', borderRadius: '8px', border: '1px solid var(--border-color)',
                  background: 'var(--bg-tertiary)', color: 'var(--text-primary)',
                  cursor: 'pointer', fontWeight: 'bold', fontSize: '16px',
                  display: 'flex', alignItems: 'center', gap: '8px'
                }}>
                  <FaTimes /> No
                </button>
                <button onClick={() => handleAccept(activePopup)} style={{
                  padding: '12px 32px', borderRadius: '8px', border: 'none',
                  background: '#10b981', color: 'white',
                  cursor: 'pointer', fontWeight: 'bold', fontSize: '16px',
                  display: 'flex', alignItems: 'center', gap: '8px'
                }}>
                  <FaCheck /> Yes, Join!
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
};

export default NotificationPopup;
