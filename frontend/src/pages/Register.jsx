import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';

const Register = () => {
  const [searchParams] = useSearchParams();
  const roleQuery = searchParams.get('role');
  const getInitialRole = () => {
    if (roleQuery === 'admin') return 'SocietyAdmin';
    if (roleQuery === 'resident') return 'Resident';
    return 'Resident';
  };

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(getInitialRole);
  const [societyId, setSocietyId] = useState('');
  const [unitNumber, setUnitNumber] = useState('');

  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const validateForm = () => {
    const newErrors = {};

    if (!name.trim()) {
      newErrors.name = 'Name is required';
    } else if (name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters long';
    }

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

    if (!role) {
      newErrors.role = 'Role is required';
    }

    // Society ID is required for SocietyAdmin and Resident roles
    if ((role === 'SocietyAdmin' || role === 'Resident') && !societyId.trim()) {
      newErrors.societyId = 'Society ID is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');

    if (!validateForm()) return;

    setLoading(true);

    // Build the request payload dynamically based on the role
    const payload = {
      name: name.trim(),
      email,
      password,
      role,
    };

    if (role === 'SocietyAdmin' || role === 'Resident') {
      payload.societyId = societyId.trim();
    }

    if (role === 'Resident' && unitNumber.trim()) {
      payload.unitNumber = unitNumber.trim();
    }

    try {
      const response = await axiosInstance.post('/auth/register', payload);
      const { token, user } = response.data;

      // Save token & user in AuthContext
      login(token, user);

      // Redirect to home/dashboard route
      navigate('/');
    } catch (err) {
      console.error(err);
      const message = err.response?.data?.message || 'Registration failed. Please check your inputs and try again.';
      setApiError(message);
    } finally {
      setLoading(false);
    }
  };

  // Reset conditional fields when role changes to avoid sending stale values
  const handleRoleChange = (selectedRole) => {
    setRole(selectedRole);
    if (selectedRole === 'SuperAdmin') {
      setSocietyId('');
      setUnitNumber('');
    } else if (selectedRole === 'SocietyAdmin') {
      setUnitNumber('');
    }
    // Clear field-specific errors
    setErrors((prev) => {
      const updated = { ...prev };
      delete updated.role;
      delete updated.societyId;
      return updated;
    });
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <h1 className="text-4xl font-bold text-primary tracking-tight">
          SocietyPro
        </h1>
        <p className="mt-2 text-sm text-slate">
          Housing Society Management Portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 shadow-sm rounded-xl border border-border sm:px-10">
          <h2 className="text-xl font-bold text-charcoal mb-6 border-b border-border pb-4">
            Create Account
          </h2>

          {apiError && (
            <div className="mb-4 p-4 rounded-lg bg-red-50 border border-error/20 text-error text-sm font-medium">
              {apiError}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            {/* Name */}
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
                className={`w-full h-11 px-3.5 py-2.5 bg-white border rounded-lg text-charcoal placeholder-slate/40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors ${
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

            {/* Email */}
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
                className={`w-full h-11 px-3.5 py-2.5 bg-white border rounded-lg text-charcoal placeholder-slate/40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors ${
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
                placeholder="Choose a secure password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors({ ...errors, password: '' });
                }}
                className={`w-full h-11 px-3.5 py-2.5 bg-white border rounded-lg text-charcoal placeholder-slate/40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors ${
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

            {/* Role select */}
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-charcoal mb-1">
                Role <span className="text-error">*</span>
              </label>
              <select
                id="role"
                name="role"
                value={role}
                onChange={(e) => handleRoleChange(e.target.value)}
                className="w-full h-11 px-3.5 py-2 bg-white border border-border rounded-lg text-charcoal focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors cursor-pointer"
                disabled={loading}
              >
                <option value="Resident">Resident</option>
                <option value="SocietyAdmin">Society Admin</option>
                <option value="SuperAdmin">Super Admin</option>
              </select>
            </div>

            {/* Society ID (conditional rendering) */}
            {(role === 'SocietyAdmin' || role === 'Resident') && (
              <div>
                <label htmlFor="societyId" className="block text-sm font-medium text-charcoal mb-1">
                  Society ID <span className="text-error">*</span>
                </label>
                <input
                  id="societyId"
                  name="societyId"
                  type="text"
                  placeholder="Enter your Society ID"
                  value={societyId}
                  onChange={(e) => {
                    setSocietyId(e.target.value);
                    if (errors.societyId) setErrors({ ...errors, societyId: '' });
                  }}
                  className={`w-full h-11 px-3.5 py-2.5 bg-white border rounded-lg text-charcoal placeholder-slate/40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors ${
                    errors.societyId ? 'border-error' : 'border-border'
                  }`}
                  disabled={loading}
                />
                {errors.societyId && (
                  <p className="mt-1.5 text-xs text-error font-medium" id="societyId-error">
                    {errors.societyId}
                  </p>
                )}
              </div>
            )}

            {/* Unit Number (conditional rendering) */}
            {role === 'Resident' && (
              <div>
                <label htmlFor="unitNumber" className="block text-sm font-medium text-charcoal mb-1">
                  Unit Number <span className="text-slate/60 text-xs font-normal ml-1">(Optional)</span>
                </label>
                <input
                  id="unitNumber"
                  name="unitNumber"
                  type="text"
                  placeholder="e.g., A-101"
                  value={unitNumber}
                  onChange={(e) => setUnitNumber(e.target.value)}
                  className="w-full h-11 px-3.5 py-2.5 bg-white border border-border rounded-lg text-charcoal placeholder-slate/40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                  disabled={loading}
                />
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className={`w-full h-11 flex justify-center items-center bg-primary hover:bg-primary-light text-white font-medium rounded-lg px-6 py-2.5 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer ${
                  loading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span>Registering...</span>
                  </div>
                ) : (
                  'Register'
                )}
              </button>
            </div>
          </form>

          {/* Redirection Link to Login */}
          <div className="mt-6 text-center border-t border-border pt-4">
            <p className="text-sm text-slate">
              Already have an account?{' '}
              <Link to="/login" className="text-primary hover:underline hover:text-primary-light font-medium transition-colors">
                Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
