import React, { useState, useEffect } from 'react';

export default function AdminDashboard({ tournaments, setTournaments, onSwitchToPlayer }) {
  const [toast, setToast] = useState(null);
  const adminPhone = "9170980044"; // Master Admin Phone

  // Confirmation Modal State
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [editingMatchId, setEditingMatchId] = useState(null);

  // Live Requests State from Backend
  const [withdrawalRequests, setWithdrawalRequests] = useState([]);
  const [rechargeRequests, setRechargeRequests] = useState([]);

  // Selected tournament for reward distribution & Registered Players list
  const [selectedRewardMatchId, setSelectedRewardMatchId] = useState('');
  const [registeredPlayers, setRegisteredPlayers] = useState([]);
  const [winnerIgn, setWinnerIgn] = useState('');
  const [winnerUid, setWinnerUid] = useState('');
  const [rewardPoints, setRewardPoints] = useState('');

  // Room Credentials State
  const [selectedRoomMatchId, setSelectedRoomMatchId] = useState('');
  const [roomIdInput, setRoomIdInput] = useState('');
  const [roomPasswordInput, setRoomPasswordInput] = useState('');

  // Tournament Creation Form State
  const [matchTitle, setMatchTitle] = useState('');
  const [matchIdInput, setMatchIdInput] = useState('');
  const [mapName, setMapName] = useState('Livik');
  const [mode, setMode] = useState('Solo');
  const [maxSlots, setMaxSlots] = useState('25');
  const [entryFee, setEntryFee] = useState('20');
  const [prizePool, setPrizePool] = useState('400 INR');
  const [rewardDetails, setRewardDetails] = useState('eg:20pts/kill');
  
  const [matchDate, setMatchDate] = useState(new Date().toISOString().split('T')[0]);
  const [matchTime, setMatchTime] = useState('15:30');
  const [durationMinutes, setDurationMinutes] = useState('20');
  const [matchEndTime, setMatchEndTime] = useState('');

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Fetch Tournaments and Pending Requests on Load
  useEffect(() => {
    fetchTournamentsList();
    fetchPendingData();
  }, []);

  const fetchTournamentsList = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/tournaments');
      const data = await res.json();
      if (data.success && data.tournaments) {
        setTournaments(data.tournaments);
      }
    } catch (err) {
      console.error("Failed to fetch tournaments list", err);
    }
  };

  // Fetch registered players whenever selected tournament changes
  useEffect(() => {
    if (selectedRewardMatchId) {
      fetchRegisteredPlayers(selectedRewardMatchId);
    } else {
      setRegisteredPlayers([]);
      setWinnerIgn('');
      setWinnerUid('');
    }
  }, [selectedRewardMatchId]);

  const fetchRegisteredPlayers = async (tournamentId) => {
    try {
      const response = await fetch(`http://localhost:8000/api/admin/tournament/${tournamentId}/players`, {
        headers: { 'phone': adminPhone }
      });
      const data = await response.json();
      
      if (response.ok && data.success) {
        setRegisteredPlayers(data.players || []);
      } else {
        setRegisteredPlayers([]);
      }
    } catch (err) {
      console.error("Failed to fetch registered players", err);
      setRegisteredPlayers([]);
    }
  };

  const fetchPendingData = async () => {
    try {
      const resRecharge = await fetch('http://localhost:8000/api/admin/recharge/pending', {
        headers: { 'phone': adminPhone }
      });
      const dataRecharge = await resRecharge.json();
      if (dataRecharge.success) {
        setRechargeRequests(dataRecharge.pending_recharges);
      }

      const resWithdraw = await fetch('http://localhost:8000/api/admin/withdrawal/pending', {
        headers: { 'phone': adminPhone }
      });
      const dataWithdraw = await resWithdraw.json();
      if (dataWithdraw.success) {
        setWithdrawalRequests(dataWithdraw.pending_withdrawals);
      }
    } catch (err) {
      console.error("Failed to load admin pending requests", err);
    }
  };

  // Automatically calculate Match End Time based on start time & duration
  useEffect(() => {
    if (matchTime && durationMinutes) {
      try {
        const [hours, minutes] = matchTime.split(':').map(Number);
        const startDate = new Date();
        startDate.setHours(hours, minutes, 0, 0);

        const endDate = new Date(startDate.getTime() + Number(durationMinutes) * 60000);
        const endHours = String(endDate.getHours()).padStart(2, '0');
        const endMinutes = String(endDate.getMinutes()).padStart(2, '0');
        
        setMatchEndTime(`${endHours}:${endMinutes}`);
      } catch (e) {
        setMatchEndTime('');
      }
    }
  }, [matchTime, durationMinutes]);

  const formatDateTimeDisplay = (dateStr, timeStr) => {
    if (!dateStr || !timeStr) return 'Soon';
    try {
      const [year, month, day] = dateStr.split('-');
      const dateObj = new Date(year, month - 1, day);
      const options = { month: 'short', day: 'numeric' };
      const formattedDate = dateObj.toLocaleDateString('en-US', options);

      const [hours24, minutes] = timeStr.split(':');
      let hours = parseInt(hours24, 10);
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      return `${formattedDate} • ${hours}:${minutes} ${ampm}`;
    } catch (e) {
      return `${dateStr} ${timeStr}`;
    }
  };

  const handleFormSubmitClick = (e) => {
    e.preventDefault();
    if (!matchTitle || !matchDate || !matchTime) {
      showToast("Please fill in all mandatory fields!", "error");
      return;
    }
    setShowConfirmModal(true);
  };

  const confirmPublishTournament = async () => {
    const formattedSchedule = formatDateTimeDisplay(matchDate, matchTime);
    const tournamentId = editingMatchId || matchIdInput || ('match-' + Date.now());

    const payload = {
      id: tournamentId,
      title: matchTitle,
      map_name: mapName,
      match_type: mode,
      prize_pool: prizePool,
      date_time: formattedSchedule,
      entry_fee: String(entryFee),
      total_slots: Number(maxSlots),
      reward_info: rewardDetails,
      status: "Upcoming",
      start_time: matchTime,
      end_time: matchEndTime || matchTime
    };

    try {
      const endpoint = editingMatchId 
        ? `http://localhost:8000/api/admin/tournament/edit/${editingMatchId}`
        : 'http://localhost:8000/api/admin/tournament/create';
      
      const method = editingMatchId ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'phone': adminPhone
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        showToast(editingMatchId ? "✏️ Tournament updated successfully!" : "🚀 Tournament published successfully!", "success");
        setEditingMatchId(null);
        fetchTournamentsList();
      } else {
        showToast(data.detail || "Operation failed.", "error");
      }
    } catch (err) {
      showToast("Network error connecting to backend.", "error");
    }

    setShowConfirmModal(false);
    setMatchTitle('');
    setMatchIdInput('');
    setMapName('Livik');
    setMode('Solo');
    setMaxSlots('25');
    setEntryFee('20');
    setPrizePool('400 INR');
    setRewardDetails('10pts/kill + 20pts Winner');
  };

  const handleApproveRecharge = async (requestId) => {
    try {
      const response = await fetch('http://localhost:8000/api/admin/recharge/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'phone': adminPhone
        },
        body: JSON.stringify({ request_id: requestId })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        showToast(data.message, "success");
        fetchPendingData();
      } else {
        showToast(data.detail || "Failed to approve recharge.", "error");
      }
    } catch (err) {
      showToast("Network error approving recharge.", "error");
    }
  };

  const handleApproveWithdrawal = async (requestId) => {
    try {
      const response = await fetch('http://localhost:8000/api/admin/withdrawal/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'phone': adminPhone
        },
        body: JSON.stringify({ request_id: requestId })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        showToast(data.message, "success");
        fetchPendingData();
      } else {
        showToast(data.detail || "Failed to approve withdrawal.", "error");
      }
    } catch (err) {
      showToast("Network error approving withdrawal.", "error");
    }
  };

  const handleUploadResultSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRewardMatchId || !winnerIgn || !winnerUid || !rewardPoints) {
      showToast("Please fill in all result fields!", "error");
      return;
    }

    try {
      const response = await fetch(`http://localhost:8000/api/admin/tournament/result/${selectedRewardMatchId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'phone': adminPhone
        },
        body: JSON.stringify({
          in_game_name: winnerIgn,
          uid: winnerUid,
          reward_points: Number(rewardPoints)
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        showToast("🏆 Result saved & points credited to user wallet!", "success");
        setWinnerIgn('');
        setWinnerUid('');
        setRewardPoints('');
        setSelectedRewardMatchId('');
        setRegisteredPlayers([]);
        fetchTournamentsList();
      } else {
        showToast(data.detail || "Failed to upload result.", "error");
      }
    } catch (err) {
      showToast("Network error uploading result.", "error");
    }
  };

  const handleRoomSubmitSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRoomMatchId || !roomIdInput || !roomPasswordInput) {
      showToast("Please fill in all room credential fields!", "error");
      return;
    }

    try {
      const response = await fetch(`http://localhost:8000/api/admin/tournament/room/${selectedRoomMatchId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'phone': adminPhone
        },
        body: JSON.stringify({
          room_id: roomIdInput,
          room_password: roomPasswordInput
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        showToast("🔑 Room credentials published successfully!", "success");
        setSelectedRoomMatchId('');
        setRoomIdInput('');
        setRoomPasswordInput('');
      } else {
        showToast(data.detail || "Failed to publish room credentials.", "error");
      }
    } catch (err) {
      showToast("Network error publishing room credentials.", "error");
    }
  };

  return (
    <div className="bg-[#03070d] text-gray-200 font-body min-h-[100dvh] w-full p-4 sm:p-8 flex justify-center selection:bg-amber-500 selection:text-black">

      {toast && (
        <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2 px-4 py-2.5 rounded-full border backdrop-blur-md text-xs font-gaming font-semibold tracking-wide whitespace-nowrap shadow-2xl ${
          toast.type === 'success' ? 'bg-[#06242b]/95 border-teal-400/60 text-teal-300' : 'bg-[#2b0a0a]/95 border-red-500/60 text-red-300'
        }`}>
          <i className={`fa-solid ${toast.type === 'success' ? 'fa-circle-check text-teal-400' : 'fa-circle-exclamation text-red-400'} text-sm`}></i>
          <span>{toast.message}</span>
        </div>
      )}

      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
          <div className="w-full max-w-[340px] bg-[#071926] border border-teal-500/40 rounded-3xl p-5 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 bg-teal-500/20 text-teal-300 rounded-2xl flex items-center justify-center mx-auto text-xl border border-teal-400/30">
              <i className="fa-solid fa-circle-question"></i>
            </div>
            <div>
              <h4 className="font-gaming font-bold text-white text-sm uppercase">{editingMatchId ? "Confirm Update" : "Confirm Publication"}</h4>
              <p className="text-xs text-gray-300 mt-1">Are you sure you want to {editingMatchId ? "update" : "publish"} <span className="text-teal-300 font-bold">"{matchTitle}"</span>?</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setShowConfirmModal(false)} className="py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-gaming text-xs font-bold uppercase cursor-pointer">Cancel</button>
              <button onClick={confirmPublishTournament} className="py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 font-gaming font-black text-xs uppercase cursor-pointer shadow-md">Yes, {editingMatchId ? "Update" : "Publish"}</button>
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-[1000px] space-y-6">

        <header className="bg-[#071926] border border-[#103650] p-5 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-400/40 flex items-center justify-center text-amber-400 text-lg shadow-[0_0_15px_rgba(245,158,11,0.2)]">
              <i className="fa-solid fa-shield-halved"></i>
            </div>
            <div>
              <h1 className="font-gaming font-black text-lg text-white tracking-wider">VENOM ADMIN ENGINE</h1>
              <p className="text-[11px] text-gray-400 font-mono">Operations, PostgreSQL Sync & Settlement</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button onClick={onSwitchToPlayer} className="px-4 py-2 rounded-xl bg-[#05131e] border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 font-gaming text-xs font-bold uppercase transition flex items-center gap-2 cursor-pointer shadow-md">
              <i className="fa-solid fa-arrow-left"></i> Player Dashboard
            </button>
            <button onClick={() => { fetchTournamentsList(); fetchPendingData(); }} className="px-4 py-2 rounded-xl bg-teal-600/20 border border-teal-500/40 text-teal-300 font-gaming text-xs font-bold uppercase transition cursor-pointer">
              <i className="fa-solid fa-rotate"></i> Refresh Data
            </button>
          </div>
        </header>

        {/* 1. PENDING RECHARGE REQUESTS */}
        <section className="bg-[#071926] border border-teal-500/30 p-6 rounded-3xl space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-[#123954] pb-3">
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-coins text-teal-400"></i>
              <h3 className="font-gaming font-bold text-sm uppercase text-white tracking-wide">Pending Recharge Requests</h3>
            </div>
            <span className="text-[10px] bg-teal-500/20 text-teal-300 px-2.5 py-1 rounded-full font-gaming font-bold">{rechargeRequests.length} Pending</span>
          </div>

          <div className="space-y-3">
            {rechargeRequests.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-4">No pending recharge requests in database.</p>
            ) : (
              rechargeRequests.map(req => (
                <div key={req.id} className="bg-[#05131e] border border-[#103650] p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <p className="text-white font-bold">Phone: <span className="text-teal-300">{req.phone}</span></p>
                    <p className="text-gray-400 mt-0.5">Amount: <span className="text-amber-400 font-bold">{req.amount} Pts</span> • UTR: <span className="font-mono text-white">{req.utr_number}</span></p>
                  </div>
                  <button onClick={() => handleApproveRecharge(req.id)} className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-slate-950 font-gaming font-bold uppercase rounded-xl cursor-pointer shadow-md">
                    Verify & Credit Points
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        {/* 2. PENDING WITHDRAWAL REQUESTS */}
        <section className="bg-[#071926] border border-amber-500/30 p-6 rounded-3xl space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-[#123954] pb-3">
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-wallet text-amber-400"></i>
              <h3 className="font-gaming font-bold text-sm uppercase text-white tracking-wide">Pending Withdrawal Requests (Winnings)</h3>
            </div>
            <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2.5 py-1 rounded-full font-gaming font-bold">{withdrawalRequests.length} Pending</span>
          </div>

          <div className="space-y-3">
            {withdrawalRequests.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-4">No pending withdrawal requests in database.</p>
            ) : (
              withdrawalRequests.map(req => (
                <div key={req.id} className="bg-[#05131e] border border-[#103650] p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <p className="text-white font-bold">Phone: <span className="text-teal-300">{req.phone}</span></p>
                    <p className="text-gray-400 mt-0.5">Amount: <span className="text-amber-400 font-bold">{req.amount} Pts</span> • UPI: <span className="font-mono text-white">{req.upi_id}</span></p>
                  </div>
                  <button onClick={() => handleApproveWithdrawal(req.id)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-gaming font-bold uppercase rounded-xl cursor-pointer shadow-md">
                    Approve Cashout
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        {/* 3. CREATE / EDIT TOURNAMENT FORM */}
        <section className="bg-[#071926] border border-[#103650] p-6 rounded-3xl space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-[#123954] pb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-teal-500/15 text-teal-400 rounded-xl flex items-center justify-center text-xs">
                <i className={`fa-solid ${editingMatchId ? 'fa-pen-to-square' : 'fa-plus'}`}></i>
              </div>
              <h3 className="font-gaming font-bold text-sm uppercase text-white tracking-wide">
                {editingMatchId ? 'Edit Tournament Details' : 'Create Custom Tournament'}
              </h3>
            </div>
          </div>

          <form onSubmit={handleFormSubmitClick} className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-gray-300 mb-1 font-gaming uppercase text-[10px]">Tournament ID (Unique Key)</label>
              <input type="text" value={matchIdInput} onChange={(e) => setMatchIdInput(e.target.value)} placeholder="e.g. match_1_1" disabled={editingMatchId} required className="w-full px-3 py-2.5 bg-[#05131e] border border-[#103650] rounded-xl text-white outline-none font-mono" />
            </div>

            <div>
              <label className="block text-gray-300 mb-1 font-gaming uppercase text-[10px]">Tournament Title</label>
              <input type="text" value={matchTitle} onChange={(e) => setMatchTitle(e.target.value)} placeholder="e.g. Solo Custom Battle #01" required className="w-full px-3 py-2.5 bg-[#05131e] border border-[#103650] rounded-xl text-white outline-none" />
            </div>

            <div>
              <label className="block text-gray-300 mb-1 font-gaming uppercase text-[10px]">Map Name</label>
              <input type="text" value={mapName} onChange={(e) => setMapName(e.target.value)} placeholder="e.g. Erangel, Livik" required className="w-full px-3 py-2.5 bg-[#05131e] border border-[#103650] rounded-xl text-white outline-none" />
            </div>

            <div>
              <label className="block text-gray-300 mb-1 font-gaming uppercase text-[10px]">Lineup Mode</label>
              <select value={mode} onChange={(e) => setMode(e.target.value)} className="w-full px-3 py-2.5 bg-[#05131e] border border-[#103650] rounded-xl text-white outline-none font-gaming">
                <option value="Solo">Solo</option>
                <option value="Duo">Duo</option>
                <option value="Squad">Squad</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-300 mb-1 font-gaming uppercase text-[10px]">Total Slots Limit</label>
              <input type="number" value={maxSlots} onChange={(e) => setMaxSlots(e.target.value)} required className="w-full px-3 py-2.5 bg-[#05131e] border border-[#103650] rounded-xl text-white font-stats font-bold" />
            </div>

            <div>
              <label className="block text-gray-300 mb-1 font-gaming uppercase text-[10px]">Entry Fee (Points)</label>
              <input type="number" value={entryFee} onChange={(e) => setEntryFee(e.target.value)} required className="w-full px-3 py-2.5 bg-[#05131e] border border-[#103650] rounded-xl text-white font-stats font-bold" />
            </div>

            <div>
              <label className="block text-gray-300 mb-1 font-gaming uppercase text-[10px]">Total Prize Pool Display</label>
              <input type="text" value={prizePool} onChange={(e) => setPrizePool(e.target.value)} placeholder="e.g. 500 INR / 500 Pts" required className="w-full px-3 py-2.5 bg-[#05131e] border border-[#103650] rounded-xl text-white" />
            </div>

            <div>
              <label className="block text-gray-300 mb-1 font-gaming uppercase text-[10px]">Match Duration (Minutes)</label>
              <input type="number" value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} placeholder="e.g. 20" required className="w-full px-3 py-2.5 bg-[#05131e] border border-[#103650] rounded-xl text-white font-stats font-bold" />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-gray-300 mb-1 font-gaming uppercase text-[10px]">Match Reward Info</label>
              <input type="text" value={rewardDetails} onChange={(e) => setRewardDetails(e.target.value)} placeholder="e.g. Winner Prize: 500 Pts" required className="w-full px-3 py-2.5 bg-[#05131e] border border-[#103650] rounded-xl text-white" />
            </div>

            <div>
              <label className="block text-gray-300 mb-1 font-gaming uppercase text-[10px]">Match Date</label>
              <input type="date" value={matchDate} onChange={(e) => setMatchDate(e.target.value)} required className="w-full px-3 py-2.5 bg-[#05131e] border border-[#103650] rounded-xl text-white outline-none cursor-pointer [color-scheme:dark]" />
            </div>

            <div>
              <label className="block text-gray-300 mb-1 font-gaming uppercase text-[10px]">Match Start Time (Calculates End Time: {matchEndTime || 'Auto'})</label>
              <input type="time" value={matchTime} onChange={(e) => setMatchTime(e.target.value)} required className="w-full px-3 py-2.5 bg-[#05131e] border border-[#103650] rounded-xl text-white outline-none cursor-pointer [color-scheme:dark]" />
            </div>

            <div className="sm:col-span-2 pt-2">
              <button type="submit" className="w-full py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 font-gaming font-black text-xs uppercase rounded-xl cursor-pointer shadow-[0_0_15px_rgba(20,184,166,0.3)]">
                {editingMatchId ? 'Update Tournament' : 'Publish Tournament to Database'}
              </button>
            </div>
          </form>
        </section>

        {/* 4. MATCH SETTLEMENT & WINNER REWARD DISTRIBUTION */}
        <section className="bg-[#071926] border border-teal-500/40 p-6 rounded-3xl space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-[#123954] pb-3">
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-trophy text-amber-400"></i>
              <h3 className="font-gaming font-bold text-sm uppercase text-white tracking-wide">Upload Result & Auto-Credit Winnings</h3>
            </div>
          </div>

          <form onSubmit={handleUploadResultSubmit} className="space-y-3 text-xs">
            <div>
              <label className="block text-gray-300 mb-1 font-gaming uppercase text-[10px]">Select Tournament ID</label>
              <select 
                value={selectedRewardMatchId} 
                onChange={(e) => setSelectedRewardMatchId(e.target.value)} 
                required 
                className="w-full px-3 py-2.5 bg-[#05131e] border border-[#103650] rounded-xl text-white outline-none font-gaming"
              >
                <option value="">Choose tournament...</option>
                {tournaments && tournaments.map(t => (
                  <option key={t.id} value={t.id}>{t.title} (ID: {t.id})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-gray-300 mb-1 font-gaming uppercase text-[10px]">Winner In-Game Name (IGN)</label>
                <select 
                  value={winnerIgn} 
                  onChange={(e) => {
                    const selectedName = e.target.value;
                    setWinnerIgn(selectedName);
                    const matchedPlayer = registeredPlayers.find(p => p.ign === selectedName);
                    if (matchedPlayer) {
                      setWinnerUid(matchedPlayer.uid);
                    } else {
                      setWinnerUid('');
                    }
                  }} 
                  disabled={!selectedRewardMatchId || registeredPlayers.length === 0}
                  required 
                  className="w-full px-3 py-2.5 bg-[#05131e] border border-[#103650] rounded-xl text-white outline-none font-gaming disabled:opacity-50"
                >
                  <option value="">
                    {!selectedRewardMatchId 
                      ? "Choose tournament first" 
                      : registeredPlayers.length === 0 
                      ? "No players registered yet" 
                      : "Select registered player..."}
                  </option>
                  {registeredPlayers.map((player, idx) => (
                    <option key={idx} value={player.ign}>{player.ign} (UID: {player.uid})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-300 mb-1 font-gaming uppercase text-[10px]">Winner Character UID</label>
                <input 
                  type="text" 
                  value={winnerUid} 
                  readOnly 
                  placeholder="Auto-filled UID" 
                  className="w-full px-3 py-2.5 bg-[#05131e]/70 border border-[#103650] rounded-xl text-teal-300 font-mono outline-none cursor-not-allowed" 
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-1 font-gaming uppercase text-[10px]">Reward Points</label>
                <input 
                  type="number" 
                  value={rewardPoints} 
                  onChange={(e) => setRewardPoints(e.target.value)} 
                  placeholder="e.g. 500" 
                  required 
                  className="w-full px-3 py-2.5 bg-[#05131e] border border-[#103650] rounded-xl text-white font-stats font-bold outline-none" 
                />
              </div>
            </div>

            <button type="submit" className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-gaming font-black text-xs uppercase rounded-xl cursor-pointer shadow-md">
              Submit Result & Credit Wallet Winnings
            </button>
          </form>
        </section>

        {/* 5. PUBLISH ROOM ID & PASSWORD SECTION */}
        <section className="bg-[#071926] border border-cyan-500/40 p-6 rounded-3xl space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-[#123954] pb-3">
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-key text-cyan-400"></i>
              <h3 className="font-gaming font-bold text-sm uppercase text-white tracking-wide">Publish Room ID & Password</h3>
            </div>
          </div>

          <form onSubmit={handleRoomSubmitSubmit} className="space-y-3 text-xs">
            <div>
              <label className="block text-gray-300 mb-1 font-gaming uppercase text-[10px]">Select Tournament ID</label>
              <select 
                value={selectedRoomMatchId} 
                onChange={(e) => setSelectedRoomMatchId(e.target.value)} 
                required 
                className="w-full px-3 py-2.5 bg-[#05131e] border border-[#103650] rounded-xl text-white outline-none font-gaming"
              >
                <option value="">Choose tournament...</option>
                {tournaments && tournaments.map(t => (
                  <option key={t.id} value={t.id}>{t.title} (ID: {t.id})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-300 mb-1 font-gaming uppercase text-[10px]">Room ID</label>
                <input 
                  type="text" 
                  value={roomIdInput} 
                  onChange={(e) => setRoomIdInput(e.target.value)} 
                  placeholder="e.g. 8492019" 
                  required 
                  className="w-full px-3 py-2.5 bg-[#05131e] border border-[#103650] rounded-xl text-white font-mono outline-none" 
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-1 font-gaming uppercase text-[10px]">Room Password</label>
                <input 
                  type="text" 
                  value={roomPasswordInput} 
                  onChange={(e) => setRoomPasswordInput(e.target.value)} 
                  placeholder="e.g. venom2026" 
                  required 
                  className="w-full px-3 py-2.5 bg-[#05131e] border border-[#103650] rounded-xl text-white font-mono outline-none" 
                />
              </div>
            </div>

            <button type="submit" className="w-full py-3 bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 font-gaming font-black text-xs uppercase rounded-xl cursor-pointer shadow-md">
              Broadcast Room Credentials to Registered Players
            </button>
          </form>
        </section>

      </div>
    </div>
  );
}