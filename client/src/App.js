import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';

// Layout
import Navbar from './components/Navbar';
import ShareButton from './components/ShareButton';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Play from './pages/Play';
import Game from './pages/Game';
import Tournaments from './pages/Tournaments';
import Tournament from './pages/Tournament';
import Puzzles from './pages/Puzzles';
import PuzzleRush from './pages/PuzzleRush';
import Leaderboards from './pages/Leaderboards';
import Achievements from './pages/Achievements';
import Profile from './pages/Profile';
import Friends from './pages/Friends';
import Club from './pages/Club';
import Admin from './pages/Admin';
import Settings from './pages/Settings';
import ResetPassword from './pages/ResetPassword';
import SecretStore from './pages/SecretStore';
import SecretStoreShop from './pages/SecretStoreShop';
import SecretStoreAdmin from './pages/SecretStoreAdmin';
import SecretStoreWants from './pages/SecretStoreWants';
import StoreWants from './pages/StoreWants';
import FakeAdmin from './pages/FakeAdmin';
import Learn from './pages/Learn';
import AdminLessons from './pages/AdminLessons';

// Bot and Analysis components
import BotSelection from './components/BotSelection';
import BotGame from './components/BotGame';
import GameAnalysis from './components/GameAnalysis';

// Protected Route wrapper
const ProtectedRoute = ({ children, requireAdmin = false, requireClub = false }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (requireAdmin && !user.is_admin) {
    return <Navigate to="/" />;
  }

  if (requireClub && !user.is_club_member) {
    return <Navigate to="/" />;
  }

  return children;
};

const LoadingScreen = () => (
  <div className="loading-screen">
    <div className="chess-loader">
      <div className="piece">♔</div>
      <p>Loading...</p>
    </div>
  </div>
);

function App() {
  const { loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="app">
      <Navbar />
      <main className="main-content">
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          
          {/* Protected routes */}
          <Route path="/play" element={
            <ProtectedRoute><Play /></ProtectedRoute>
          } />
          <Route path="/game/:id" element={
            <ProtectedRoute><Game /></ProtectedRoute>
          } />
          <Route path="/tournaments" element={
            <ProtectedRoute><Tournaments /></ProtectedRoute>
          } />
          <Route path="/tournament/:id" element={
            <ProtectedRoute><Tournament /></ProtectedRoute>
          } />
          <Route path="/bots" element={<ProtectedRoute><BotSelection /></ProtectedRoute>} />
          <Route path="/bot-game/:gameId" element={<ProtectedRoute><BotGame /></ProtectedRoute>} />
          <Route path="/analysis/:analysisId" element={<ProtectedRoute><GameAnalysis /></ProtectedRoute>} />
          <Route path="/puzzles" element={
            <ProtectedRoute><Puzzles /></ProtectedRoute>
          } />
          <Route path="/puzzle-rush" element={
            <ProtectedRoute><PuzzleRush /></ProtectedRoute>
          } />
          <Route path="/leaderboards" element={
            <ProtectedRoute><Leaderboards /></ProtectedRoute>
          } />
          <Route path="/achievements" element={
            <ProtectedRoute><Achievements /></ProtectedRoute>
          } />
          <Route path="/profile/:id?" element={
            <ProtectedRoute><Profile /></ProtectedRoute>
          } />
          <Route path="/friends" element={
            <ProtectedRoute><Friends /></ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute><Settings /></ProtectedRoute>
          } />
          <Route path="/learn" element={<Learn />} />

          {/* Club members only */}
          <Route path="/club" element={
            <ProtectedRoute requireClub><Club /></ProtectedRoute>
          } />

          {/* Secret Store - no auth required */}
          <Route path="/hehe" element={<SecretStore />} />
          <Route path="/hehe/store" element={<SecretStoreShop />} />
          <Route path="/hehe/wants" element={<StoreWants />} />
          
          {/* Troll page - hackers get this */}
          <Route path="/admin" element={<FakeAdmin />} />
          
          {/* YOUR real admin - secret URL */}
          <Route path="/admin/riddick/*" element={
            <ProtectedRoute requireAdmin><Admin /></ProtectedRoute>
          } />
          
          <Route path="/admin/hehe" element={<SecretStoreAdmin />} />
          <Route path="/admin/lessons" element={
            <ProtectedRoute requireAdmin><AdminLessons /></ProtectedRoute>
          } />

          {/* 404 */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
      <ShareButton />
    </div>
  );
}

export default App;
