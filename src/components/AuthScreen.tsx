import React, { useState } from 'react';
import { auth } from '../firebase';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInAnonymously,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import GlassCard from './GlassCard';
import AppLogo from './AppLogo';
import { Sparkles, AlertCircle, Sun, Moon, Mail, Lock, UserPlus, LogIn } from 'lucide-react';

interface AuthScreenProps {
  onSuccess: (userId: string, isAnonymous: boolean, username?: string) => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

type AuthMode = 'signin' | 'signup';

export default function AuthScreen({ onSuccess, theme = 'dark', onToggleTheme }: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    if (mode === 'signup' && !username.trim()) {
      setError('Please choose a username.');
      return;
    }

    if (password.length < 6) {
      setError('Password should be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signin') {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        onSuccess(userCredential.user.uid, false);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        onSuccess(userCredential.user.uid, false, username.trim());
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Invalid email or password.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('This email address is already in use.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else {
        setError(err.message || 'Authentication failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      const userCredential = await signInWithPopup(auth, provider);
      onSuccess(userCredential.user.uid, false);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Google Sign-In failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestMode = async () => {
    setError('');
    setLoading(true);
    try {
      const userCredential = await signInAnonymously(auth);
      onSuccess(userCredential.user.uid, true);
    } catch (err: any) {
      console.error(err);
      // Fallback guest user ID if Firebase auth is restricted locally
      onSuccess('anonymous-guest-id-' + Math.random().toString(36).substr(2, 9), true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[var(--bg-color)] transition-colors duration-300">
      {/* Background blobs */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Theme Toggle */}
      {onToggleTheme && (
        <button
          onClick={onToggleTheme}
          className="absolute top-4 right-4 p-3 rounded-full bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-color)] hover:bg-[var(--glass-highlight)] transition-all shadow-md z-50 cursor-pointer"
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
        >
          {theme === 'light' ? <Moon className="w-5 h-5 text-indigo-600" /> : <Sun className="w-5 h-5 text-amber-400" />}
        </button>
      )}

      <div className="w-full max-w-md z-10 my-8">
        <GlassCard className="space-y-6 border-[var(--glass-border)] shadow-2xl">
          <div className="text-center space-y-3">
            {/* High-fidelity Logo integration */}
            <div className="flex justify-center mb-1">
              <AppLogo size={90} className="shadow-lg rounded-2xl" />
            </div>
            
            <h1 className="text-2xl font-bold font-display tracking-tight text-[var(--heading-text)]">
              Last-Minute Life Saver
            </h1>
            <p className="text-[var(--text-color)] opacity-75 text-sm">
              Your intelligent, proactive productivity companion
            </p>
          </div>

          {/* Tab Selection */}
          <div className="flex p-1 bg-[var(--input-bg)] border border-[var(--glass-border)] rounded-xl">
            <button
              onClick={() => { setMode('signin'); setError(''); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                mode === 'signin'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-[var(--text-color)] opacity-70 hover:opacity-100'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setMode('signup'); setError(''); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                mode === 'signup'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-[var(--text-color)] opacity-70 hover:opacity-100'
              }`}
            >
              Sign Up
            </button>
          </div>

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex gap-2 items-start text-xs text-rose-500">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Email / Password Form */}
          <form onSubmit={handleEmailAuth} className="space-y-4">
            {mode === 'signup' && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-[var(--text-color)] opacity-80 flex items-center gap-1.5">
                  <UserPlus className="w-3.5 h-3.5 text-emerald-500" />
                  Username
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Choose your display name"
                  className="w-full px-3.5 py-2.5 bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)] text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all placeholder:text-[var(--text-color)]/30"
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--text-color)] opacity-80 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-emerald-500" />
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3.5 py-2.5 bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)] text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all placeholder:text-[var(--text-color)]/30"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--text-color)] opacity-80 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-emerald-500" />
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)] text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all placeholder:text-[var(--text-color)]/30"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-600/20 active:scale-[0.99] disabled:opacity-50 mt-2"
            >
              {mode === 'signin' ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
              <span>{loading ? 'Authenticating...' : mode === 'signin' ? 'Sign In with Email' : 'Create Account'}</span>
            </button>
          </form>

          {/* Social Sign In Divider */}
          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-[var(--glass-border)] opacity-50"></div>
            <span className="flex-shrink mx-3 text-[var(--text-color)] opacity-50 text-[10px] font-mono tracking-wider uppercase">
              Or Connect With
            </span>
            <div className="flex-grow border-t border-[var(--glass-border)] opacity-50"></div>
          </div>

          <div className="space-y-3">
            {/* Google Sign-In */}
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-3 px-4 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 text-sm font-semibold rounded-xl flex items-center justify-center gap-3 transition-all cursor-pointer shadow-sm hover:shadow active:scale-[0.99] disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" width="24" height="24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Google Account</span>
            </button>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
