import React, { useState, useEffect } from 'react';
import AuthView from './components/AuthView';
import PlayerDashboard from './components/PlayerDashboard';
import AdminDashboard from './components/AdminDashboard';

export default function App() {
  // LocalStorage se check karein ki user pehle se logged-in hai ya nahi[cite: 1, 2, 3]
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('venom_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (err) {
      return null;
    }
  });
  
  const [currentView, setCurrentView] = useState('player'); // 'player' or 'admin'
  
  // Shared Tournaments State
  const [tournaments, setTournaments] = useState([]);

  // Jab user successfully login kare, toh state aur localStorage dono mein save karein[cite: 1, 2, 3]
  const handleLoginSuccess = (userData) => {
    setUser(userData);
    localStorage.setItem('venom_user', JSON.stringify(userData));
  };

  // Jab user logout kare, toh state aur localStorage dono clear kar dein[cite: 1, 2, 3]
  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('venom_user');
    setCurrentView('player');
  };

  const userPhone = user?.phone || "";
  const isAdmin = userPhone === "9170980044";

  if (!user) {
    return <AuthView onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-50 flex flex-col">
      {isAdmin && currentView === 'admin' ? (
        <AdminDashboard 
          tournaments={tournaments}
          setTournaments={setTournaments}
          onSwitchToPlayer={() => setCurrentView('player')} 
        />
      ) : (
        <PlayerDashboard 
          user={user} 
          tournaments={tournaments}
          setTournaments={setTournaments}
          onLogout={handleLogout} 
          onOpenAdmin={() => setCurrentView('admin')}
        />
      )}
    </div>
  );
}