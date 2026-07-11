import React, { useState } from 'react';
import { useAuth } from '../lib/authContext';
import { Activity, ShieldAlert, Lock, Mail } from 'lucide-react';
import { motion } from 'motion/react';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Invalid credentials. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const setDemoCredentials = (role: 'admin' | 'receptionist' | 'doctor') => {
    if (role === 'admin') {
      setEmail('admin@emr.com');
      setPassword('adminpassword');
    } else if (role === 'receptionist') {
      setEmail('receptionist@emr.com');
      setPassword('receptionistpassword');
    } else if (role === 'doctor') {
      setEmail('doctor@emr.com');
      setPassword('doctorpassword');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F1F5F9] px-4 py-8 font-sans" id="login_container">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-sm bg-white rounded border border-slate-200 shadow-sm overflow-hidden"
        id="login_card"
      >
        <div className="bg-[#0F172A] px-6 py-6 text-white text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-xl -mr-8 -mt-8"></div>
          
          <div className="inline-flex items-center justify-center p-2 bg-blue-500/10 rounded mb-2 border border-blue-500/20">
            <Activity className="h-6 w-6 text-blue-400" />
          </div>
          <h2 className="text-base font-bold tracking-tight font-display">Enterprise EMR Portal</h2>
          <p className="text-slate-400 text-[10px] uppercase tracking-wider mt-0.5">Appointment Management Module</p>
        </div>

        <div className="p-6">
          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-[11px] rounded flex items-start gap-2.5"
              id="login_error_alert"
            >
              <ShieldAlert className="h-4.5 w-4.5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Authentication failed</p>
                <p className="text-rose-600 mt-0.5">{error}</p>
              </div>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-400">
                  <Mail className="h-4 w-4" />
                </span>
                <input
                  id="email_input"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@hospital.com"
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-600 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-400">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  id="password_input"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-600 transition-all"
                />
              </div>
            </div>

            <button
              id="login_submit_btn"
              type="submit"
              disabled={isLoading}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-xs shadow-xs hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Demonstration Quick-Logins */}
          <div className="mt-6 pt-5 border-t border-slate-200">
            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider text-center mb-2.5">
              Assessment Sandbox Accounts
            </span>
            <div className="grid grid-cols-3 gap-1.5" id="sandbox_logins">
              <button
                id="demo_admin_btn"
                type="button"
                onClick={() => setDemoCredentials('admin')}
                className="py-1.5 px-1 text-[10px] border border-slate-200 hover:border-blue-500 hover:bg-blue-50 rounded font-semibold text-slate-600 hover:text-blue-700 transition-all cursor-pointer"
              >
                Super Admin
              </button>
              <button
                id="demo_receptionist_btn"
                type="button"
                onClick={() => setDemoCredentials('receptionist')}
                className="py-1.5 px-1 text-[10px] border border-slate-200 hover:border-teal-500 hover:bg-teal-50 rounded font-semibold text-slate-600 hover:text-teal-700 transition-all cursor-pointer"
              >
                Receptionist
              </button>
              <button
                id="demo_doctor_btn"
                type="button"
                onClick={() => setDemoCredentials('doctor')}
                className="py-1.5 px-1 text-[10px] border border-slate-200 hover:border-violet-500 hover:bg-violet-50 rounded font-semibold text-slate-600 hover:text-violet-700 transition-all cursor-pointer"
              >
                Doctor
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
