import React, { useState, useEffect, useRef } from 'react';

export default function AuthView({ onLoginSuccess }) {
  const [step, setStep] = useState('phone'); // 'phone' or 'otp'
  const [phone, setPhone] = useState('');
  const [otpValues, setOtpValues] = useState(['', '', '', '', '', '']);
  const [timeLeft, setTimeLeft] = useState(120);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [toast, setToast] = useState(null);

  const otpRefs = useRef([]);
  const timerRef = useRef(null);

  const ADMIN_PHONE = "9170980044";

  // Toast Notification Trigger
  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 2500);
  };

  // Countdown Timer Management
  useEffect(() => {
    if (step === 'otp') {
      clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [step]);

  // Format Timer Display (MM:SS)
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Handle Send OTP (Backend API Integration)
  const handleSendOtp = async () => {
    const trimmedPhone = phone.trim();

    if (trimmedPhone.length !== 10 || isNaN(trimmedPhone)) {
      showToast("Please enter a valid 10-digit mobile number!", "error");
      return;
    }

    // Agar Admin phone hai, toh OTP generate karne ki zaroorat nahi (Master OTP use hoga)
    if (trimmedPhone === ADMIN_PHONE) {
      setStep('otp');
      setTimeLeft(120); // Reset timer for Admin step too
      setOtpValues(['', '', '', '', '', '']); // Clear inputs
      setTimeout(() => otpRefs.current[0]?.focus(), 50);
      showToast("Admin access recognized. Enter Master Key.", "success");
      return;
    }

    setIsSending(true);
    try {
      const response = await fetch('http://localhost:8000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: trimmedPhone })
      });
      const data = await response.json();

      if (response.ok && data.success) {
        setIsSending(false);
        setStep('otp');
        setTimeLeft(120); // ⏱️ TIMER RESET TO 120 SECONDS ON RESEND/SEND
        setOtpValues(['', '', '', '', '', '']); // Clear previous OTP inputs
        setTimeout(() => otpRefs.current[0]?.focus(), 50);
        showToast("OTP sent successfully! Check your phone.", "success");
      } else {
        setIsSending(false);
        showToast(data.detail || "Failed to send OTP.", "error");
      }
    } catch (err) {
      setIsSending(false);
      showToast("Network error. Make sure FastAPI backend is running.", "error");
    }
  };

  // Handle OTP Box Input & Navigation
  const handleOtpInput = (index, value) => {
    if (isNaN(value)) return;
    const newOtp = [...otpValues];
    newOtp[index] = value;
    setOtpValues(newOtp);

    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  // Handle Login & Verification (Backend API Integration)
  const handleLogin = async () => {
    const enteredOtp = otpValues.join('');

    if (enteredOtp.length !== 6) {
      showToast("Please enter complete 6-digit OTP!", "error");
      return;
    }

    setIsVerifying(true);

    try {
      if (phone === ADMIN_PHONE) {
        // --- ADMIN VERIFICATION API CALL ---
        const response = await fetch('http://localhost:8000/api/admin/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, otp: enteredOtp })
        });
        const data = await response.json();

        setIsVerifying(false);

        if (response.ok && data.success) {
          showToast("Admin authenticated successfully! Redirecting...", "success");
          setTimeout(() => onLoginSuccess({ phone, role: 'admin' }), 1000);
        } else {
          showToast(data.detail || "Invalid Master Key!", "error");
        }
      } else {
        // --- PLAYER OTP VERIFICATION API CALL ---
        const response = await fetch('http://localhost:8000/api/verify-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, otp: enteredOtp })
        });
        const data = await response.json();

        setIsVerifying(false);

        if (response.ok && data.success) {
          showToast("Login successful! Redirecting...", "success");
          setTimeout(() => onLoginSuccess({ phone, role: 'player' }), 1000);
        } else {
          showToast(data.detail || "Invalid OTP! Please try again.", "error");
        }
      }
    } catch (err) {
      setIsVerifying(false);
      showToast("Network error during verification.", "error");
    }
  };

  return (
    <div className="bg-[#050a0f] text-gray-200 font-sans h-[100dvh] w-full flex items-center justify-center p-0 sm:p-4 selection:bg-teal-500 selection:text-black overflow-hidden fixed inset-0">

      {/* Floating Toast Notification Engine */}
      {toast && (
        <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2 px-4 py-2 rounded-full border backdrop-blur-md text-xs font-bold tracking-wide whitespace-nowrap shadow-xl transition-all duration-300 ${
          toast.type === 'success' 
            ? 'bg-[#061e2b]/95 border-teal-400/60 text-teal-300 shadow-[0_0_20px_rgba(20,184,166,0.3)]' 
            : 'bg-[#1c0a0a]/95 border-red-500/60 text-red-300 shadow-[0_0_20px_rgba(239,68,68,0.3)]'
        }`}>
          <i className={`fa-solid ${toast.type === 'success' ? 'fa-circle-check text-teal-400' : 'fa-circle-exclamation text-red-400'} text-xs`}></i>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Fixed App Container */}
      <div className="relative w-full max-w-[420px] h-[100dvh] sm:h-[880px] sm:rounded-[36px] sm:border sm:border-[#13354a] overflow-hidden shadow-[0_0_35px_rgba(20,184,166,0.12)] flex flex-col justify-between p-6 sm:p-8 bg-gradient-to-b from-[#091b26] via-[#051119] to-[#03080d]">

        {/* Background Artwork */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <img src="https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1200&auto=format&fit=crop" 
               alt="Arena Background" 
               className="w-full h-full object-cover filter brightness-[0.25] contrast-110" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#050a0f]/60 via-[#06141f]/85 to-[#03080d]/95"></div>
        </div>

       {/* Header with Logo */}
        <div className="relative z-10 pt-4 space-y-2 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl overflow-hidden shrink-0 shadow-[0_0_15px_rgba(20,184,166,0.3)]">
              <img src="/image.png" alt="Venom Logo" className="w-full h-full object-cover" />
            </div>
            <h1 className="font-black text-xl sm:text-2xl text-white tracking-wider leading-tight uppercase">
              WELCOME TO<br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-cyan-400">VENOM ESPORTS</span>
            </h1>
          </div>
          <p className="text-xs text-slate-300 font-medium pl-1 tracking-wide">
            Log in with your registered mobile number
          </p>
        </div>

        {/* Form Section */}
        <div className="relative z-10 my-auto w-full py-2">
          <div className="bg-[#071926]/90 border border-[#103650] rounded-[28px] px-6 py-7 shadow-xl backdrop-blur-xl space-y-5">
            
            {/* Mobile Input Box */}
            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-wider text-slate-300 font-bold pl-1">
                MOBILE NUMBER
              </label>
              <div className="relative flex items-center bg-[#05131e] border border-[#103650] rounded-xl focus-within:border-teal-400 transition">
                <span className="pl-3.5 pr-2.5 text-teal-300 font-mono font-bold text-sm border-r border-[#103650]">+91</span>
                <input 
                  type="tel" 
                  maxLength="10" 
                  inputMode="numeric" 
                  placeholder="Enter 10-digit number" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={step === 'otp'}
                  className="w-full bg-transparent px-3 py-3 text-white font-mono text-sm focus:outline-none placeholder:text-gray-500"
                />
                {step === 'phone' && (
                  <button 
                    type="button" 
                    onClick={handleSendOtp}
                    disabled={isSending}
                    className="mr-2 px-3 py-1.5 bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 rounded-lg text-[10px] font-bold uppercase tracking-wider transition active:scale-95 whitespace-nowrap cursor-pointer">
                    {isSending ? "SENDING..." : "SEND OTP"}
                  </button>
                )}
              </div>
            </div>

            {/* 6-Digit OTP Box With Live Countdown Timer */}
            {step === 'otp' && (
              <div className="space-y-3 transition-all duration-300">
                <div className="flex justify-between items-center px-1">
                  <span className="text-xs text-slate-300">OTP Sent: <span className="text-teal-300 font-mono font-bold">+91 {phone}</span></span>
                  <button 
                    type="button" 
                    onClick={() => setStep('phone')} 
                    className="text-[11px] text-gray-400 hover:text-teal-300 underline cursor-pointer">
                    Change Number
                  </button>
                </div>

                {/* 6-Digit Grid */}
                <div className="grid grid-cols-6 gap-2">
                  {otpValues.map((digit, idx) => (
                    <input 
                      key={idx}
                      ref={(el) => (otpRefs.current[idx] = el)}
                      type="text" 
                      maxLength="1" 
                      inputMode="numeric" 
                      value={digit}
                      onChange={(e) => handleOtpInput(idx, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(idx, e.key)}
                      className="w-full h-11 bg-[#05131e] border border-[#103650] rounded-xl text-center text-lg font-bold text-white focus:outline-none focus:border-teal-400 transition"
                    />
                  ))}
                </div>

                {/* Timer & Resend Layout */}
                <div className="flex items-center justify-between px-1 text-[11px] pt-1">
                  <span className="text-gray-400 flex items-center gap-1.5 font-mono">
                    Expires in: <span className={timeLeft > 0 ? "text-teal-300 font-bold" : "text-red-400 font-bold"}>
                      {timeLeft > 0 ? formatTime(timeLeft) : "EXPIRED"}
                    </span>
                  </span>
                  <button 
                    type="button" 
                    onClick={handleSendOtp}
                    disabled={timeLeft > 0}
                    className={timeLeft > 0 ? "text-gray-500 cursor-not-allowed font-bold tracking-wider" : "text-teal-400 hover:underline font-bold tracking-wider cursor-pointer"}>
                    RESEND OTP
                  </button>
                </div>
              </div>
            )}

            {/* Login Button */}
            <button 
              type="button" 
              onClick={handleLogin}
              disabled={isVerifying || step === 'phone'}
              className={`w-full py-3.5 bg-gradient-to-r from-teal-500 to-cyan-500 hover:brightness-110 text-slate-950 font-black text-xs uppercase tracking-widest rounded-xl transition shadow-[0_0_15px_rgba(20,184,166,0.3)] active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer ${step === 'phone' ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <span>{isVerifying ? "VERIFYING..." : "LOGIN"}</span>
              <i className="fa-solid fa-arrow-right text-xs"></i>
            </button>

          </div>

          {/* Verification Footer */}
          <div className="mt-4 text-center space-y-0.5">
            <span className="text-xs text-slate-400 block font-medium">Fast & Secure Verification</span>
            <span className="text-[11px] text-teal-400/80 font-mono block">Venom Authentication Engine</span>
          </div>
        </div>

        <div className="h-4 shrink-0"></div>

      </div>
    </div>
  );
}