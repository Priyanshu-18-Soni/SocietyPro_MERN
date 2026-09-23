import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Building2, 
  Clock, 
  LogOut, 
  RotateCw, 
  ShieldAlert, 
  User, 
  Mail, 
  Home 
} from 'lucide-react';
import axiosInstance from '../api/axiosInstance';

const PendingApproval = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);
  const [checkMessage, setCheckMessage] = useState('');

  const handleSignOut = () => {
    logout();
    navigate('/login');
  };

  const handleCheckStatus = async () => {
    setChecking(true);
    setCheckMessage('');
    try {
      // Test with a lightweight protected request to see if status changed from inactive to active
      await axiosInstance.get('/payments/dashboard');
      // If request succeeds without 403 ACCOUNT_INACTIVE, resident is approved!
      setCheckMessage('Account approved! Redirecting to dashboard...');
      setTimeout(() => {
        navigate('/');
      }, 1000);
    } catch (err) {
      if (err.response?.data?.code === 'ACCOUNT_INACTIVE') {
        setCheckMessage('Status: Still awaiting committee approval. Please check back later.');
      } else if (err.response?.status === 401) {
        // Token invalid or expired
        logout();
        navigate('/login');
      } else {
        setCheckMessage('Your approval is still pending. Please contact your society committee.');
      }
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F172A] to-[#1E293B] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans text-slate-800">
      {/* Brand Header */}
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

      {/* Main Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg px-4">
        <div className="bg-white py-8 px-6 shadow-2xl rounded-2xl border border-slate-700/10 sm:px-10 text-center">
          
          {/* Animated Status Icon */}
          <div className="mx-auto w-16 h-16 rounded-full bg-amber-50 border-2 border-[#D4AF37]/40 flex items-center justify-center text-amber-600 mb-5 shadow-inner">
            <Clock className="w-8 h-8 animate-pulse text-[#bca030]" />
          </div>

          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold uppercase tracking-wider mb-3">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
            <span>Approval Pending</span>
          </div>

          <h2 className="text-2xl font-bold text-charcoal tracking-tight">
            Account Under Review
          </h2>

          <p className="mt-3 text-base text-slate-600 font-medium leading-relaxed">
            Your account is awaiting approval from your society committee.
          </p>

          <p className="mt-2 text-xs text-slate-500 leading-normal">
            For security and verification, self-registered resident accounts must be approved by a Society Owner or Committee member before accessing society records, payments, and services.
          </p>

          {/* User Details Summary Box */}
          {user && (
            <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-left text-xs space-y-2.5">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Registration Details
              </div>
              <div className="flex items-center justify-between text-slate-700">
                <span className="flex items-center space-x-1.5 text-slate-500">
                  <User className="w-3.5 h-3.5" />
                  <span>Name:</span>
                </span>
                <span className="font-semibold text-charcoal truncate max-w-[200px]">
                  {user.name || 'Resident'}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-700">
                <span className="flex items-center space-x-1.5 text-slate-500">
                  <Mail className="w-3.5 h-3.5" />
                  <span>Email:</span>
                </span>
                <span className="font-semibold text-charcoal truncate max-w-[200px]">
                  {user.email || 'N/A'}
                </span>
              </div>
              {user.unitNumber && (
                <div className="flex items-center justify-between text-slate-700">
                  <span className="flex items-center space-x-1.5 text-slate-500">
                    <Home className="w-3.5 h-3.5" />
                    <span>Unit / Flat:</span>
                  </span>
                  <span className="font-semibold text-charcoal">
                    {user.unitNumber}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Dynamic Status Feedback */}
          {checkMessage && (
            <div className="mt-4 p-3 rounded-lg bg-slate-100 border border-border text-xs text-charcoal font-medium text-center">
              {checkMessage}
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-6 space-y-3">
            <button
              type="button"
              onClick={handleCheckStatus}
              disabled={checking}
              className="w-full h-11 flex justify-center items-center gap-2 bg-[#0F172A] hover:bg-[#1E293B] text-[#D4AF37] border border-[#D4AF37]/30 font-semibold rounded-xl px-6 py-2.5 transition-colors cursor-pointer shadow-md disabled:opacity-50"
            >
              <RotateCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
              <span>{checking ? 'Checking Status...' : 'Check Approval Status'}</span>
            </button>

            <button
              type="button"
              onClick={handleSignOut}
              className="w-full h-11 flex justify-center items-center gap-2 bg-white hover:bg-red-50 text-slate-700 hover:text-error border border-border hover:border-error/30 font-semibold rounded-xl px-6 py-2.5 transition-colors cursor-pointer shadow-xs"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 text-[11px] text-slate-400">
            Need urgent access? Reach out directly to your society chairperson or administrator.
          </div>
        </div>
      </div>
    </div>
  );
};

export default PendingApproval;
