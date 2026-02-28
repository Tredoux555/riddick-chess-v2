import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';

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
import LearnTest from './pages/LearnTest';
import AdminLessons from './pages/AdminLessons';
import TestBoard from './pages/TestBoard';
import GuitarLearning from './pages/GuitarLearning';
import OupaChess from './pages/Oupa/OupaChess';
import KillerOpenings from './pages/KillerOpenings';
import KillerOpeningPlayer from './pages/KillerOpeningPlayer';
import DefenseOpenings from './pages/DefenseOpenings';
import DefenseOpeningPlayer from './pages/DefenseOpeningPlayer';


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
        <ErrorBoundary>
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
          <Route path="/bots" element={<BotSelection />} />
          <Route path="/bot-game/:gameId" element={<BotGame />} />
          <Route path="/analysis/:analysisId" element={<ProtectedRoute><GameAnalysis /></ProtectedRoute>} />
          <Route path="/puzzles" element={<Puzzles />} />
          <Route path="/puzzle-rush" element={<PuzzleRush />} />
          <Route path="/leaderboards" element={<Leaderboards />} />
          <Route path="/achievements" element={<Achievements />} />
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
          <Route path="/learn-test" element={<LearnTest />} />
          {/* Killer Openings - Club members only */}
          <Route path="/killer-openings" element={
            <ProtectedRoute requireClub><KillerOpenings /></ProtectedRoute>
          } />
          <Route path="/killer-openings/:openingId" element={
            <ProtectedRoute requireClub><KillerOpeningPlayer /></ProtectedRoute>
          } />
          {/* Killer Defenses - Club members only */}
          <Route path="/killer-defenses" element={
            <ProtectedRoute requireClub><DefenseOpenings /></ProtectedRoute>
          } />
          <Route path="/killer-defenses/:defenseId" element={
            <ProtectedRoute requireClub><DefenseOpeningPlayer /></ProtectedRoute>
          } />

          {/* OUPA'S CHESS PAGE - Simple grandpa-proof chess! 😂 */}
          <Route path="/oupa" element={<OupaChess />} />

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
          <Route path="/admin/test-board" element={
            <ProtectedRoute requireAdmin><TestBoard /></ProtectedRoute>
          } />
          <Route path="/admin/guitar" element={
            <ProtectedRoute requireAdmin><GuitarLearning /></ProtectedRoute>
          } />

          {/* 404 */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
        </ErrorBoundary>
      </main>
      <ShareButton />
    </div>
  );
}

export default App;
