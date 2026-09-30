import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { isFirebaseConfigured } from '../../services/firebase.ts';
import {
  X,
  Cloud,
  CloudOff,
  RefreshCw,
  Mail,
  Lock,
  LogOut,
  CheckCircle,
  AlertCircle,
  Shield,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const {
    user,
    firebaseUser,
    cloudSyncStatus,
    cloudSyncMessage,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signOut,
    refreshCloudSync,
  } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide email and password.');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    const action = mode === 'signin' ? signInWithEmail : signUpWithEmail;
    const res = await action(email, password);

    setLoading(false);
    if (res.success) {
      setSuccessMsg(mode === 'signin' ? 'Signed in successfully!' : 'Account created and signed in!');
      setTimeout(() => {
        onClose();
      }, 1000);
    } else {
      setError(res.error || 'Authentication failed. Please check your credentials.');
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    const res = await signInWithGoogle();
    setLoading(false);
    if (res.success) {
      setSuccessMsg('Signed in with Google!');
      setTimeout(() => {
        onClose();
      }, 1000);
    } else {
      setError(res.error || 'Google sign-in was canceled.');
    }
  };

  const configured = isFirebaseConfigured();

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#121A2B] border border-[#1E2D4A] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-4 border-b border-[#1E2D4A] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Firebase Cloud Account</h2>
              <span className="text-[10px] text-slate-400">Workspace sync & persistence</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#18233A] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          {/* Cloud Sync Status Indicator */}
          <div
            className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
              cloudSyncStatus === 'connected'
                ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                : cloudSyncStatus === 'error'
                ? 'bg-amber-950/40 border-amber-800 text-amber-200'
                : 'bg-[#0B1020] border-[#1E2D4A] text-slate-400'
            }`}
          >
            {cloudSyncStatus === 'connected' ? (
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : cloudSyncStatus === 'error' ? (
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            ) : (
              <CloudOff className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <div className="font-semibold text-white">
                {cloudSyncStatus === 'connected'
                  ? 'Cloud Sync Active'
                  : cloudSyncStatus === 'syncing'
                  ? 'Syncing with Firestore...'
                  : cloudSyncStatus === 'error'
                  ? 'Cloud Sync Notice'
                  : 'Offline LocalStorage Mode'}
              </div>
              <div className="text-[11px] opacity-80 mt-0.5">
                {cloudSyncMessage ||
                  (configured
                    ? 'Sign in to sync your tickets and rollover challenges to Firebase Firestore.'
                    : 'Firebase credentials are not configured in environment. BetPilot AI works 100% offline using localStorage.')}
              </div>
            </div>
          </div>

          {/* If already authenticated */}
          {firebaseUser ? (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-[#0B1020] border border-[#1E2D4A] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Signed in as:</span>
                  <span className="font-bold text-white font-mono">{firebaseUser.email}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">User UID:</span>
                  <span className="text-[10px] text-slate-500 font-mono">{firebaseUser.uid.slice(0, 14)}...</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={refreshCloudSync}
                  className="flex-1 py-2 px-3 rounded-lg bg-[#18233A] hover:bg-[#1E2D4A] text-slate-200 text-xs font-semibold border border-[#1E2D4A] flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
                  <span>Sync Now</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    await signOut();
                    onClose();
                  }}
                  className="py-2 px-3 rounded-lg bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 text-xs font-semibold border border-rose-800 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          ) : configured ? (
            /* Sign in / Sign up form */
            <form onSubmit={handleSubmit} className="space-y-3">
              {error && (
                <div className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-800 text-xs text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-800 text-xs text-emerald-300 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs text-slate-300 font-medium block">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="trader@betpilot.ai"
                    required
                    className="w-full bg-[#0B1020] border border-[#1E2D4A] rounded-lg py-2 pl-9 pr-3 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-300 font-medium block">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="w-full bg-[#0B1020] border border-[#1E2D4A] rounded-lg py-2 pl-9 pr-3 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors cursor-pointer shadow-md mt-2"
              >
                {loading
                  ? 'Connecting...'
                  : mode === 'signin'
                  ? 'Sign In to Cloud'
                  : 'Create Cloud Account'}
              </button>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full py-2 rounded-lg bg-[#0B1020] hover:bg-[#18233A] text-slate-200 text-xs font-semibold border border-[#1E2D4A] transition-colors cursor-pointer"
              >
                Continue with Google
              </button>

              <div className="pt-2 text-center text-xs text-slate-400">
                {mode === 'signin' ? "Don't have a cloud account? " : 'Already have a cloud account? '}
                <button
                  type="button"
                  onClick={() => {
                    setMode(mode === 'signin' ? 'signup' : 'signin');
                    setError(null);
                  }}
                  className="text-blue-400 font-semibold hover:underline cursor-pointer"
                >
                  {mode === 'signin' ? 'Sign up' : 'Sign in'}
                </button>
              </div>
            </form>
          ) : (
            /* Firebase not configured informative state */
            <div className="p-3.5 rounded-xl bg-[#0B1020] border border-[#1E2D4A] text-xs space-y-2 text-slate-300">
              <div className="flex items-center gap-1.5 font-bold text-white">
                <Shield className="w-4 h-4 text-blue-400" />
                <span>Zero-Configuration Local Mode</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                All tickets, predictions, and rollover progress are preserved safely in your browser’s localStorage.
                To enable multi-device sync, add Firebase credentials to your environment variables (<code className="text-blue-300 font-mono">VITE_FIREBASE_PROJECT_ID</code>).
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
