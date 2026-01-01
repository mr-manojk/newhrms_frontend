
import React, { useState } from 'react';

interface LoginPageProps {
  onLogin: (email: string, password?: string) => boolean;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [view, setView] = useState<'login' | 'forgot'>('login');
  const [isProcessing, setIsProcessing] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setLoginError("Please enter both email and password.");
      return;
    }

    setIsProcessing(true);
    setLoginError(null);

    // Simulate network delay for a more realistic feel
    setTimeout(() => {
      const success = onLogin(email, password);
      
      if (!success) {
        setLoginError("Invalid email or password. Please try again.");
        setIsProcessing(false);
      }
      // If success, App.tsx will navigate away as the state changes
    }, 800);
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    // In a real app, this would call a password reset API
    setTimeout(() => {
      alert("A password recovery link has been sent to your corporate email address.");
      setView('login');
      setIsProcessing(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col transition-all duration-500">
        <div className="bg-primary-900 p-10 text-center text-white relative overflow-hidden shrink-0">
          {/* Decorative background elements */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary-800 rounded-full blur-3xl opacity-50"></div>
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-primary-700 rounded-full blur-3xl opacity-30"></div>
          
          <div className="w-16 h-16 bg-white rounded-2xl mx-auto mb-6 flex items-center justify-center text-primary-900 text-3xl font-black shadow-xl relative z-10">HR</div>
          <h1 className="text-2xl font-bold tracking-tight relative z-10">MyHR Cloud</h1>
          <p className="text-primary-300 mt-2 relative z-10">Manage your workforce with ease</p>
        </div>
        
        <div className="p-8 sm:p-10">
          {view === 'login' ? (
            <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              {loginError && (
                <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl flex items-center gap-3 animate-in shake duration-300">
                  <div className="w-8 h-8 bg-rose-500 text-white rounded-lg flex items-center justify-center shrink-0">
                    <i className="fas fa-exclamation-circle text-sm"></i>
                  </div>
                  <p className="text-xs font-bold text-rose-600 leading-tight">
                    {loginError}
                  </p>
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
                    type="password" 
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (loginError) setLoginError(null);
                    }}
                    placeholder="Enter your password"
                    className={`w-full pl-12 pr-4 py-3 bg-slate-50 rounded-xl border ${loginError ? 'border-rose-200 focus:ring-rose-500' : 'border-slate-200 focus:ring-primary-500'} focus:ring-2 outline-none transition-all`}
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={isProcessing}
                className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-primary-100 transition-all transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-wait flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <i className="fas fa-circle-notch fa-spin"></i>
                    Verifying...
                  </>
                ) : 'Sign In'}
              </button>
              
              <div className="text-center">
                <button 
                  type="button"
                  onClick={() => setView('forgot')}
                  className="text-sm font-semibold text-primary-600 hover:text-primary-800 hover:underline transition-colors"
                >
                  Forgot password?
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleForgotSubmit} className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
              <div className="text-center space-y-2 mb-8">
                <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto text-xl">
                  <i className="fas fa-shield-keyhole"></i>
                </div>
                <h3 className="text-lg font-bold text-slate-800">Password Recovery</h3>
                <p className="text-sm text-slate-500">
                  Enter your corporate email address and we'll send you instructions to reset your password.
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Email Address</label>
                <div className="relative">
                  <i className="fas fa-at absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                  <input 
                    type="email" 
                    required
                    placeholder="name@company.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={isProcessing}
                className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-4 rounded-xl shadow-lg shadow-slate-200 transition-all transform active:scale-[0.98] disabled:opacity-70"
              >
                {isProcessing ? <i className="fas fa-circle-notch fa-spin"></i> : 'Send Recovery Link'}
              </button>

              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 mt-4">
                <p className="text-[10px] leading-relaxed text-slate-500 text-center font-medium">
                  <i className="fas fa-info-circle mr-1"></i>
                  For security reasons, if you don't receive an email within 5 minutes, please contact your IT or HR administrator for a manual reset.
                </p>
              </div>
              
              <div className="text-center">
                <button 
                  type="button" 
                  onClick={() => setView('login')}
                  className="text-sm font-semibold text-slate-500 hover:text-primary-600 transition-colors flex items-center justify-center gap-2 mx-auto"
                >
                  <i className="fas fa-arrow-left text-xs"></i>
                  Back to Sign In
                </button>
              </div>
            </form>
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