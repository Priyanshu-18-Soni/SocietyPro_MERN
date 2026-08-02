import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import { Building2, Home, ChevronRight } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const validateForm = () => {
    const newErrors = {};
    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters long';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');

    if (!validateForm()) return;

    setLoading(true);
    try {
      const response = await axiosInstance.post('/auth/login', { email, password });
      const { token, user } = response.data;
      
      login(token, user);
      
      // Redirect based on role or home
      if (['SuperAdmin', 'SocietyAdmin', 'Resident'].includes(user.role)) {
        navigate('/');
      } else {
        setApiError('Access restricted. Unauthorized role.');
      }
    } catch (err) {
      console.error(err);
      const message = err.response?.data?.message || 'Failed to connect to the server. Please try again later.';
      setApiError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F172A] to-[#1E293B] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center p-3 bg-[#D4AF37] text-[#0F172A] rounded-2xl mb-4 shadow-md">
          <Building2 className="h-6 w-6" />
        </div>
        <h1 className="text-4xl font-bold text-white tracking-tight">
          SocietyPro
        </h1>
        <p className="mt-2 text-sm text-slate-300">
          Housing Society Management Portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 shadow-xl rounded-xl border border-slate-700/10 sm:px-10">
          <h2 className="text-xl font-bold text-charcoal mb-6 border-b border-border pb-4">
            Sign In
          </h2>

          {apiError && (
            <div className="mb-4 p-4 rounded-lg bg-red-50 border border-error/20 text-error text-sm font-medium">
              {apiError}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-charcoal mb-1">
                Email Address <span className="text-error">*</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="Enter your registered email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors({ ...errors, email: '' });
                }}
                className={`w-full h-11 px-3.5 py-2.5 bg-white border rounded-lg text-charcoal placeholder-slate/40 focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 focus:border-[#0F172A] transition-colors ${
                  errors.email ? 'border-error' : 'border-border'
                }`}
                disabled={loading}
              />
              {errors.email && (
                <p className="mt-1.5 text-xs text-error font-medium" id="email-error">
                  {errors.email}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-charcoal mb-1">
                Password <span className="text-error">*</span>
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors({ ...errors, password: '' });
                }}
                className={`w-full h-11 px-3.5 py-2.5 bg-white border rounded-lg text-charcoal placeholder-slate/40 focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 focus:border-[#0F172A] transition-colors ${
                  errors.password ? 'border-error' : 'border-border'
                }`}
                disabled={loading}
              />
              {errors.password && (
                <p className="mt-1.5 text-xs text-error font-medium" id="password-error">
                  {errors.password}
                </p>
              )}
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className={`w-full h-11 flex justify-center items-center bg-[#0F172A] hover:bg-[#1E293B] text-[#D4AF37] border border-[#D4AF37]/30 font-semibold rounded-lg px-6 py-2.5 transition-colors focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 cursor-pointer ${
                  loading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <svg className="animate-spin h-5 w-5 text-[#D4AF37]" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span>Processing...</span>
                  </div>
                ) : (
                  'Login'
                )}
              </button>
            </div>
          </form>

          {/* Divider Line */}
          <div className="relative my-6 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-100"></div>
            </div>
            <span className="relative bg-white px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
              New to SocietyPro?
            </span>
          </div>

          {/* Two Clickable Registration Option Cards */}
          <div className="space-y-3">
            {/* Register as Admin Card */}
            <div
              onClick={() => navigate('/register?role=admin')}
              className="group flex items-center justify-between p-4 bg-slate-50/50 hover:bg-[#D4AF37]/5 border border-slate-100 hover:border-[#D4AF37]/20 rounded-xl cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <div className="flex items-center space-x-3.5">
                <div className="p-2.5 bg-[#D4AF37]/10 text-[#D4AF37] rounded-xl group-hover:scale-105 transition-transform duration-200">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <h4 className="text-sm font-bold text-slate-800 group-hover:text-[#bca030] transition-colors">
                    Register as Admin
                  </h4>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    I am a society chairperson / owner
                  </p>
                  <p className="text-[11px] text-slate-400 font-medium">
                    I want to create & manage a society
                  </p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-[#D4AF37] group-hover:translate-x-1 transition-all duration-200" />
            </div>

            {/* Register as Resident Card */}
            <div
              onClick={() => navigate('/register?role=resident')}
              className="group flex items-center justify-between p-4 bg-slate-50/50 hover:bg-emerald-50/30 border border-slate-100 hover:border-emerald-200 rounded-xl cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <div className="flex items-center space-x-3.5">
                <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-xl group-hover:scale-105 transition-transform duration-200">
                  <Home className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <h4 className="text-sm font-bold text-slate-800 group-hover:text-emerald-700 transition-colors">
                    Register as Resident
                  </h4>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    I live in a society
                  </p>
                  <p className="text-[11px] text-slate-400 font-medium">
                    I have a join code from my admin
                  </p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all duration-200" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
