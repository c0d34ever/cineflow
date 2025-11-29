import React, { useState } from 'react';
import { authService } from '../apiServices';

interface ForgotPasswordProps {
  onBack: () => void;
}

const ForgotPassword: React.FC<ForgotPasswordProps> = ({ onBack }) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      await authService.forgotPassword(email);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

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
                If an account with that email exists, a password reset link has been sent.
                Please check your email and follow the instructions.
              </div>
              <p className="text-zinc-400 text-sm mb-6">
                In development mode, check the server console for the reset link.
              </p>
              <button
                onClick={onBack}
                className="w-full py-3 rounded-lg font-bold text-sm uppercase tracking-wide bg-amber-600 hover:bg-amber-500 text-white transition-colors"
              >
                Back to Login
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={onBack}
                className="mb-6 text-sm text-amber-500 hover:text-amber-400 transition-colors flex items-center gap-2"
              >
                ← Back to Login
              </button>

              {error && (
                <div className="mb-4 p-3 bg-red-900/30 border border-red-800 rounded text-red-400 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-500 uppercase mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-black border border-zinc-700 rounded-lg p-3 text-white focus:border-amber-500 outline-none"
                    placeholder="Enter your email"
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
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;

