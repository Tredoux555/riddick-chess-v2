import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const BotSelection = () => {
  const [bots, setBots] = useState([]);
  const [selectedBot, setSelectedBot] = useState(null);
  const [selectedColor, setSelectedColor] = useState('white');
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => { fetchBots(); }, []);

  const fetchBots = async () => {
    try {
      const res = await fetch('/api/bots/list', { credentials: 'include' });
      const data = await res.json();
      setBots(data);
    } catch (err) { console.error('Failed to fetch bots:', err); }
    finally { setLoading(false); }
  };

  const startGame = async () => {
    if (!selectedBot) return;
    setStarting(true);
    try {
      const res = await fetch('/api/bots/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ botId: selectedBot.id, userColor: selectedColor })
      });
      const data = await res.json();
      if (data.gameId) navigate(`/bot-game/${data.gameId}`);
    } catch (err) { console.error('Failed to start game:', err); }
    finally { setStarting(false); }
  };

  const getBotGradient = (elo) => {
    if (elo <= 500) return 'from-green-500 to-emerald-600';
    if (elo <= 1000) return 'from-blue-500 to-cyan-600';
    if (elo <= 1400) return 'from-yellow-500 to-amber-600';
    if (elo <= 1800) return 'from-orange-500 to-red-600';
    if (elo <= 2200) return 'from-red-500 to-pink-600';
    return 'from-purple-600 to-pink-600';
  };

  const getBotBorder = (elo) => {
    if (elo <= 500) return 'border-green-500 shadow-green-500/30';
    if (elo <= 1000) return 'border-blue-500 shadow-blue-500/30';
    if (elo <= 1400) return 'border-yellow-500 shadow-yellow-500/30';
    if (elo <= 1800) return 'border-orange-500 shadow-orange-500/30';
    if (elo <= 2200) return 'border-red-500 shadow-red-500/30';
    return 'border-purple-500 shadow-purple-500/30';
  };

  if (loading) return <div className="min-h-screen bg-gray-900 flex items-center justify-center"><div className="text-6xl mb-4 animate-bounce">🤖</div></div>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-5xl font-bold text-white mb-3">🤖 Play Against Bots</h1>
          <p className="text-gray-400 text-lg">Choose your opponent and test your skills!</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
          {bots.map((bot) => (
            <div key={bot.id} onClick={() => setSelectedBot(bot)}
              className={`relative p-6 rounded-2xl cursor-pointer transition-all duration-300 bg-gradient-to-br from-gray-800 to-gray-900 border-2 hover:scale-[1.02] hover:-translate-y-1 ${selectedBot?.id === bot.id ? `${getBotBorder(bot.elo)} scale-[1.02] shadow-xl` : 'border-gray-700/50 hover:border-gray-600'}`}>
              {selectedBot?.id === bot.id && <div className="absolute -top-3 -right-3 w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center shadow-lg"><span className="text-white text-lg">✓</span></div>}
              <div className="text-6xl mb-4 text-center">{bot.emoji}</div>
              <h3 className="text-2xl font-bold text-white mb-2 text-center">{bot.name}</h3>
              <div className="flex justify-center mb-4"><div className={`px-4 py-1.5 rounded-full text-sm font-bold text-white bg-gradient-to-r ${getBotGradient(bot.elo)}`}>⭐ {bot.elo} ELO</div></div>
              <p className="text-gray-400 text-center text-sm mb-3">{bot.description}</p>
              <p className="text-gray-500 text-center text-xs italic">"{bot.personality}"</p>
            </div>
          ))}
        </div>
        {selectedBot && (
          <div className="bg-gray-800/50 backdrop-blur rounded-2xl p-8 mb-8 border border-gray-700">
            <h3 className="text-white font-bold text-xl mb-6 text-center">♟️ Choose Your Color</h3>
            <div className="flex justify-center gap-6">
              <button onClick={() => setSelectedColor('white')} className={`w-28 h-28 rounded-2xl flex flex-col items-center justify-center transition-all duration-300 ${selectedColor === 'white' ? 'bg-white text-gray-900 scale-110 shadow-xl shadow-white/30' : 'bg-gray-700 text-white hover:bg-gray-600 hover:scale-105'}`}><span className="text-4xl mb-1">♔</span><span className="font-bold">White</span></button>
              <button onClick={() => setSelectedColor('random')} className={`w-28 h-28 rounded-2xl flex flex-col items-center justify-center transition-all duration-300 ${selectedColor === 'random' ? 'bg-gradient-to-br from-white via-purple-500 to-gray-900 text-white scale-110 shadow-xl shadow-purple-500/30' : 'bg-gray-700 text-white hover:bg-gray-600 hover:scale-105'}`}><span className="text-4xl mb-1">🎲</span><span className="font-bold">Random</span></button>
              <button onClick={() => setSelectedColor('black')} className={`w-28 h-28 rounded-2xl flex flex-col items-center justify-center transition-all duration-300 ${selectedColor === 'black' ? 'bg-gray-900 text-white scale-110 shadow-xl ring-2 ring-white' : 'bg-gray-700 text-white hover:bg-gray-600 hover:scale-105'}`}><span className="text-4xl mb-1">♚</span><span className="font-bold">Black</span></button>
            </div>
          </div>
        )}
        {selectedBot && (
          <div className="text-center">
            <button onClick={startGame} disabled={starting} className="px-16 py-5 rounded-2xl text-2xl font-bold text-white bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 hover:from-purple-700 hover:via-pink-700 hover:to-red-700 transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-2xl shadow-purple-500/30">
              {starting ? <span className="flex items-center gap-3"><span className="animate-spin">⚡</span>Starting...</span> : <span className="flex items-center gap-3">⚔️ Challenge {selectedBot.name}!</span>}
            </button>
          </div>
        )}
        {!selectedBot && <div className="text-center py-8"><p className="text-gray-500 text-lg">👆 Click on a bot to select your opponent!</p></div>}
        <div className="text-center mt-10"><button onClick={() => navigate('/')} className="text-gray-400 hover:text-white transition-colors text-lg">← Back to Home</button></div>
      </div>
    </div>
  );
};

export default BotSelection;
