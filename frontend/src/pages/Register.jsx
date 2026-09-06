import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import { Building2, Home, CheckCircle2, Copy, Check, ArrowRight } from 'lucide-react';

const Register = () => {
  const [searchParams] = useSearchParams();
  const roleQuery = searchParams.get('role');

  const getInitialType = () => {
    if (roleQuery === 'owner' || roleQuery === 'admin') return 'owner';
    if (roleQuery === 'resident') return 'resident';
    return 'resident';
  };

  const [regType, setRegType] = useState(getInitialType);

  // Common fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Society Owner fields
  const [societyName, setSocietyName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');

  // Resident fields
  const [societyCode, setSocietyCode] = useState('');
  const [unitNumber, setUnitNumber] = useState('');

  // UI state
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Success modal for Society Owner
  const [ownerSuccess, setOwnerSuccess] = useState(null);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleTypeChange = (type) => {
    setRegType(type);
    setErrors({});
    setApiError('');
  };

  const validateForm = () => {
    const newErrors = {};

    if (!name.trim()) {
      newErrors.name = 'Full Name is required';
    } else if (name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters long';
    }

    if (!email.trim()) {
      newErrors.email = 'Email Address is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters long';
    }

    if (regType === 'owner') {
      if (!societyName.trim()) {
        newErrors.societyName = 'Society Name is required';
      }
      if (!address.trim()) {
        newErrors.address = 'Address is required';
      }
      if (!city.trim()) {
        newErrors.city = 'City is required';
      }
    } else {
      if (!societyCode.trim()) {
        newErrors.societyCode = 'Society Code is required';
      }
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
      if (regType === 'owner') {
        const payload = {
          name: name.trim(),
          email: email.trim(),
          password,
          societyName: societyName.trim(),
          address: address.trim(),
          city: city.trim(),
          registrationNumber: registrationNumber.trim(),
        };

        const response = await axiosInstance.post('/auth/register-owner', payload);
        const { token, user, society } = response.data;

        // Show prominent modal with societyCode
        setOwnerSuccess({
          code: society.societyCode,
          societyName: society.name,
          token,
          user,
        });
      } else {
        const payload = {
          name: name.trim(),
          email: email.trim(),
          password,
          societyCode: societyCode.trim().toUpperCase(),
          unitNumber: unitNumber.trim(),
        };

        const response = await axiosInstance.post('/auth/register-resident', payload);
        const { token, user } = response.data;

        login(token, user);
        navigate('/');
      }
    } catch (err) {
      console.error(err);
      const message = err.response?.data?.message || 'Registration failed. Please check your inputs and try again.';

      if (message.toLowerCase().includes('society code')) {
        setErrors((prev) => ({
          ...prev,
          societyCode: message,
        }));
      }
      setApiError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = async () => {
    if (!ownerSuccess?.code) return;
    try {
      await navigator.clipboard.writeText(ownerSuccess.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleCompleteOwnerRegistration = () => {
    if (ownerSuccess) {
      login(ownerSuccess.token, ownerSuccess.user);
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F172A] to-[#1E293B] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-lg text-center">
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

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg px-4">
        <div className="bg-white py-8 px-6 shadow-xl rounded-xl border border-slate-700/10 sm:px-10">
          <h2 className="text-xl font-bold text-charcoal mb-4 border-b border-border pb-3">
            Create Account
          </h2>

          {/* Registration Type Selector Tabs */}
          <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => handleTypeChange('owner')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                regType === 'owner'
                  ? 'bg-[#0F172A] text-[#D4AF37] shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Building2 className="w-4 h-4 shrink-0" />
              <span>Society Owner</span>
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('resident')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                regType === 'resident'
                  ? 'bg-[#0F172A] text-[#D4AF37] shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Home className="w-4 h-4 shrink-0" />
              <span>Resident</span>
            </button>
          </div>

          {apiError && (
            <div className="mb-4 p-4 rounded-lg bg-red-50 border border-error/20 text-error text-sm font-medium">
              {apiError}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* Full Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-charcoal mb-1">
                Full Name <span className="text-error">*</span>
              </label>
              <input
                id="name"
                name="name"
                type="text"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors({ ...errors, name: '' });
                }}
                className={`w-full h-11 px-3.5 py-2.5 bg-white border rounded-lg text-charcoal placeholder-slate/40 focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 focus:border-[#0F172A] transition-colors ${
                  errors.name ? 'border-error' : 'border-border'
                }`}
                disabled={loading}
              />
              {errors.name && (
                <p className="mt-1.5 text-xs text-error font-medium" id="name-error">
                  {errors.name}
                </p>
              )}
            </div>

            {/* Email Address */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-charcoal mb-1">
                Email Address <span className="text-error">*</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="Enter your email address"
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

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-charcoal mb-1">
                Password <span className="text-error">*</span>
              </label>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="Choose a secure password (min 6 characters)"
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

            {/* === SOCIETY OWNER SPECIFIC FIELDS === */}
            {regType === 'owner' && (
              <>
                <div>
                  <label htmlFor="societyName" className="block text-sm font-medium text-charcoal mb-1">
                    Society Name <span className="text-error">*</span>
                  </label>
                  <input
                    id="societyName"
                    name="societyName"
                    type="text"
                    placeholder="e.g., Green Valley Housing Society"
                    value={societyName}
                    onChange={(e) => {
                      setSocietyName(e.target.value);
                      if (errors.societyName) setErrors({ ...errors, societyName: '' });
                    }}
                    className={`w-full h-11 px-3.5 py-2.5 bg-white border rounded-lg text-charcoal placeholder-slate/40 focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 focus:border-[#0F172A] transition-colors ${
                      errors.societyName ? 'border-error' : 'border-border'
                    }`}
                    disabled={loading}
                  />
                  {errors.societyName && (
                    <p className="mt-1.5 text-xs text-error font-medium">
                      {errors.societyName}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="address" className="block text-sm font-medium text-charcoal mb-1">
                    Address <span className="text-error">*</span>
                  </label>
                  <input
                    id="address"
                    name="address"
                    type="text"
                    placeholder="e.g., 123 Main Road, Sector 4"
                    value={address}
                    onChange={(e) => {
                      setAddress(e.target.value);
                      if (errors.address) setErrors({ ...errors, address: '' });
                    }}
                    className={`w-full h-11 px-3.5 py-2.5 bg-white border rounded-lg text-charcoal placeholder-slate/40 focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 focus:border-[#0F172A] transition-colors ${
                      errors.address ? 'border-error' : 'border-border'
                    }`}
                    disabled={loading}
                  />
                  {errors.address && (
                    <p className="mt-1.5 text-xs text-error font-medium">
                      {errors.address}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="city" className="block text-sm font-medium text-charcoal mb-1">
                      City <span className="text-error">*</span>
                    </label>
                    <input
                      id="city"
                      name="city"
                      type="text"
                      placeholder="e.g., Mumbai"
                      value={city}
                      onChange={(e) => {
                        setCity(e.target.value);
                        if (errors.city) setErrors({ ...errors, city: '' });
                      }}
                      className={`w-full h-11 px-3.5 py-2.5 bg-white border rounded-lg text-charcoal placeholder-slate/40 focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 focus:border-[#0F172A] transition-colors ${
                        errors.city ? 'border-error' : 'border-border'
                      }`}
                      disabled={loading}
                    />
                    {errors.city && (
                      <p className="mt-1.5 text-xs text-error font-medium">
                        {errors.city}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="registrationNumber" className="block text-sm font-medium text-charcoal mb-1">
                      Reg. Number <span className="text-slate/60 text-xs font-normal">(Optional)</span>
                    </label>
                    <input
                      id="registrationNumber"
                      name="registrationNumber"
                      type="text"
                      placeholder="e.g., GV2026001"
                      value={registrationNumber}
                      onChange={(e) => setRegistrationNumber(e.target.value)}
                      className="w-full h-11 px-3.5 py-2.5 bg-white border border-border rounded-lg text-charcoal placeholder-slate/40 focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 focus:border-[#0F172A] transition-colors"
                      disabled={loading}
                    />
                  </div>
                </div>
              </>
            )}

            {/* === RESIDENT SPECIFIC FIELDS === */}
            {regType === 'resident' && (
              <>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="societyCode" className="block text-sm font-medium text-charcoal">
                      Society Code <span className="text-error">*</span>
                    </label>
                    <span className="text-xs text-slate-500">
                      The code your Society Owner shared with you
                    </span>
                  </div>
                  <input
                    id="societyCode"
                    name="societyCode"
                    type="text"
                    placeholder="e.g., ABC1234"
                    value={societyCode}
                    onChange={(e) => {
                      setSocietyCode(e.target.value.toUpperCase());
                      if (errors.societyCode) setErrors({ ...errors, societyCode: '' });
                    }}
                    className={`w-full h-11 px-3.5 py-2.5 bg-white border rounded-lg text-charcoal uppercase tracking-wider font-mono placeholder-slate/40 focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 focus:border-[#0F172A] transition-colors ${
                      errors.societyCode ? 'border-error' : 'border-border'
                    }`}
                    disabled={loading}
                  />
                  {errors.societyCode && (
                    <p className="mt-1.5 text-xs text-error font-medium" id="societyCode-error">
                      {errors.societyCode}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="unitNumber" className="block text-sm font-medium text-charcoal mb-1">
                    Unit / Flat Number <span className="text-slate/60 text-xs font-normal">(Optional)</span>
                  </label>
                  <input
                    id="unitNumber"
                    name="unitNumber"
                    type="text"
                    placeholder="e.g., B-205"
                    value={unitNumber}
                    onChange={(e) => setUnitNumber(e.target.value)}
                    className="w-full h-11 px-3.5 py-2.5 bg-white border border-border rounded-lg text-charcoal placeholder-slate/40 focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 focus:border-[#0F172A] transition-colors"
                    disabled={loading}
                  />
                </div>
              </>
            )}

            <div className="pt-3">
              <button
                type="submit"
                disabled={loading}
                className={`w-full h-11 flex justify-center items-center bg-[#0F172A] hover:bg-[#1E293B] text-[#D4AF37] border border-[#D4AF37]/30 font-semibold rounded-lg px-6 py-2.5 transition-colors focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 cursor-pointer shadow-md ${
                  loading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <svg className="animate-spin h-5 w-5 text-[#D4AF37]" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span>Registering...</span>
                  </div>
                ) : (
                  regType === 'owner' ? 'Register as Society Owner' : 'Register as Resident'
                )}
              </button>
            </div>
          </form>

          {/* Redirection Link to Login */}
          <div className="mt-6 text-center border-t border-border pt-4">
            <p className="text-sm text-slate">
              Already have an account?{' '}
              <Link to="/login" className="text-[#0F172A] hover:underline hover:text-[#1E293B] font-semibold transition-colors">
                Login
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Society Owner Success Modal with Society Code */}
      {ownerSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-[#D4AF37]/40 text-center">
            <div className="mx-auto w-14 h-14 rounded-full bg-[#D4AF37]/15 flex items-center justify-center text-[#0F172A] mb-4">
              <CheckCircle2 className="w-8 h-8 text-[#0F172A]" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900">Society Created!</h3>
            <p className="text-sm text-slate-600 mt-2">
              Welcome, <span className="font-semibold text-slate-900">{ownerSuccess.user?.name}</span>! Your society <span className="font-semibold text-slate-900">"{ownerSuccess.societyName}"</span> has been registered successfully.
            </p>

            <div className="my-6 p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                Your Society Join Code
              </span>
              <div className="flex items-center justify-center gap-3">
                <span className="font-mono text-3xl font-extrabold tracking-widest text-[#0F172A] bg-white px-4 py-1.5 rounded-lg border border-slate-200 shadow-inner">
                  {ownerSuccess.code}
                </span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="p-2.5 rounded-lg bg-[#0F172A] hover:bg-[#1E293B] text-[#D4AF37] transition-all cursor-pointer shadow-sm active:scale-95"
                  title="Copy Code"
                >
                  {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
              {copied && (
                <p className="text-xs text-emerald-600 font-semibold mt-2">
                  Copied to clipboard!
                </p>
              )}
              <p className="text-xs text-slate-500 mt-3 leading-relaxed">
                Share this code with your residents so they can register and join your society.
              </p>
            </div>

            <button
              type="button"
              onClick={handleCompleteOwnerRegistration}
              className="w-full h-11 flex items-center justify-center gap-2 bg-[#0F172A] hover:bg-[#1E293B] text-[#D4AF37] border border-[#D4AF37]/30 font-semibold rounded-lg px-6 py-2.5 transition-colors cursor-pointer shadow-md"
            >
              <span>Continue to Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Register;
