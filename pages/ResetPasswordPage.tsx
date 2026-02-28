
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { API_BASE_URL, handleResponse, safeFetch } from '../services/apiClient';

type ResetStep = 'email' | 'code' | 'password' | 'success';

const ResetPasswordPage: React.FC = () => {
  const [step, setStep] = useState<ResetStep>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [actualCode, setActualCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(0);
  const navigate = useNavigate();
  
  const codeInputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const passwordStrength = {
    length: newPassword.length >= 8,
    hasNumber: /\d/.test(newPassword),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword),
    hasUpper: /[A-Z]/.test(newPassword),
  };

  const strengthScore = Object.values(passwordStrength).filter(Boolean).length;

  const handleEmailSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsProcessing(true);
  setError(null);

  try {
    const res = await safeFetch(`${API_BASE_URL}/users/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(errorText || `Server returned ${res.status}`);
    }

    const data = await res.json();

    setActualCode(data.demoCode || '');
    setStep('code');
    setResendTimer(120);

  } catch (err: any) {
    console.error("Forgot password error:", err);
    setError(err.message || "Could not initiate recovery.");
  } finally {
    setIsProcessing(false);
  }
};

  const handleCodeChange = (index: number, value: string) => {
    if (value !== '' && !/^\d+$/.test(value)) return;
    
    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);

    if (value !== '' && index < 5) {
      codeInputs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && code[index] === '' && index > 0) {
      codeInputs.current[index - 1]?.focus();
    }
  };

  const handleCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const enteredCode = code.join('');
    if (enteredCode.length < 6) {
      setError("Please enter the full 6-digit code.");
      return;
    }

    // Server-side verification simulation
    if (actualCode && enteredCode !== actualCode) {
        setError("Invalid verification code. Please try again.");
        return;
    }
    
    setIsProcessing(true);
    setError(null);
    
    setTimeout(() => {
      setStep('password');
      setIsProcessing(false);
    }, 1000);
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
  e.preventDefault();

  if (newPassword !== confirmPassword) {
    setError("Passwords do not match.");
    return;
  }

  if (strengthScore < 3) {
    setError("Please choose a stronger password.");
    return;
  }

  setIsProcessing(true);
  setError(null);

  try {
    const res = await safeFetch(`${API_BASE_URL}/users/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, newPassword })
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(errorText || `Server returned ${res.status}`);
    }

    await res.json();
    setStep('success');

  } catch (err: any) {
    console.error("Reset password error:", err);
    setError(err.message || "Could not reset password.");
  } finally {
    setIsProcessing(false);
  }
};

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 selection:bg-emerald-100">
      <div className="max-w-md w-full">
        <div className="flex flex-col items-center mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="w-12 h-12 bg-primary-600 rounded-2xl flex items-center justify-center text-white text-xl font-black shadow-xl shadow-primary-200 mb-4">
            HR
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">MyHR Security</h1>
        </div>

        <div className="flex justify-between mb-8 px-8 relative">
          <div className="absolute top-4 left-8 right-8 h-0.5 bg-slate-200 -z-10"></div>
          {(['email', 'code', 'password', 'success'] as ResetStep[]).map((s, i) => {
            const index = ['email', 'code', 'password', 'success'].indexOf(step);
            const isCompleted = i < index;
            const isActive = i === index;
            return (
              <div key={s} className="flex flex-col items-center gap-2 relative">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black transition-all duration-500 border-2 ${
                  isCompleted ? 'bg-primary-600 border-primary-600 text-white' : 
                  isActive ? 'bg-white border-primary-600 text-primary-600 shadow-lg shadow-primary-100' : 
                  'bg-white border-slate-200 text-slate-400'
                }`}>
                  {isCompleted ? <i className="fas fa-check"></i> : i + 1}
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-100 overflow-hidden relative">
          <div className="h-1.5 w-full bg-gradient-to-r from-primary-400 to-primary-600"></div>
          
          <div className="p-10">
            {step === 'email' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="w-16 h-16 bg-primary-50 text-primary-600 rounded-[1.25rem] flex items-center justify-center text-2xl mb-6">
                  <i className="fas fa-shield-keyhole"></i>
                </div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-2">Forgot Password?</h2>
                <p className="text-slate-500 text-sm mb-8 leading-relaxed">Enter your corporate email and we'll send a real verification code to your inbox.</p>
                
                <form onSubmit={handleEmailSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Work Email Address</label>
                    <div className="relative group">
                      <i className="fas fa-at absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary-500 transition-colors"></i>
                      <input 
                        type="email" 
                        required 
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="name@myhr.com"
                        className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 font-bold text-slate-700 transition-all"
                      />
                    </div>
                  </div>
                  {error && <p className="text-rose-500 text-[10px] font-bold text-center bg-rose-50 p-3 rounded-xl">{error}</p>}
                  <button 
                    disabled={isProcessing}
                    className="w-full py-4 bg-primary-600 text-white font-black uppercase tracking-widest text-[11px] rounded-2xl shadow-xl shadow-primary-100 hover:bg-primary-700 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
                  >
                    {isProcessing && <i className="fas fa-spinner fa-spin"></i>}
                    {isProcessing ? 'Connecting...' : 'Send Recovery Email'}
                  </button>
                  <Link to="/login" className="block text-center text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors">
                    Back to Sign In
                  </Link>
                </form>
              </div>
            )}

            {step === 'code' && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-[1.25rem] flex items-center justify-center text-2xl mb-6">
                  <i className="fas fa-envelope-open-text"></i>
                </div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-2">Check your Inbox</h2>
                <p className="text-slate-500 text-sm mb-8 leading-relaxed">We've sent a 6-digit verification code to <span className="text-slate-800 font-bold">{email}</span>. Check your spam folder if you don't see it.</p>
                
                <form onSubmit={handleCodeSubmit} className="space-y-8">
                  <div className="flex justify-between gap-2">
                    {code.map((digit, i) => (
                      <input 
                        key={i}
                        ref={el => { codeInputs.current[i] = el; }}
                        type="text"
                        inputMode="numeric"
                        pattern="\d*"
                        maxLength={1}
                        value={digit}
                        onChange={e => handleCodeChange(i, e.target.value)}
                        onKeyDown={e => handleKeyDown(i, e)}
                        className="w-12 h-14 bg-slate-50 border border-slate-100 rounded-xl text-center text-xl font-black text-primary-600 focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all outline-none"
                      />
                    ))}
                  </div>

                  {error && <p className="text-rose-500 text-[10px] font-bold text-center animate-in shake">{error}</p>}

                  <div className="space-y-4">
                    <button 
                      disabled={isProcessing}
                      className="w-full py-4 bg-primary-600 text-white font-black uppercase tracking-widest text-[11px] rounded-2xl shadow-xl shadow-primary-100 hover:bg-primary-700 transition-all active:scale-[0.98]"
                    >
                      {isProcessing ? <i className="fas fa-spinner fa-spin mr-2"></i> : null}
                      Verify Code
                    </button>
                    
                    <div className="flex flex-col items-center gap-4">
                      <button 
                        type="button" 
                        disabled={resendTimer > 0}
                        onClick={() => {
                          setResendTimer(60);
                          handleEmailSubmit(new Event('submit') as any);
                        }}
                        className={`text-[10px] font-black uppercase tracking-widest transition-colors ${resendTimer > 0 ? 'text-slate-300' : 'text-primary-600 hover:text-primary-800'}`}
                      >
                        {resendTimer > 0 ? `Resend Code in ${resendTimer}s` : 'Resend Code Now'}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}

            {step === 'password' && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="w-16 h-16 bg-primary-50 text-primary-600 rounded-[1.25rem] flex items-center justify-center text-2xl mb-6">
                  <i className="fas fa-lock-hashtag"></i>
                </div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-2">Set New Password</h2>
                <p className="text-slate-500 text-sm mb-8 leading-relaxed">Identity verified. Please set your new secure password.</p>
                
                <form onSubmit={handlePasswordReset} className="space-y-6">
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">New Secure Password</label>
                      <div className="relative">
                        <input 
                          type={showNewPassword ? "text" : "password"} 
                          required 
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                          className="w-full pl-5 pr-12 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 font-bold text-slate-700 transition-all"
                        />
                        <button 
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary-600 transition-colors focus:outline-none"
                        >
                          <i className={`fas ${showNewPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                        </button>
                      </div>
                      
                      <div className="pt-2">
                        <div className="flex gap-1 h-1.5 mb-3">
                          {[1, 2, 3, 4].map(i => (
                            <div key={i} className={`flex-1 rounded-full transition-all duration-500 ${
                              i <= strengthScore 
                                ? strengthScore <= 2 ? 'bg-rose-400' : strengthScore === 3 ? 'bg-amber-400' : 'bg-primary-500' 
                                : 'bg-slate-100'
                            }`}></div>
                          ))}
                        </div>
                        <div className="grid grid-cols-2 gap-y-1.5">
                          <StrengthCheck label="8+ Characters" met={passwordStrength.length} />
                          <StrengthCheck label="At least one number" met={passwordStrength.hasNumber} />
                          <StrengthCheck label="Special character" met={passwordStrength.hasSpecial} />
                          <StrengthCheck label="Uppercase letter" met={passwordStrength.hasUpper} />
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirm Secret Password</label>
                      <div className="relative">
                        <input 
                          type={showConfirmPassword ? "text" : "password"} 
                          required 
                          value={confirmPassword}
                          onChange={e => setConfirmPassword(e.target.value)}
                          className="w-full pl-5 pr-12 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 font-bold text-slate-700 transition-all"
                        />
                        <button 
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary-600 transition-colors focus:outline-none"
                        >
                          <i className={`fas ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                        </button>
                      </div>
                    </div>
                  </div>

                  {error && <p className="text-rose-500 text-[10px] font-bold text-center bg-rose-50 p-3 rounded-xl">{error}</p>}

                  <button 
                    disabled={isProcessing}
                    className="w-full py-4 bg-primary-600 text-white font-black uppercase tracking-widest text-[11px] rounded-2xl shadow-xl shadow-primary-200 hover:bg-primary-700 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
                  >
                    {isProcessing && <i className="fas fa-sync fa-spin"></i>}
                    {isProcessing ? 'Updating...' : 'Set & Synchronize'}
                  </button>
                </form>
              </div>
            )}

            {step === 'success' && (
              <div className="text-center animate-in zoom-in-95 duration-500">
                <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 text-4xl shadow-2xl shadow-emerald-50 relative">
                  <div className="absolute inset-0 rounded-[2.5rem] bg-emerald-500 animate-ping opacity-10"></div>
                  <i className="fas fa-check-double relative z-10"></i>
                </div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-3">Shield Restored!</h2>
                <p className="text-slate-500 text-sm mb-10 leading-relaxed px-4">Your access credentials have been successfully updated.</p>
                <button 
                  onClick={() => navigate('/login')}
                  className="w-full py-5 bg-slate-900 text-white font-black uppercase tracking-widest text-[11px] rounded-2xl shadow-2xl shadow-slate-200 hover:bg-black transition-all"
                >
                  Return to Headquarters
                </button>
              </div>
            )}
          </div>
        </div>

        <p className="text-center mt-12 text-[10px] font-black uppercase text-slate-300 tracking-[0.4em] flex items-center justify-center gap-2">
          <i className="fas fa-lock"></i>
          MyHR Encryption Standard v4.2
        </p>
      </div>
    </div>
  );
};

const StrengthCheck = ({ label, met }: { label: string, met: boolean }) => (
  <div className="flex items-center gap-2">
    <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] border transition-all ${met ? 'bg-primary-500 border-primary-500 text-white' : 'bg-white border-slate-200 text-transparent'}`}>
      <i className="fas fa-check"></i>
    </div>
    <span className={`text-[10px] font-bold ${met ? 'text-slate-700' : 'text-slate-400'}`}>{label}</span>
  </div>
);

export default ResetPasswordPage;
