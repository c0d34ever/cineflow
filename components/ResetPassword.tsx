import React, { useState, useEffect } from 'react';
import { authService } from '../apiServices';

interface ResetPasswordProps {
  token?: string;
  email?: string;
  onSuccess?: () => void;
}

const ResetPassword: React.FC<ResetPasswordProps> = ({ token: propToken, email: propEmail, onSuccess }) => {
  const [token, setToken] = useState(propToken || '');
  const [email, setEmail] = useState(propEmail || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Try to get token and email from URL hash/query params
    if (!propToken || !propEmail) {
      const hash = window.location.hash;
      const urlParams = new URLSearchParams(hash.substring(1));
      const urlToken = urlParams.get('token') || new URLSearchParams(window.location.search).get('token');
      const urlEmail = urlParams.get('email') || new URLSearchParams(window.location.search).get('email');
      
      if (urlToken) setToken(urlToken);
      if (urlEmail) setEmail(decodeURIComponent(urlEmail));
    }
  }, [propToken, propEmail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token || !email) {
      setError('Reset token and email are required');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      await authService.resetPassword(token, email, password);
      setSuccess(true);
      setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        } else {
          window.location.hash = '';
          window.location.reload();
        }
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. The token may be invalid or expired.');
    } finally {
      setLoading(false);
    }
  };

  if (!token || !email) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
            <div className="mb-4 p-4 bg-red-900/30 border border-red-800 rounded text-red-400 text-sm">
              Invalid reset link. Please request a new password reset.
            </div>
            <button
              onClick={() => window.location.hash = '#forgot-password'}
              className="w-full py-3 rounded-lg font-bold text-sm uppercase tracking-wide bg-amber-600 hover:bg-amber-500 text-white transition-colors"
            >
              Request New Reset Link
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-serif text-amber-500 mb-2">CINEFLOW AI</h1>
          <p className="text-zinc-500 text-sm">Reset Your Password</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8">
          {success ? (
            <div className="text-center">
              <div className="mb-4 p-4 bg-green-900/30 border border-green-800 rounded text-green-400 text-sm">
                Password has been reset successfully! Redirecting to login...
              </div>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 p-3 bg-red-900/30 border border-red-800 rounded text-red-400 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-500 uppercase mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full bg-black border border-zinc-700 rounded-lg p-3 text-white focus:border-amber-500 outline-none"
                    placeholder="Enter new password (min 6 characters)"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-500 uppercase mb-1">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full bg-black border border-zinc-700 rounded-lg p-3 text-white focus:border-amber-500 outline-none"
                    placeholder="Confirm new password"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-3 rounded-lg font-bold text-sm uppercase tracking-wide transition-colors ${
                    loading
                      ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                      : 'bg-amber-600 hover:bg-amber-500 text-white'
                  }`}
                >
                  {loading ? 'Resetting...' : 'Reset Password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;

