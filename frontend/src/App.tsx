import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { isAuthenticated } from './lib/auth';
import VideoLoader from './components/VideoLoader';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Lots from './pages/Lots';
import LotDetail from './pages/LotDetail';
import Containers from './pages/Containers';
import Movements from './pages/Movements';
import Analyses from './pages/Analyses';
import Operations from './pages/Operations';
import AssemblageAI from './pages/AssemblageAI';
import AIChat from './pages/AIChat';
import Maintenance from './pages/Maintenance';
import Activity from './pages/Activity';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return <Layout>{children}</Layout>;
}

export default function App() {
  const [showVideo, setShowVideo] = useState(false);
  const [videoCompleted, setVideoCompleted] = useState(false);

  useEffect(() => {
    // Show intro video only once per session
    const hasSeenIntro = sessionStorage.getItem('barbote_intro_seen');
    if (!hasSeenIntro && isAuthenticated()) {
      setShowVideo(true);
    } else {
      setVideoCompleted(true);
    }
  }, []);

  const handleVideoComplete = () => {
    sessionStorage.setItem('barbote_intro_seen', '1');
    setShowVideo(false);
    setVideoCompleted(true);
  };

  return (
    <>
      {showVideo && <VideoLoader onComplete={handleVideoComplete} />}

      {videoCompleted && (
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/lots" element={<ProtectedRoute><Lots /></ProtectedRoute>} />
          <Route path="/lots/:id" element={<ProtectedRoute><LotDetail /></ProtectedRoute>} />
          <Route path="/containers" element={<ProtectedRoute><Containers /></ProtectedRoute>} />
          <Route path="/movements" element={<ProtectedRoute><Movements /></ProtectedRoute>} />
          <Route path="/analyses" element={<ProtectedRoute><Analyses /></ProtectedRoute>} />
          <Route path="/operations" element={<ProtectedRoute><Operations /></ProtectedRoute>} />
          <Route path="/assemblage" element={<ProtectedRoute><AssemblageAI /></ProtectedRoute>} />
          <Route path="/ai-chat" element={<ProtectedRoute><AIChat /></ProtectedRoute>} />
          <Route path="/maintenance" element={<ProtectedRoute><Maintenance /></ProtectedRoute>} />
          <Route path="/activity" element={<ProtectedRoute><Activity /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      )}
    </>
  );
}
