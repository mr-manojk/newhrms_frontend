
import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { userService } from '../services/userService';

interface LoginPageProps {
  onLogin: (email: string, password?: string) => boolean;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  
  // 2FA Specific State
  const [step, setStep] = useState<'credentials' | '2fa'>('credentials');
  const [twoFACode, setTwoFACode] = useState(['', '', '', '', '', '']);
  const codeInputs = useRef<(HTMLInputElement | null)[]>([]);

  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const isExpired = searchParams.get('expired') === 'true';

  useEffect(() => {
    if (isExpired) {
      setLoginError("Your session has expired. Please sign in again.");
    }
  }, [isExpired]);

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setLoginError("Please enter both email and password.");
      return;
    }

    setIsProcessing(true);
    setLoginError(null);

    // Simulate network delay for a more realistic feel
    setTimeout(async () => {
      try {
        const users = await userService.getUsers();
        const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

        if (!user || (user.password && user.password !== password)) {
          setLoginError("Invalid email or password. Please try again.");
          setIsProcessing(false);
          return;
        }

        if (user.twoFactorEnabled) {
          setStep('2fa');
          setIsProcessing(false);
        } else {
          // No 2FA, complete login
          const success = onLogin(email, password);
          if (!success) {
            setLoginError("Authentication failed.");
            setIsProcessing(false);
          }
        }
      } catch (err) {
        setLoginError("Server communication error. Please try again.");
        setIsProcessing(false);
      }
    }, 800);
  };

  const handle2FASubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const enteredCode = twoFACode.join('');
    if (enteredCode.length < 6) {
      setLoginError("Please enter the full 6-digit code.");
      return;
    }

    setIsProcessing(true);
    setLoginError(null);

    // In a production environment, this code is verified on the backend.
    setTimeout(() => {
      const success = onLogin(email, password);
      if (!success) {
        setLoginError("Session expired or invalid. Please try again.");
        setStep('credentials');
        setTwoFACode(['', '', '', '', '', '']);
      }
      setIsProcessing(false);
    }, 1000);
  };

  const handleCodeChange = (index: number, value: string) => {
    if (value !== '' && !/^\d+$/.test(value)) return;
    
    const newCode = [...twoFACode];
    newCode[index] = value.slice(-1);
    setTwoFACode(newCode);

    if (value !== '' && index < 5) {
      codeInputs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && twoFACode[index] === '' && index > 0) {
      codeInputs.current[index - 1]?.focus();
    }
  };

  useEffect(() => {
    if (step === '2fa') {
      codeInputs.current[0]?.focus();
    }
  }, [step]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col transition-all duration-500">
        <div className="bg-primary-900 p-10 text-center text-white relative overflow-hidden shrink-0">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary-800 rounded-full blur-3xl opacity-50"></div>
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-primary-700 rounded-full blur-3xl opacity-30"></div>
          
          <div className="w-16 h-16 bg-white rounded-2xl mx-auto mb-6 flex items-center justify-center text-primary-900 text-3xl font-black shadow-xl relative z-10">HR</div>
          <h1 className="text-2xl font-bold tracking-tight relative z-10">MyHR Cloud</h1>
          <p className="text-primary-300 mt-2 relative z-10">
            {step === 'credentials' ? 'Manage your workforce with ease' : 'Second-Step Verification'}
          </p>
        </div>
        
        <div className="p-8 sm:p-10">
          {step === 'credentials' ? (
            <form onSubmit={handleCredentialsSubmit} className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              {loginError && (
                <div className={`p-4 rounded-xl flex items-center gap-3 animate-in shake duration-300 border ${isExpired ? 'bg-amber-50 border-amber-100' : 'bg-rose-50 border-rose-100'}`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isExpired ? 'bg-amber-500' : 'bg-rose-500'} text-white`}>
                    <i className={`fas ${isExpired ? 'fa-clock' : 'fa-exclamation-circle'} text-sm`}></i>
                  </div>
                  <p className={`text-xs font-bold leading-tight ${isExpired ? 'text-amber-700' : 'text-rose-600'}`}>{loginError}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Corporate Email</label>
                <div className="relative">
                  <i className="fas fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                  <input 
                    type="email"
                    required
                    placeholder="name@myhr.com"
                    value={email}
                    onChange={e => {
                      setEmail(e.target.value);
                      if (loginError) setLoginError(null);
                    }}
                    className={`w-full pl-12 pr-4 py-3 bg-slate-50 rounded-xl border ${loginError ? 'border-rose-200 focus:ring-rose-500' : 'border-slate-200 focus:ring-primary-500'} focus:ring-2 outline-none transition-all`}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Password</label>
                <div className="relative">
                  <i className="fas fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                  <input 
                    type={showPassword ? "text" : "password"} 
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (loginError) setLoginError(null);
                    }}
                    placeholder="Enter your password"
                    className={`w-full pl-12 pr-12 py-3 bg-slate-50 rounded-xl border ${loginError ? 'border-rose-200 focus:ring-rose-500' : 'border-slate-200 focus:ring-primary-500'} focus:ring-2 outline-none transition-all`}
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary-600 transition-colors focus:outline-none"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>
              </div>

              <button 
                type="submit"
                disabled={isProcessing}
                className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-primary-100 transition-all transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-wait flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <><i className="fas fa-circle-notch fa-spin"></i>Verifying...</>
                ) : 'Sign In'}
              </button>
              
              <div className="text-center">
                <Link 
                  to="/reset-password"
                  className="text-sm font-semibold text-primary-600 hover:text-primary-800 hover:underline transition-colors"
                >
                  Forgot password?
                </Link>
              </div>

            </form>
          ) : (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-primary-50 text-primary-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <i className="fas fa-shield-halved text-xl"></i>
                </div>
                <h2 className="text-xl font-bold text-slate-800">Two-Factor Auth</h2>
                <p className="text-xs text-slate-500 mt-1">Please enter the 6-digit code from your authenticator app.</p>
              </div>

              <form onSubmit={handle2FASubmit} className="space-y-6">
                <div className="flex justify-between gap-2">
                  {twoFACode.map((digit, i) => (
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
                      className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl text-center text-lg font-black text-primary-600 focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all outline-none"
                    />
                  ))}
                </div>

                {loginError && (
                  <p className="text-rose-500 text-[10px] font-bold text-center bg-rose-50 p-2 rounded-lg">{loginError}</p>
                )}

                <button 
                  type="submit"
                  disabled={isProcessing}
                  className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  {isProcessing ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-lock"></i>}
                  Verify & Secure
                </button>

                <button 
                  type="button" 
                  onClick={() => {
                    setStep('credentials');
                    setLoginError(null);
                  }} 
                  className="w-full text-slate-400 hover:text-slate-600 text-xs font-bold transition-colors"
                >
                  Back to Login
                </button>
              </form>
            </div>
          )}
        </div>
        
        <div className="p-6 bg-slate-50 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-500">
            Secure corporate authentication.<br/>
            &copy; 2026 MyHR Systems Inc.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
