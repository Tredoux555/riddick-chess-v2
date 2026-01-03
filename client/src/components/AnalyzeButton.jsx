import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const AnalyzeButton = ({ gameId, gameType = 'pvp', pgn, className = '', size = 'normal' }) => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { token } = useAuth();

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/analysis/request', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ gameId, gameType, pgn })
      });
      const data = await res.json();
      if (data.analysisId) navigate(`/analysis/${data.analysisId}`);
      else alert(data.error || 'Failed to start analysis');
    } catch (err) {
      console.error('Analysis request failed:', err);
      alert('Failed to start analysis. Please try again.');
    } finally { setLoading(false); }
  };

  const sizeClasses = { small: 'px-3 py-1.5 text-sm', normal: 'px-4 py-2 text-base', large: 'px-6 py-3 text-lg' };

  return (
    <button onClick={handleAnalyze} disabled={loading}
      className={`rounded-xl font-bold text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105 shadow-lg shadow-purple-500/20 ${sizeClasses[size]} ${className}`}>
      {loading ? <span className="flex items-center gap-2"><span className="animate-spin">⚙️</span>Starting...</span> : <span className="flex items-center gap-2">🤖 Analyze Game</span>}
    </button>
  );
};

export default AnalyzeButton;
