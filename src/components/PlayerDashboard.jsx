import React, { useState, useEffect } from 'react';

export default function PlayerDashboard({ user, onLogout, tournaments = [], setTournaments, onOpenAdmin }) {
  const [currentTab, setCurrentTab] = useState('tournaments');
  const [walletView, setWalletView] = useState('add');
  
  const userPhone = user?.phone || "9170980044";
  const isAdmin = userPhone === "9170980044";
  const [points, setPoints] = useState(isAdmin ? 5000 : 20); // Total Pts
  const [bonusPoints, setBonusPoints] = useState(isAdmin ? 5000 : 20); // Bonus Points
  const [winningPoints, setWinningPoints] = useState(0); // Winnings Points
  const [totalWithdrawn, setTotalWithdrawn] = useState(0);
  const [matchesPlayed, setMatchesPlayed] = useState(0);

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showFaqModal, setShowFaqModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showPassbookModal, setShowPassbookModal] = useState(false);
  const [transactionHistory, setTransactionHistory] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);

  const [toast, setToast] = useState(null);
  const [confirmToast, setConfirmToast] = useState(null);

  const [rechargeAmount, setRechargeAmount] = useState('');
  const [rechargeUtr, setRechargeUtr] = useState('');
  const [withdrawPoints, setWithdrawPoints] = useState('');
  const [withdrawUpi, setWithdrawUpi] = useState('');

  const [teamName, setTeamName] = useState('');
  const [p1Name, setP1Name] = useState('');
  const [p1Uid, setP1Uid] = useState('');

  const [userBookedMatches, setUserBookedMatches] = useState(new Set());
  const [registeredMatches, setRegisteredMatches] = useState([]);
  const [completedHistory, setCompletedHistory] = useState([]);
  const [resultDropdowns, setResultDropdowns] = useState({});

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const copyUpiId = () => {
    navigator.clipboard.writeText("9170980044-1@nyes");
    showToast("Official UPI ID copied to clipboard!", "success");
  };

  const copyCreds = (id, pass) => {
    navigator.clipboard.writeText(`Room ID: ${id} | Password: ${pass}`);
    showToast("Room credentials copied successfully!", "success");
  };

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/tournaments');
        const data = await response.json();
        if (data.tournaments) {
          setTournaments(data.tournaments);
        } else {
          setTournaments([]);
        }
      } catch (err) {
        setTournaments([]);
      }
    };

    const fetchWalletBalance = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/wallet/balance', {
          headers: { 'phone': userPhone }
        });
        const data = await response.json();
        if (data.success) {
          setPoints(data.total_pts);
          setBonusPoints(data.bonus);
          setWinningPoints(data.winnings);
          setTotalWithdrawn(data.withdrawn);
        }
      } catch (err) {
        console.error("Failed to fetch wallet balance", err);
      }
    };

    const fetchUserJoinedMatches = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/user/matches', {
          headers: { 'phone': userPhone }
        });
        const data = await response.json();
        if (data.success && data.joined_tournaments) {
          const bookedIds = new Set();
          const formattedRegs = data.joined_tournaments.map((m, idx) => {
            bookedIds.add(m.tournament_id);
            return {
              id: 'reg-db-' + idx,
              matchId: m.tournament_id,
              matchName: m.title || "Custom Battle",
              map: m.map_name || "Livik",
              mode: m.match_type || "Solo",
              matchSchedule: m.date_time || 'Today',
              startTime: m.start_time || "00:00",
              endTime: m.end_time || "00:30",
              p1Name: m.in_game_name,
              p1Uid: m.uid,
              roomId: m.room_id || "",          
              roomPassword: m.room_password || "",
              status: m.status || "Upcoming"
            };
          });
          setUserBookedMatches(bookedIds);
          
          const activeUpcoming = formattedRegs.filter(m => m.status !== "Completed");
          setRegisteredMatches(activeUpcoming);
          setCompletedHistory(formattedRegs.filter(m => m.status === "Completed"));
        }
      } catch (err) {
        console.error("Failed to fetch user joined matches", err);
      }
    };

    fetchTournaments();
    fetchWalletBalance();
    if (userPhone) {
      fetchUserJoinedMatches();
    }
  }, [setTournaments, userPhone]);

  const getMatchLiveStatus = (t) => {
    if (t.status === "Completed") return "Completed";
    if (!t.startTime || !t.endTime || !t.matchTime) return "Live Soon";

    try {
      const now = new Date();
      const cleanDateStr = t.matchTime.split('•')[0].trim() + ", 2026"; 
      const matchDate = new Date(cleanDateStr);

      const isToday = 
        matchDate.getDate() === now.getDate() &&
        matchDate.getMonth() === now.getMonth() &&
        matchDate.getFullYear() === now.getFullYear();

      if (!isToday) {
        if (matchDate < now) return "Completed";
        return "Live Soon";
      }

      const currentHours = String(now.getHours()).padStart(2, '0');
      const currentMinutes = String(now.getMinutes()).padStart(2, '0');
      const currentTime = `${currentHours}:${currentMinutes}`;

      if (currentTime >= t.startTime && currentTime <= t.endTime) {
        return "In Progress";
      } else if (currentTime > t.endTime) {
        return "Completed";
      }
    } catch (err) {
      console.error("Error parsing match date/time", err);
    }

    return "Live Soon";
  };

  const fetchTransactionHistory = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/user/transactions', {
        headers: { 'phone': userPhone }
      });
      const data = await response.json();
      if (data.success) {
        setTransactionHistory(data.transactions);
      }
    } catch (err) {
      showToast("Failed to load transaction history", "error");
    }
  };

  const initiateBattleJoin = (t) => {
    const liveStatus = getMatchLiveStatus(t);
    if (liveStatus === "In Progress" || liveStatus === "Completed") {
      showToast("Cannot join! Match is already in progress or completed.", "error");
      return;
    }
    if (userBookedMatches.has(t.id)) {
      showToast("You are already registered for this match!", "error");
      return;
    }
    if (points < Number(t.entryFee)) {
      showToast(`Insufficient balance! Required: ${t.entryFee}, Available: ${points} Pts.`, "error");
      return;
    }
    setSelectedMatch(t);
    setShowJoinModal(true);
  };

  const handleJoinSubmit = async (e) => {
    e.preventDefault();
    if (!selectedMatch) return;

    if (!p1Name || p1Uid.length < 5 || isNaN(p1Uid)) {
      showToast("Please enter valid IGN and Character UID!", "error");
      return;
    }

    try {
      const response = await fetch(`http://localhost:8000/api/tournament/join/${selectedMatch.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'phone': userPhone
        },
        body: JSON.stringify({
          phone: userPhone,
          team_name: (selectedMatch.mode && selectedMatch.mode.toLowerCase() !== 'solo') ? (teamName || 'Solo Team') : 'Solo Player',
          in_game_name: p1Name,
          uid: p1Uid
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const feeNum = parseInt(String(selectedMatch.entryFee).replace(/\D/g, '')) || 0;
        setPoints(prev => prev - feeNum);
        setMatchesPlayed(prev => prev + 1);

        setUserBookedMatches(prev => new Set(prev).add(selectedMatch.id));
        
        const newReg = {
          id: 'reg-' + Date.now(),
          matchId: selectedMatch.id,
          matchName: selectedMatch.title,
          map: selectedMatch.map,
          mode: selectedMatch.mode,
          matchSchedule: selectedMatch.matchTime || 'Soon',
          startTime: selectedMatch.startTime || "00:00",
          endTime: selectedMatch.endTime || "00:30",
          p1Name,
          p1Uid,
          roomId: "",
          roomPassword: "",
          status: "Upcoming"
        };

        setRegisteredMatches(prev => [...prev, newReg]);

        setShowJoinModal(false);
        showToast("🎉 Match Join Successful! Slot confirmed.", "success");
        setCurrentTab('upcoming');
      } else {
        let errorMessage = "Failed to join tournament.";
        if (data.detail) {
          errorMessage = typeof data.detail === 'object' ? JSON.stringify(data.detail) : data.detail;
        }
        showToast(errorMessage, "error");
      }
    } catch (err) {
      showToast("Network error while joining match.", "error");
    }
  };

  const handleRechargeSubmit = async (e) => {
    e.preventDefault();
    if (rechargeUtr.length !== 12 || isNaN(rechargeUtr)) {
      showToast("Please enter a valid 12-digit numeric UTR number!", "error");
      return;
    }

    try {
      const response = await fetch('http://localhost:8000/api/wallet/recharge/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'phone': userPhone
        },
        body: JSON.stringify({
          amount: Number(rechargeAmount),
          utr_number: rechargeUtr
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        showToast("🚀 Request Sent! Recharge pending admin verification.", "success");
        setRechargeAmount('');
        setRechargeUtr('');
        setShowWalletModal(false);
      } else {
        let errorMessage = "Failed to submit recharge request.";
        if (data.detail) {
          errorMessage = typeof data.detail === 'object' ? JSON.stringify(data.detail) : data.detail;
        }
        showToast(errorMessage, "error");
      }
    } catch (err) {
      showToast("Network error while submitting recharge request.", "error");
    }
  };

  const handleWithdrawSubmit = async (e) => {
    e.preventDefault();
    const pts = Number(withdrawPoints);
    if (pts < 50) {
      showToast("Minimum withdrawal amount is 50 Points!", "error");
      return;
    }
    if (winningPoints < pts) {
      showToast("Withdrawal denied! Only winnings can be withdrawn.", "error");
      return;
    }

    try {
      const response = await fetch('http://localhost:8000/api/wallet/withdraw/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'phone': userPhone
        },
        body: JSON.stringify({
          amount: pts,
          upi_id: withdrawUpi
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setWinningPoints(prev => prev - pts);
        setPoints(prev => prev - pts);
        setTotalWithdrawn(prev => prev + pts);
        setShowWalletModal(false);
        showToast(`💸 Withdrawal Request Sent for ₹${pts}!`, "success");
        setWithdrawPoints('');
        setWithdrawUpi('');
      } else {
        let errorMessage = "Failed to submit withdrawal request.";
        if (data.detail) {
          errorMessage = typeof data.detail === 'object' ? JSON.stringify(data.detail) : data.detail;
        }
        showToast(errorMessage, "error");
      }
    } catch (err) {
      showToast("Network error while submitting withdrawal.", "error");
    }
  };

  const confirmLogout = () => {
    setShowProfileModal(false);
    setConfirmToast({
      message: "Are you sure you want to log out from Venom eSports?",
      confirmText: "Logout",
      onConfirm: () => {
        onLogout();
      }
    });
  };

  const sortedTournaments = [...tournaments].sort((a, b) => {
    const parseCustomDate = (timeStr) => {
      if (!timeStr) return 0;
      try {
        const formattedStr = timeStr.replace('•', ', 2026');
        const timestamp = Date.parse(formattedStr);
        return isNaN(timestamp) ? 0 : timestamp;
      } catch (err) {
        return 0;
      }
    };
    return parseCustomDate(a.matchTime) - parseCustomDate(b.matchTime);
  });

  const activeRegisteredMatches = registeredMatches.filter(reg => reg.status !== "Completed");

  return (
    <div className="bg-[#050a0f] text-gray-200 font-body min-h-[100dvh] w-full flex justify-center items-center p-0 sm:p-4 selection:bg-teal-500 selection:text-black">
      <div className="w-full max-w-[420px] h-[100dvh] sm:h-[880px] bg-gradient-to-b from-[#091b26] via-[#051119] to-[#03080d] sm:rounded-[40px] sm:border-[2px] sm:border-[#13354a] shadow-[0_0_35px_rgba(20,184,166,0.12)] flex flex-col justify-between overflow-hidden relative">

        {toast && (
          <div className="absolute top-16 inset-x-4 z-50 flex justify-center pointer-events-none">
            <div className={`pointer-events-auto flex items-center gap-2 px-4 py-2.5 rounded-2xl border backdrop-blur-md text-xs font-gaming font-semibold tracking-wide shadow-2xl animate-bounce max-w-[95%] text-center ${
              toast.type === 'success' ? 'bg-[#06242b]/95 border-teal-400/60 text-teal-300' : 'bg-[#2b0a0a]/95 border-red-500/60 text-red-300'
            }`}>
              <i className={`fa-solid ${toast.type === 'success' ? 'fa-circle-check text-teal-400' : 'fa-circle-exclamation text-red-400'} text-sm shrink-0`}></i>
              <span className="truncate">{toast.message}</span>
            </div>
          </div>
        )}

        {confirmToast && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
            <div className="w-full max-w-[340px] bg-[#071926] border border-amber-500/40 rounded-3xl p-5 text-center space-y-4 shadow-2xl">
              <div className="w-12 h-12 bg-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center mx-auto text-xl border border-amber-400/30">
                <i className="fa-solid fa-triangle-exclamation"></i>
              </div>
              <div>
                <h4 className="font-gaming font-bold text-white text-sm uppercase">Confirmation Required</h4>
                <p className="text-xs text-gray-300 mt-1">{confirmToast.message}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setConfirmToast(null)} className="py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-gaming text-xs font-bold uppercase cursor-pointer">Cancel</button>
                <button onClick={() => { const cb = confirmToast.onConfirm; setConfirmToast(null); if (cb) cb(); }} className="py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-gaming text-xs font-bold uppercase cursor-pointer shadow-md">{confirmToast.confirmText}</button>
              </div>
            </div>
          </div>
        )}

        <div className="shrink-0 z-20 bg-[#091b26]/95 backdrop-blur-md pb-2 border-b border-[#103045]/50">
          <header className="pt-5 px-5 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-teal-500/15 border border-teal-400/40 flex items-center justify-center text-teal-300 shadow-[0_0_10px_rgba(20,184,166,0.25)] overflow-hidden">
                <img src="/image.png" alt="Venom Logo" className="w-6 h-6 object-contain" />
              </div>
              <span className="font-gaming font-extrabold text-base tracking-wider text-white drop-shadow-[0_0_8px_rgba(20,184,166,0.3)]">VENOM</span>
            </div>

            <div className="flex items-center gap-2">
              <div onClick={() => setShowWalletModal(true)} className="flex items-center bg-[#0d202a] border border-amber-500/35 rounded-full pl-3 pr-1 py-1 gap-2 shadow-[0_0_10px_rgba(245,158,11,0.15)] cursor-pointer hover:border-amber-400 transition">
                <div className="flex items-center gap-1.5 font-stats font-bold text-xs tracking-wide">
                  <i className="fa-solid fa-coins text-amber-400 text-xs"></i>
                  <span className="text-amber-200 text-sm tracking-wider font-extrabold">{points}</span>
                  <span className="text-[9px] text-amber-400 font-gaming">PTS</span>
                </div>
                <button onClick={(e) => { e.stopPropagation(); setShowWalletModal(true); setWalletView('add'); }} className="w-5 h-5 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 flex items-center justify-center text-[10px] font-black shadow-[0_0_8px_rgba(245,158,11,0.4)] cursor-pointer">
                  <i className="fa-solid fa-plus"></i>
                </button>
              </div>

              <button onClick={() => setShowProfileModal(true)} className="w-8 h-8 rounded-full bg-[#0d2a3d] border border-cyan-500/35 flex items-center justify-center text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.15)] hover:border-cyan-300 cursor-pointer">
                <i className="fa-solid fa-user-ninja text-xs"></i>
              </button>
            </div>
          </header>

          <div className="px-5">
            <div className="p-1 rounded-2xl bg-[#061520] border border-[#103045] grid grid-cols-4 gap-1 shadow-inner">
              <button onClick={() => setCurrentTab('tournaments')} className={`py-1.5 rounded-xl text-[11px] font-gaming font-black flex items-center justify-center gap-1 cursor-pointer transition ${currentTab === 'tournaments' ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 shadow-[0_0_10px_rgba(20,184,166,0.3)]' : 'text-gray-300 border border-[#103045]'}`}>
                <i className="fa-solid fa-trophy text-[9px]"></i> All
              </button>
              <button onClick={() => setCurrentTab('upcoming')} className={`py-1.5 rounded-xl text-[11px] font-gaming font-bold flex items-center justify-center gap-1 cursor-pointer transition ${currentTab === 'upcoming' ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 shadow-[0_0_10px_rgba(20,184,166,0.3)]' : 'text-purple-300 border border-[#103650]'}`}>
                <i className="fa-regular fa-clock text-[9px]"></i> Upcoming
              </button>
              <button onClick={() => setCurrentTab('results')} className={`py-1.5 rounded-xl text-[11px] font-gaming font-bold flex items-center justify-center gap-1 cursor-pointer transition ${currentTab === 'results' ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 shadow-[0_0_10px_rgba(20,184,166,0.3)]' : 'text-emerald-300 border border-[#103650]'}`}>
                <i className="fa-solid fa-medal text-[9px]"></i> Results
              </button>
              <button onClick={() => setCurrentTab('support')} className={`py-1.5 rounded-xl text-[11px] font-gaming font-bold flex items-center justify-center gap-1 cursor-pointer transition ${currentTab === 'support' ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 shadow-[0_0_10px_rgba(20,184,166,0.3)]' : 'text-orange-300 border border-[#103650]'}`}>
                <i className="fa-solid fa-headset text-[9px]"></i> Help
              </button>
            </div>
          </div>
        </div>

        <main className="px-5 space-y-4 overflow-y-auto no-scrollbar flex-1 pb-28 pt-3">
          {currentTab === 'tournaments' && (
            <div className="space-y-4">
              <div className="relative rounded-3xl overflow-hidden border border-teal-500/30 p-5 min-h-[170px] flex flex-col justify-between bg-[#091e2b] shadow-[0_0_20px_rgba(20,184,166,0.12)]">
                <img src="https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=800&auto=format&fit=crop" alt="Arena" className="absolute inset-0 w-full h-full object-cover filter brightness-[0.50]" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#06141f]/90 via-[#081e2b]/70 to-transparent"></div>
                <div className="relative z-10 flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-200 font-gaming text-[9px] font-bold uppercase"><i className="fa-solid fa-crown text-amber-400 mr-1 text-[8px]"></i> WELCOME WARRIOR</span>
                </div>
                <div className="relative z-10 space-y-1.5 pt-2">
                  <h2 className="font-gaming font-black text-xl text-white tracking-wide uppercase leading-tight drop-shadow-[0_0_8px_rgba(20,184,166,0.25)]">UNLEASH YOUR <span className="text-teal-300">AIM.</span><br />RULE THE LOBBY.</h2>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1 px-1">
                <span className="w-1.5 h-4 rounded-full bg-teal-400 shadow-[0_0_6px_rgba(20,184,166,0.5)]"></span>
                <h3 className="font-gaming font-bold text-xs uppercase tracking-wider text-slate-200">Live & Upcoming Battles</h3>
              </div>

              <div className="space-y-3">
                {sortedTournaments.length === 0 ? (
                  <div className="bg-[#071926] border border-[#103650] p-8 rounded-2xl text-center space-y-2">
                    <i className="fa-solid fa-ghost text-3xl text-gray-500 mb-1"></i>
                    <p className="text-xs text-gray-400 font-gaming uppercase">No Live Matches Available</p>
                    <p className="text-[10px] text-gray-500">Admin can publish new tournaments from the Admin Panel.</p>
                  </div>
                ) : (
                  sortedTournaments.map(t => {
                    const isBooked = userBookedMatches.has(t.id) || registeredMatches.some(reg => reg.matchId === t.id);
                    const liveStatus = getMatchLiveStatus(t);

                    return (
                      <article key={t.id} className="relative overflow-hidden bg-[#071926] border border-[#103650] rounded-2xl p-3 shadow-md space-y-2.5">
                        <div className="relative z-10 flex items-center justify-between">
                          <span className={`font-gaming text-[8px] font-bold px-2 py-0.5 rounded uppercase ${
                            liveStatus === 'In Progress' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                          }`}>
                            {liveStatus}
                          </span>
                          <div className="flex gap-1">
                            <span className="bg-[#05131e]/80 backdrop-blur-sm border border-[#103650] text-slate-300 font-gaming text-[9px] px-2 py-0.5 rounded">{t.map}</span>
                            <span className="bg-teal-500/20 backdrop-blur-sm text-teal-300 border border-teal-500/30 font-gaming text-[9px] px-2 py-0.5 rounded uppercase">{t.mode}</span>
                          </div>
                        </div>
                        <div className="relative z-10 flex justify-between items-start">
                          <div>
                            <h3 className="font-gaming font-bold text-sm text-white uppercase">{t.title}</h3>
                            <p className="text-[10px] text-gray-300 mt-0.5"><i className="fa-regular fa-clock text-teal-400"></i> {t.matchTime || 'Today'}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-[8px] text-gray-400 uppercase font-bold block">TOTAL PRIZE POOL</span>
                            <span className="font-gaming font-black text-amber-400 text-xs">{t.pool}</span>
                          </div>
                        </div>
                        <div className="relative z-10 grid grid-cols-3 gap-1 bg-[#05131e]/80 backdrop-blur-sm px-2 py-1.5 rounded-xl border border-[#103650] text-[10px] font-gaming text-center">
                          <div><span className="text-gray-400 text-[8px] block uppercase">Entry</span><span className="text-white font-bold">{t.entryFee}</span></div>
                          <div className="border-x border-[#103650]"><span className="text-gray-400 text-[8px] block uppercase">Slots</span><span className="text-teal-300 font-bold">{t.slots}</span></div>
                          <div><span className="text-gray-400 text-[8px] block uppercase">Reward</span><span className="text-amber-300 font-bold text-[9px]">{t.reward || 'Winner Prize'}</span></div>
                        </div>
                        <div className="relative z-10">
                          {liveStatus === "Completed" ? (
                            <button disabled className="w-full py-2 bg-slate-900 text-gray-400 border border-slate-700 font-gaming text-[11px] font-bold uppercase rounded-xl cursor-not-allowed">
                              Match Ended
                            </button>
                          ) : isBooked ? (
                            <button disabled className="w-full py-2 bg-[#05131e] text-teal-300 border border-teal-500/40 font-gaming text-[11px] font-bold uppercase rounded-xl cursor-not-allowed">
                              Slot Confirmed ✓
                            </button>
                          ) : liveStatus === "In Progress" ? (
                            <button disabled className="w-full py-2 bg-amber-500/20 text-amber-400 border border-amber-500/40 font-gaming text-[11px] font-bold uppercase rounded-xl cursor-not-allowed">
                              In Progress (Locked)
                            </button>
                          ) : (
                            <button onClick={() => initiateBattleJoin(t)} className="w-full py-2 bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 font-gaming font-black text-xs uppercase rounded-xl cursor-pointer shadow-[0_0_10px_rgba(20,184,166,0.3)]">
                              Join Battle • {t.entryFee}
                            </button>
                          )}
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {currentTab === 'upcoming' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-gaming font-bold text-white uppercase tracking-wider">MY REGISTERED MATCHES</span>
                <span className="text-[10px] font-gaming text-teal-400 font-bold uppercase">{activeRegisteredMatches.length} JOINED</span>
              </div>
              <div className="space-y-3">
                {activeRegisteredMatches.length === 0 ? (
                  <div className="bg-[#071926] border border-[#103650] p-6 rounded-2xl text-center space-y-3">
                    <i className="fa-regular fa-calendar-xmark text-3xl text-gray-500"></i>
                    <p className="text-xs text-gray-400">You don't have any upcoming registered matches.<br />Matches will move to Results once completed.</p>
                    <button onClick={() => setCurrentTab('tournaments')} className="px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 font-gaming font-bold text-xs rounded-xl uppercase cursor-pointer">
                      Browse Tournaments
                    </button>
                  </div>
                ) : (
                  activeRegisteredMatches.map(reg => (
                    <div key={reg.id} className="bg-[#071926] border border-teal-500/40 rounded-2xl p-4 space-y-3 shadow-md">
                      <div>
                        <span className="text-[9px] bg-teal-500/15 text-teal-300 border border-teal-500/35 px-2 py-0.5 rounded font-gaming font-bold uppercase tracking-wider">{reg.mode} • UPCOMING</span>
                        
                        <div className="flex justify-between items-baseline mt-1.5">
                          <h4 className="font-gaming text-sm font-bold text-white uppercase tracking-wide">
                            {reg.matchName} <span className="text-teal-300 font-normal">({reg.map})</span>
                          </h4>
                          <span className="text-[11px] text-gray-300 font-medium">
                            {reg.p1Name} <span className="text-gray-400 text-[10px]">(UID: {reg.p1Uid})</span>
                          </span>
                        </div>

                        <p className="text-[11px] text-amber-400 font-medium mt-1">
                          <i className="fa-regular fa-clock mr-1"></i> {reg.matchSchedule}
                        </p>
                      </div>

                      <div className="bg-[#05131e] border border-teal-500/30 rounded-xl p-3 space-y-2">
                        <div className="flex justify-between items-center border-b border-[#103650] pb-1.5">
                          <span className="text-[10px] uppercase font-bold text-teal-300"><i className="fa-solid fa-key mr-1"></i> ROOM ACCESS (10M PRIOR)</span>
                          <span className="text-[9px] text-gray-400 font-mono">Auto-Updates</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="bg-[#081e2c] p-2.5 rounded-lg border border-[#103650] flex justify-between items-center">
                            <div>
                              <span className="text-[9px] text-gray-400 block uppercase font-bold">ROOM ID</span>
                              <span className="font-gaming font-bold text-white text-xs">{reg.roomId || "Waiting..."}</span>
                            </div>
                            {reg.roomId && (
                              <button onClick={() => copyCreds(reg.roomId, reg.roomPassword)} className="text-gray-400 hover:text-teal-300 cursor-pointer"><i className="fa-regular fa-copy"></i></button>
                            )}
                          </div>
                          <div className="bg-[#081e2c] p-2.5 rounded-lg border border-[#103650] flex justify-between items-center">
                            <div>
                              <span className="text-[9px] text-gray-400 block uppercase font-bold">PASSWORD</span>
                              <span className="font-gaming font-bold text-white text-xs">{reg.roomPassword || "Waiting..."}</span>
                            </div>
                            {reg.roomPassword && (
                              <button onClick={() => copyCreds(reg.roomId, reg.roomPassword)} className="text-gray-400 hover:text-teal-300 cursor-pointer"><i className="fa-regular fa-copy"></i></button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {currentTab === 'results' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-gaming font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <i className="fa-solid fa-award text-amber-400"></i> My Match Results
                </span>
                <span className="text-[10px] text-gray-400 uppercase font-bold">Personal Record</span>
              </div>

              <div className="space-y-3">
                {completedHistory.length === 0 ? (
                  <p className="text-xs text-gray-500 text-center py-6">You have not played any matches yet or results are pending.</p>
                ) : (
                  completedHistory.map(reg => {
                    const isOpen = resultDropdowns[reg.id];
                    const winners = reg.winnersList || [];

                    const fetchMatchResults = async () => {
                      if (resultDropdowns[reg.id]) {
                        setResultDropdowns(prev => ({ ...prev, [reg.id]: false }));
                        return;
                      }
                      try {
                        const response = await fetch(`http://localhost:8000/api/tournaments/results/${reg.matchId}`, {
                          headers: { 'phone': userPhone }
                        });
                        const data = await response.json();
                        if (response.ok && data.success && data.winners) {
                          setCompletedHistory(prev => prev.map(m => m.id === reg.id ? { ...m, winnersList: data.winners } : m));
                        }
                        setResultDropdowns(prev => ({ ...prev, [reg.id]: true }));
                      } catch (err) {
                        console.error("Failed to fetch results", err);
                      }
                    };

                    return (
                      <div key={reg.id} className="bg-[#071926] border border-[#103650] p-4 rounded-2xl space-y-3 shadow-md">
                        <div className="flex items-center justify-between border-b border-[#123954] pb-2.5">
                          <div>
                            <h4 className="font-gaming text-sm font-bold text-white uppercase">{reg.matchName}</h4>
                            <p className="text-[10px] text-gray-400">Map: {reg.map} • Mode: {reg.mode}</p>
                          </div>

                          <button 
                            onClick={fetchMatchResults} 
                            className="text-[10px] bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 px-3 py-1.5 rounded-lg font-gaming font-black uppercase cursor-pointer shadow-md flex items-center gap-1"
                          >
                            {isOpen ? "Hide Winners" : "Check Results"} <i className={`fa-solid fa-chevron-${isOpen ? 'up' : 'down'} text-[8px]`}></i>
                          </button>
                        </div>

                        {isOpen && (
                          <div className="space-y-2 pt-1 border-t border-[#123954]">
                            <span className="text-[10px] text-teal-300 font-gaming uppercase font-bold block">🏆 Tournament Leaderboard / Winners</span>
                            {winners.length === 0 ? (
                              <p className="text-xs text-gray-400 italic py-1">Results expired after 10 hours or not announced yet.</p>
                            ) : (
                              <div className="space-y-1.5">
                                {[...winners].sort((a, b) => Number(b.reward_points) - Number(a.reward_points)).map((win, idx) => (
                                  <div key={idx} className="flex items-center justify-between bg-[#05131e] p-2.5 rounded-xl border border-[#103650] text-xs font-mono">
                                    <div className="flex items-center gap-2">
                                      <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-[10px]">{idx + 1}</span>
                                      <div>
                                        <span className="text-white font-bold block uppercase font-gaming">{win.in_game_name}</span>
                                        <span className="text-[9px] text-gray-400">UID: {win.uid || "N/A"}</span>
                                      </div>
                                    </div>
                                    <span className="font-gaming text-teal-300 font-black text-xs">+{win.reward_points} Pts</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {currentTab === 'support' && (
            <div className="space-y-3">
              <div className="bg-[#071926] border border-[#103650] p-5 rounded-3xl space-y-4 text-center shadow-[0_0_35px_rgba(249,115,22,0.12)]">
                <div className="w-14 h-14 bg-orange-500/15 border border-orange-400/35 rounded-2xl flex items-center justify-center mx-auto text-orange-400 text-2xl shadow-[0_0_15px_rgba(249,115,22,0.2)]">
                  <i className="fa-solid fa-headset"></i>
                </div>
                
                <div>
                  <h3 className="font-gaming font-black text-white text-base tracking-wide uppercase">VENOM 24/7 HELPDESK</h3>
                  <p className="text-xs text-gray-300 mt-1">For room access, payment verification, and instant support, reach out via the channels below.</p>
                </div>

                <div className="space-y-2.5 pt-1 text-left">
                  <a href="https://chat.whatsapp.com/IFjD4LL6rtAHQR6eMdSUO6?s=cl&p=a&mlu=4&ilr=4&utm_source=igweb&utm_campaign=wa_group_url_xma&source_surface=27" target="_blank" rel="noreferrer" className="w-full p-3 rounded-2xl bg-[#05131e] border border-emerald-500/30 hover:border-emerald-400 transition flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-lg"><i className="fa-brands fa-whatsapp"></i></div>
                      <div><span className="text-xs font-bold text-white block">Official WhatsApp Group</span><span className="text-[10px] text-gray-400">Match updates, schedules & announcements</span></div>
                    </div>
                    <i className="fa-solid fa-arrow-up-right-from-square text-xs text-gray-500 group-hover:text-emerald-300"></i>
                  </a>

                  <a href="https://wa.me/9170980044?text=Hi%20Venom%20Admin,%20mujhe%20tournament%20ya%20wallet%20support%20chahiye." target="_blank" rel="noreferrer" className="w-full p-3 rounded-2xl bg-[#05131e] border border-teal-500/30 hover:border-teal-400 transition flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center text-lg"><i className="fa-regular fa-comment-dots"></i></div>
                      <div><span className="text-xs font-bold text-white block">Direct Chat with Admin</span><span className="text-[10px] text-gray-400">Instant query, dispute & manual approval</span></div>
                    </div>
                    <i className="fa-solid fa-arrow-up-right-from-square text-xs text-gray-500 group-hover:text-teal-300"></i>
                  </a>

                  <a href="mailto:support@venomesports.com" className="w-full p-3 rounded-2xl bg-[#05131e] border border-red-500/30 hover:border-red-400 transition flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center text-lg"><i className="fa-solid fa-envelope-open-text"></i></div>
                      <div><span className="text-xs font-bold text-white block">Email Support</span><span className="text-[10px] text-gray-400">support@venomesports.com</span></div>
                    </div>
                    <i className="fa-solid fa-arrow-up-right-from-square text-xs text-red-300"></i>
                  </a>
                </div>
              </div>
            </div>
          )}
        </main>

        <nav className="absolute bottom-3 inset-x-4 bg-[#061622]/95 border border-[#10344b] rounded-2xl backdrop-blur-xl px-6 py-2.5 flex items-center justify-between z-30 shadow-[0_8px_25px_rgba(0,0,0,0.7)]">
          <button onClick={() => setShowWalletModal(true)} className="flex flex-col items-center gap-1 text-emerald-300 cursor-pointer group">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-400/35 flex items-center justify-center shadow-[0_0_10px_rgba(16,185,129,0.25)] transition group-hover:scale-105"><i className="fa-solid fa-wallet text-xs"></i></div>
            <span className="text-[8px] font-gaming font-extrabold uppercase tracking-wider">WALLET</span>
          </button>
          
          <button onClick={() => setShowRulesModal(true)} className="flex flex-col items-center gap-1 text-indigo-300 cursor-pointer group">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-400/35 flex items-center justify-center shadow-[0_0_10px_rgba(99,102,241,0.25)] transition group-hover:scale-105"><i className="fa-solid fa-scroll text-xs text-indigo-300"></i></div>
            <span className="text-[8px] font-gaming font-extrabold uppercase tracking-wider">RULES</span>
          </button>

          <button onClick={() => setShowFaqModal(true)} className="flex flex-col items-center gap-1 text-teal-300 cursor-pointer group">
            <div className="w-8 h-8 rounded-xl bg-teal-500/15 border border-teal-400/35 flex items-center justify-center shadow-[0_0_10px_rgba(20,184,166,0.25)] transition group-hover:scale-105"><i className="fa-solid fa-circle-question text-xs"></i></div>
            <span className="text-[8px] font-gaming font-extrabold uppercase tracking-wider">FAQ</span>
          </button>

          {isAdmin && (
            <button onClick={onOpenAdmin} className="flex flex-col items-center gap-1 text-amber-400 cursor-pointer group">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-400/35 flex items-center justify-center shadow-[0_0_10px_rgba(245,158,11,0.25)] transition group-hover:scale-105"><i className="fa-solid fa-shield-halved text-xs"></i></div>
              <span className="text-[8px] font-gaming font-extrabold uppercase tracking-wider">ADMIN</span>
            </button>
          )}
        </nav>
      </div>

      {showProfileModal && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-md z-[999] flex items-center justify-center p-4">
          <div className="w-full max-w-[420px] bg-[#071926] border border-teal-500/35 rounded-[32px] p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-[#123954]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-400/35 text-emerald-400 flex items-center justify-center text-xs">
                  <i className="fa-solid fa-user-shield"></i>
                </div>
                <h3 className="font-gaming font-bold text-sm uppercase text-white">WARRIOR PROFILE</h3>
              </div>
              <button onClick={() => setShowProfileModal(false)} className="w-7 h-7 rounded-full bg-[#0d2a3d] text-gray-400 hover:text-white flex items-center justify-center cursor-pointer"><i className="fa-solid fa-xmark"></i></button>
            </div>
            <div className="bg-[#05131e] border border-[#103650] p-3.5 rounded-2xl">
              <span className="text-[10px] text-gray-400 font-gaming uppercase block font-bold">REGISTERED PHONE / ID</span>
              <span className="font-gaming font-bold text-base text-white">{userPhone}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center font-gaming">
              <div className="bg-[#05131e] border border-[#103650] p-3 rounded-2xl"><span className="text-[9px] text-gray-400 block">DEPOSIT/BONUS</span><span className="text-white font-bold">{bonusPoints} Pts</span></div>
              <div className="bg-[#05131e] border border-amber-500/30 p-3 rounded-2xl"><span className="text-[9px] text-amber-400 block">WINNINGS</span><span className="text-amber-300 font-bold">{winningPoints} Pts</span></div>
              <div className="bg-[#05131e] border border-emerald-500/30 p-3 rounded-2xl"><span className="text-[9px] text-gray-400 block">PLAYED</span><span className="text-emerald-300 font-bold">{matchesPlayed}</span></div>
            </div>

            <button onClick={() => { setShowProfileModal(false); setShowPassbookModal(true); fetchTransactionHistory(); }} className="w-full py-2.5 bg-[#0d2a3d] border border-cyan-500/30 text-cyan-300 hover:text-white font-gaming font-bold text-xs uppercase rounded-xl cursor-pointer flex items-center justify-center gap-2 shadow-sm">
              <i className="fa-solid fa-book-open"></i> VIEW WALLET PASSBOOK
            </button>

            <div className="space-y-2">
              <h4 className="font-gaming text-xs text-amber-400 font-bold uppercase"><i className="fa-solid fa-clock-rotate-left mr-1"></i> COMPLETED MATCH HISTORY</h4>
              <div className="space-y-2 max-h-[150px] overflow-y-auto">
                {completedHistory.length === 0 ? <p className="text-[11px] text-gray-500 text-center py-3">No completed match history found.</p> : (
                  completedHistory.map(h => (
                    <div key={h.id} className="bg-[#05131e] border border-[#103650] p-3 rounded-xl flex justify-between items-center text-xs">
                      <div><span className="font-bold text-white block uppercase">{h.matchName}</span><span className="text-[10px] text-gray-400">{h.mode} • {h.map}</span></div>
                      <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-gaming font-bold">COMPLETED</span>
                    </div>
                  ))
                )}
              </div>
            </div>
            <button onClick={confirmLogout} className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white font-gaming font-black text-xs uppercase rounded-xl cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_12px_rgba(220,38,38,0.3)]">
              <i className="fa-solid fa-right-from-bracket"></i> LOGOUT ACCOUNT
            </button>
          </div>
        </div>
      )}

      {showWalletModal && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-md z-[999] flex items-center justify-center p-4">
          <div className="w-full max-w-[420px] bg-[#071926] border border-emerald-500/35 rounded-[32px] p-6 space-y-4 max-h-[88vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-[#123954]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center text-xs">
                  <i className="fa-solid fa-wallet"></i>
                </div>
                <h3 className="font-gaming font-bold text-sm uppercase text-white">Venom Battle Wallet</h3>
              </div>
              <button onClick={() => setShowWalletModal(false)} className="w-7 h-7 rounded-full bg-[#0d2a3d] text-gray-400 hover:text-white flex items-center justify-center cursor-pointer"><i className="fa-solid fa-xmark"></i></button>
            </div>
            <div className="grid grid-cols-3 gap-2 font-gaming text-center">
              <div className="bg-[#05131e] border border-[#103650] p-2 rounded-xl"><span className="text-[9px] text-gray-400 block">TOTAL PTS</span><span className="text-sm font-bold text-white">{points}</span></div>
              <div className="bg-[#05131e] border border-amber-500/30 p-2 rounded-xl"><span className="text-[9px] text-amber-400 block">WINNINGS</span><span className="text-sm font-bold text-amber-300">{winningPoints}</span></div>
              <div className="bg-[#05131e] border border-emerald-500/30 p-2 rounded-xl"><span className="text-[9px] text-gray-400 block">WITHDRAWN</span><span className="text-sm font-bold text-emerald-300">{totalWithdrawn}</span></div>
            </div>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#05131e] border border-[#103650] rounded-2xl font-gaming text-xs">
              <button onClick={() => setWalletView('add')} className={`py-2 rounded-xl cursor-pointer ${walletView === 'add' ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 font-black shadow-md' : 'text-gray-300'}`}><i className="fa-solid fa-plus text-[10px] mr-1"></i> Add Points</button>
              <button onClick={() => setWalletView('withdraw')} className={`py-2 rounded-xl cursor-pointer ${walletView === 'withdraw' ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black shadow-md' : 'text-gray-300'}`}><i className="fa-solid fa-arrow-up-from-bracket text-[10px] mr-1"></i> Withdraw</button>
            </div>

            {walletView === 'add' ? (
              <form onSubmit={handleRechargeSubmit} className="space-y-3 text-xs">
                <div className="bg-[#05131e] p-3 rounded-xl border border-[#103650]">
                  <span className="text-gray-300">Scan / Pay to Official UPI ID:</span>
                  <div className="flex justify-between items-center bg-[#081e2c] px-3 py-2 rounded-lg mt-1">
                    <span className="font-mono text-teal-300 font-bold">9170980044-1@nyes</span>
                    <button type="button" onClick={copyUpiId} className="text-teal-300 font-bold cursor-pointer">Copy</button>
                  </div>
                </div>
                <div><label className="block text-gray-300 mb-1">Points To Recharge (₹ 1 = 1 Pt)</label><input type="number" value={rechargeAmount} onChange={(e) => setRechargeAmount(e.target.value)} placeholder="e.g. 100" required className="w-full px-3 py-2 bg-[#05131e] border border-[#103650] rounded-xl text-white font-stats font-bold text-sm" /></div>
                <div><label className="block text-gray-300 mb-1">12-Digit UTR / Ref No.</label><input type="text" maxLength="12" value={rechargeUtr} onChange={(e) => setRechargeUtr(e.target.value)} placeholder="12-digit UTR" required className="w-full px-3 py-2 bg-[#05131e] border border-[#103650] rounded-xl text-white font-mono text-xs" /></div>
                <button type="submit" className="w-full py-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 font-gaming font-black uppercase rounded-xl cursor-pointer">Submit Recharge Request</button>
              </form>
            ) : (
              <form onSubmit={handleWithdrawSubmit} className="space-y-3 text-xs">
                <div className="bg-[#05131e] p-2.5 rounded-xl border border-amber-500/30 flex justify-between">
                  <span className="text-gray-400">Withdrawable Balance:</span>
                  <span className="font-gaming font-bold text-amber-300">{winningPoints} Pts</span>
                </div>
                <div><label className="block text-gray-300 mb-1">Withdraw Points (Min 50)</label><input type="number" min="50" value={withdrawPoints} onChange={(e) => setWithdrawPoints(e.target.value)} placeholder="Min 50" required className="w-full px-3 py-2 bg-[#05131e] border border-emerald-500/30 rounded-xl text-emerald-300 font-stats font-bold text-sm" /></div>
                <div><label className="block text-gray-300 mb-1">Your Receiving UPI ID</label><input type="text" value={withdrawUpi} onChange={(e) => setWithdrawUpi(e.target.value)} placeholder="user@oksbi" required className="w-full px-3 py-2 bg-[#05131e] border border-emerald-500/30 rounded-xl text-white font-mono text-xs" /></div>
                <button type="submit" className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-gaming font-black uppercase rounded-xl cursor-pointer">Request Instant Cashout</button>
              </form>
            )}
          </div>
        </div>
      )}

      {showJoinModal && selectedMatch && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-md z-[999] flex items-center justify-center p-4">
          <div className="w-full max-w-sm max-h-[92vh] overflow-y-auto bg-[#071926] border border-teal-500/40 rounded-3xl p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-[#123954] pb-2.5">
              <h3 className="font-gaming font-bold text-white text-sm uppercase">Join Battle ({selectedMatch.mode})</h3>
              <button onClick={() => setShowJoinModal(false)} className="text-gray-400 hover:text-white cursor-pointer"><i className="fa-solid fa-xmark"></i></button>
            </div>
            
            <div className="bg-[#05131e] p-3 rounded-xl border border-amber-500/30 text-xs flex justify-between items-center">
              <span className="text-gray-400">Entry Fee:</span>
              <span className="font-gaming font-bold text-amber-400">{selectedMatch.entryFee}</span>
            </div>

            <form onSubmit={handleJoinSubmit} className="space-y-3 text-xs">
              {selectedMatch.mode && selectedMatch.mode.toLowerCase() !== 'solo' && (
                <div>
                  <label className="block text-amber-400 font-bold mb-1 font-gaming uppercase">Team / Clan Name</label>
                  <input type="text" value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="Enter Team Name (Same for teammates)" required className="w-full px-3 py-2 bg-[#05131e] border border-amber-500/40 rounded-xl text-white outline-none" />
                  <p className="text-[10px] text-gray-400 mt-1">Note: All members joining this match under this team name will be clubbed together.</p>
                </div>
              )}
              
              <div className="bg-[#05131e] p-3 rounded-xl border border-[#103650] space-y-2">
                <span className="text-teal-300 font-gaming font-bold text-[10px] uppercase block">Your In-Game Details</span>
                <input type="text" value={p1Name} onChange={(e) => setP1Name(e.target.value)} placeholder="In-Game Name (IGN)" required className="w-full px-3 py-2 bg-[#081e2c] border border-teal-500/30 rounded-lg text-white outline-none" />
                <input type="text" inputMode="numeric" value={p1Uid} onChange={(e) => setP1Uid(e.target.value)} placeholder="Character UID" required className="w-full px-3 py-2 bg-[#081e2c] border border-teal-500/30 rounded-lg text-white font-mono outline-none" />
              </div>

              <button type="submit" className="w-full py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 font-gaming font-black text-xs uppercase rounded-xl cursor-pointer shadow-md">
                Confirm Registration & Pay Fee ({selectedMatch.entryFee})
              </button>
            </form>
          </div>
        </div>
      )}

      {showRulesModal && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-md z-[999] flex items-center justify-center p-4">
          <div className="w-full max-w-[420px] bg-[#071926] border border-indigo-500/35 rounded-[32px] p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-[#123954]">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-scale-balanced text-indigo-400 text-base"></i>
                <h3 className="font-gaming font-bold text-sm uppercase text-white">Tournament Rules & Guidelines</h3>
              </div>
              <button onClick={() => setShowRulesModal(false)} className="w-7 h-7 rounded-full bg-[#0d2a3d] text-gray-400 hover:text-white flex items-center justify-center cursor-pointer"><i className="fa-solid fa-xmark"></i></button>
            </div>
            
            <div className="space-y-2.5 text-xs text-gray-300">
              <div className="bg-amber-500/10 border border-amber-500/35 rounded-xl p-3">
                <span className="font-gaming text-amber-400 font-bold block text-[10px] mb-1"><i className="fa-solid fa-circle-exclamation mr-1"></i>1. Strict Withdrawal Policy</span>
                Users can only withdraw from their WINNINGS POINTS balance. Deposit bonus points cannot be withdrawn directly.
              </div>
              <div className="bg-[#05131e] border border-[#103650] rounded-xl p-3">
                <span className="font-gaming text-indigo-300 font-bold block text-[10px] mb-1">2. Fair Play & Anti-Cheat</span>
                Use of any third-party scripts, hacks, or unauthorized emulators will result in an immediate permanent ban.
              </div>
              <div className="bg-[#05131e] border border-[#103650] rounded-xl p-3">
                <span className="font-gaming text-indigo-300 font-bold block text-[10px] mb-1">3. Room ID Allocation</span>
                Room ID & Password will be revealed 10-15 minutes prior to match time directly in the app and WhatsApp group.
              </div>
              <div className="bg-[#05131e] border border-[#103650] rounded-xl p-3">
                <span className="font-gaming text-indigo-300 font-bold block text-[10px] mb-1">4. Kill & Dispute Claims</span>
                Proper screenshot or video proof must be submitted to admin within 15 minutes of match completion for dispute verification.
              </div>
              <div className="bg-[#05131e] border border-[#103650] rounded-xl p-3">
                <span className="font-gaming text-indigo-300 font-bold block text-[10px] mb-1">5. Correct In-Game UID</span>
                Make sure to provide your correct in-game Character UID during registration. Wrong UID entries will not be entertained.
              </div>
            </div>

            <button onClick={() => setShowRulesModal(false)} className="w-full py-2.5 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-gaming font-black text-xs uppercase rounded-xl cursor-pointer shadow-md">AGREE & CLOSE</button>
          </div>
        </div>
      )}

      {showFaqModal && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-md z-[999] flex items-center justify-center p-4">
          <div className="w-full max-w-[420px] bg-[#071926] border border-teal-500/35 rounded-[32px] p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-[#123954]">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-circle-question text-teal-400 text-base"></i>
                <h3 className="font-gaming font-bold text-sm uppercase text-white">FAQ & User Guide</h3>
              </div>
              <button onClick={() => setShowFaqModal(false)} className="w-7 h-7 rounded-full bg-[#0d2a3d] text-gray-400 hover:text-white flex items-center justify-center cursor-pointer"><i className="fa-solid fa-xmark"></i></button>
            </div>
            
            <div className="space-y-3 text-xs text-gray-300">
              <div className="bg-[#05131e] border border-[#103650] rounded-xl p-3">
                <span className="font-gaming text-teal-300 font-bold block text-[10px] mb-1">1. How to Add Points?</span>
                Go to Wallet &rarr; Click <b>Add Points</b>, scan or pay to the official UPI ID via any payment app, enter the amount, and submit your 12-digit UTR/Ref number. Points reflect after quick verification.
              </div>
              <div className="bg-[#05131e] border border-[#103650] rounded-xl p-3">
                <span className="font-gaming text-teal-300 font-bold block text-[10px] mb-1">2. How to Join a Match?</span>
                Browse tournaments in the <b>All</b> tab, click <b>Join Battle</b>, fill in your Team Name and In-game Character UID, and confirm your entry fee deduction.
              </div>
              <div className="bg-[#05131e] border border-[#103650] rounded-xl p-3">
                <span className="font-gaming text-teal-300 font-bold block text-[10px] mb-1">3. How to Request Withdrawals?</span>
                Go to Wallet &rarr; Click <b>Withdraw</b>. Ensure you have sufficient Winnings Balance (Min. 50 Pts). Enter your receiving UPI ID and submit your cashout request.
              </div>
              <div className="bg-[#05131e] border border-[#103650] rounded-xl p-3">
                <span className="font-gaming text-teal-300 font-bold block text-[10px] mb-1">4. Where to Find Room ID & Password?</span>
                Once registered, check the <b>Upcoming</b> tab inside your dashboard 10-15 minutes before the match starts to copy your custom Room credentials.
              </div>
            </div>

            <button onClick={() => setShowFaqModal(false)} className="w-full py-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 font-gaming font-black text-xs uppercase rounded-xl cursor-pointer">CLOSE GUIDE</button>
          </div>
        </div>
      )}

      {showPassbookModal && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-md z-[999] flex items-center justify-center p-4">
          <div className="w-full max-w-[420px] bg-[#071926] border border-cyan-500/35 rounded-[32px] p-5 space-y-4 max-h-[88vh] overflow-y-auto">
            <div className="files items-center justify-between pb-2 border-b border-[#123954] flex">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-cyan-500/15 text-cyan-400 flex items-center justify-center text-xs">
                  <i className="fa-solid fa-receipt"></i>
                </div>
                <h3 className="font-gaming font-bold text-sm uppercase text-white">Wallet Balance & Passbook</h3>
              </div>
              <button onClick={() => setShowPassbookModal(false)} className="w-7 h-7 rounded-full bg-[#0d2a3d] text-gray-400 hover:text-white flex items-center justify-center cursor-pointer"><i className="fa-solid fa-xmark"></i></button>
            </div>

            <div className="space-y-2.5 max-h-[350px] overflow-y-auto">
              {transactionHistory.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-8">No transaction records found in database.</p>
              ) : (
                transactionHistory.map((tx, index) => (
                  <div key={index} className="bg-[#05131e] border border-[#103650] p-3 rounded-2xl flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white text-xs block">{tx.description}</span>
                      <span className="text-[10px] text-gray-400">{new Date(tx.date).toLocaleString()}</span>
                    </div>
                    <div className={`font-gaming font-bold text-xs ${tx.type === 'CREDIT' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {tx.type === 'CREDIT' ? `+${tx.amount}` : `-${tx.amount}`} Pts
                    </div>
                  </div>
                ))
              )}
            </div>

            <button onClick={() => setShowPassbookModal(false)} className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-gaming font-black text-xs uppercase rounded-xl cursor-pointer">CLOSE PASSBOOK</button>
          </div>
        </div>
      )}

    </div>
  );
}