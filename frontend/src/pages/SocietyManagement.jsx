import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import { 
  Building2, 
  Copy, 
  Check, 
  Edit3, 
  X, 
  ShieldCheck, 
  MapPin, 
  FileText, 
  Calendar, 
  AlertCircle, 
  CheckCircle2,
  Lock,
  Plus,
  Trash2,
  Percent,
  Clock,
  AlertTriangle,
  Info,
  Save,
  DollarSign
} from 'lucide-react';

const SocietyManagement = () => {
  const { user } = useAuth();
  const isOwner = user?.role === 'SocietyOwner';
  const societyId = user?.societyId;

  // Active top tab
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'rates' | 'lateFee'

  // --- Profile State ---
  const [society, setSociety] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    registrationNumber: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [copied, setCopied] = useState(false);

  // --- Default Rates State ---
  const [defaultRates, setDefaultRates] = useState([]);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [ratesError, setRatesError] = useState('');
  const [ratesSuccess, setRatesSuccess] = useState('');
  const [ratesSaveLoading, setRatesSaveLoading] = useState(false);

  // --- Late Fee Settings State ---
  const [lateFeeSettings, setLateFeeSettings] = useState({
    ratePercentPerYear: 21,
    gracePeriodDays: 5,
    dueDateDay: 10,
  });
  const [lateFeeLoading, setLateFeeLoading] = useState(false);
  const [lateFeeError, setLateFeeError] = useState('');
  const [lateFeeSuccess, setLateFeeSuccess] = useState('');
  const [lateFeeSaveLoading, setLateFeeSaveLoading] = useState(false);

  // Fetch society profile
  const fetchSociety = async () => {
    if (!societyId) {
      setError('No society associated with your account.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await axiosInstance.get(`/society/${societyId}`);
      const data = response.data.society;
      setSociety(data);
      setFormData({
        name: data.name || '',
        address: data.address || '',
        city: data.city || '',
        registrationNumber: data.registrationNumber || '',
      });
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to fetch society details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch default maintenance rates
  const fetchDefaultRates = async () => {
    setRatesLoading(true);
    setRatesError('');
    try {
      const response = await axiosInstance.get('/society/rates/default');
      setDefaultRates(response.data.defaultRateItems || []);
    } catch (err) {
      console.error(err);
      setRatesError(err.response?.data?.message || 'Failed to fetch default rate items.');
    } finally {
      setRatesLoading(false);
    }
  };

  // Fetch late fee policy
  const fetchLateFeeSettings = async () => {
    setLateFeeLoading(true);
    setLateFeeError('');
    try {
      const response = await axiosInstance.get('/society/late-fee-settings');
      if (response.data.lateFeeSettings) {
        setLateFeeSettings(response.data.lateFeeSettings);
      }
    } catch (err) {
      console.error(err);
      setLateFeeError(err.response?.data?.message || 'Failed to fetch late fee settings.');
    } finally {
      setLateFeeLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSociety();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [societyId]);

  useEffect(() => {
    if (activeTab === 'rates') {
      fetchDefaultRates();
    } else if (activeTab === 'lateFee') {
      fetchLateFeeSettings();
    }
  }, [activeTab]);

  // Copy societyCode
  const handleCopyCode = async () => {
    if (!society?.societyCode) return;
    try {
      await navigator.clipboard.writeText(society.societyCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  // Profile Form Validation
  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Society Name is required';
    if (!formData.address.trim()) errors.address = 'Address is required';
    if (!formData.city.trim()) errors.city = 'City is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCancelEdit = () => {
    if (society) {
      setFormData({
        name: society.name || '',
        address: society.address || '',
        city: society.city || '',
        registrationNumber: society.registrationNumber || '',
      });
    }
    setFormErrors({});
    setIsEditing(false);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!isOwner || !validateForm()) return;

    setSaveLoading(true);
    setSaveSuccess('');
    setError('');

    try {
      const payload = {
        name: formData.name.trim(),
        address: formData.address.trim(),
        city: formData.city.trim(),
        registrationNumber: formData.registrationNumber.trim(),
      };

      const response = await axiosInstance.patch(`/society/${societyId}`, payload);
      const updated = response.data.society;
      setSociety(updated);
      setIsEditing(false);
      setSaveSuccess('Society profile updated successfully!');
      setTimeout(() => setSaveSuccess(''), 4000);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to update society details.');
    } finally {
      setSaveLoading(false);
    }
  };

  // --- Default Rates Actions ---
  const handleAddRateItem = () => {
    setDefaultRates((prev) => [
      ...prev,
      { name: '', amount: '', gstApplicable: false },
    ]);
  };

  const handleRateItemChange = (index, field, value) => {
    setDefaultRates((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const handleRemoveRateItem = (index) => {
    setDefaultRates((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveRates = async (e) => {
    e.preventDefault();
    if (!isOwner) return;

    setRatesError('');
    setRatesSuccess('');

    // Validation
    for (let i = 0; i < defaultRates.length; i++) {
      const it = defaultRates[i];
      if (!it.name || !it.name.trim()) {
        setRatesError(`Rate item #${i + 1} must have a name.`);
        return;
      }
      const num = Number(it.amount);
      if (isNaN(num) || num <= 0) {
        setRatesError(`Rate item "${it.name}" must have an amount greater than zero.`);
        return;
      }
    }

    setRatesSaveLoading(true);
    try {
      const payload = {
        rateItems: defaultRates.map((it) => ({
          name: it.name.trim(),
          amount: Number(it.amount),
          gstApplicable: Boolean(it.gstApplicable),
        })),
      };

      const response = await axiosInstance.patch('/society/rates/default', payload);
      setDefaultRates(response.data.defaultRateItems || []);
      setRatesSuccess('Society default rates updated successfully!');
      setTimeout(() => setRatesSuccess(''), 4000);
    } catch (err) {
      console.error(err);
      setRatesError(err.response?.data?.message || 'Failed to update default rates.');
    } finally {
      setRatesSaveLoading(false);
    }
  };

  // --- Late Fee Settings Actions ---
  const handleSaveLateFee = async (e) => {
    e.preventDefault();
    if (!isOwner) return;

    setLateFeeError('');
    setLateFeeSuccess('');

    const rate = Number(lateFeeSettings.ratePercentPerYear);
    const grace = Number(lateFeeSettings.gracePeriodDays);
    const dueDay = Number(lateFeeSettings.dueDateDay);

    if (isNaN(rate) || rate <= 0 || rate > 100) {
      setLateFeeError('Annual rate must be a percentage between 1% and 100%.');
      return;
    }
    if (isNaN(grace) || grace < 0) {
      setLateFeeError('Grace period must be 0 or more days.');
      return;
    }
    if (isNaN(dueDay) || dueDay < 1 || dueDay > 28) {
      setLateFeeError('Due date day must be between 1 and 28 of the month.');
      return;
    }

    setLateFeeSaveLoading(true);
    try {
      const payload = {
        ratePercentPerYear: rate,
        gracePeriodDays: grace,
        dueDateDay: dueDay,
      };

      const response = await axiosInstance.patch('/society/late-fee-settings', payload);
      if (response.data.lateFeeSettings) {
        setLateFeeSettings(response.data.lateFeeSettings);
      }
      setLateFeeSuccess('Late fee policy updated successfully!');
      setTimeout(() => setLateFeeSuccess(''), 4000);
    } catch (err) {
      console.error(err);
      setLateFeeError(err.response?.data?.message || 'Failed to update late fee settings.');
    } finally {
      setLateFeeSaveLoading(false);
    }
  };

  // Compute total monthly default maintenance
  const totalDefaultMonthlyAmount = defaultRates.reduce(
    (sum, it) => sum + (Number(it.amount) || 0),
    0
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-3xl font-bold text-charcoal tracking-tight">My Society</h1>
            {isOwner ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-[#bca030] border border-amber-200">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Owner View</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                <Lock className="w-3.5 h-3.5" />
                <span>Committee (Read-Only)</span>
              </span>
            )}
          </div>
          <p className="text-sm text-slate mt-1">
            Configure society profile, maintenance billing schedules, and overdue penalty policies.
          </p>
        </div>

        {/* Global Action depending on active tab */}
        {activeTab === 'profile' && isOwner && !loading && society && (
          <div>
            {isEditing ? (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="h-11 bg-white hover:bg-slate-50 text-slate font-medium px-5 py-2.5 rounded-lg border border-border transition-colors cursor-pointer flex items-center justify-center space-x-2 shadow-xs"
              >
                <X className="w-4 h-4" />
                <span>Cancel</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="h-11 bg-[#0F172A] hover:bg-[#1E293B] text-[#D4AF37] border border-[#D4AF37]/30 font-semibold px-5 py-2.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center space-x-2 shadow-xs active:scale-98"
              >
                <Edit3 className="w-4 h-4" />
                <span>Edit Profile</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex border-b border-border">
        <div className="flex space-x-2 p-1 bg-slate-100/70 rounded-xl border border-border/40">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'profile'
                ? 'bg-[#0F172A] text-[#D4AF37] shadow-sm font-bold'
                : 'text-slate hover:text-charcoal hover:bg-white/60'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Society Profile</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('rates')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'rates'
                ? 'bg-[#0F172A] text-[#D4AF37] shadow-sm font-bold'
                : 'text-slate hover:text-charcoal hover:bg-white/60'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Default Rates</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('lateFee')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'lateFee'
                ? 'bg-[#0F172A] text-[#D4AF37] shadow-sm font-bold'
                : 'text-slate hover:text-charcoal hover:bg-white/60'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Late Fee Settings</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: SOCIETY PROFILE                                                    */}
      {/* ========================================================================= */}
      {activeTab === 'profile' && (
        <>
          {/* Save Success Alert */}
          {saveSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center space-x-3 shadow-xs">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span className="text-sm font-semibold">{saveSuccess}</span>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <div className="p-4 bg-red-50 border border-error/20 text-error rounded-xl flex items-center justify-between shadow-xs">
              <div className="flex items-center space-x-2.5">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span className="text-sm font-medium">{error}</span>
              </div>
              <button
                onClick={fetchSociety}
                className="text-sm text-error underline hover:text-red-700 font-semibold cursor-pointer ml-3"
              >
                Retry
              </button>
            </div>
          )}

          {loading ? (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-border p-8 animate-pulse space-y-4">
                <div className="h-8 bg-slate-100 rounded w-1/3"></div>
                <div className="h-5 bg-slate-100 rounded w-1/2"></div>
                <div className="h-20 bg-slate-50 rounded-xl mt-6"></div>
              </div>
            </div>
          ) : society ? (
            <div className="space-y-6">
              {/* Resident Join Code Banner */}
              <div className="bg-gradient-to-br from-[#0F172A] to-[#1E293B] rounded-2xl p-6 sm:p-8 text-white shadow-xl border border-slate-700/30">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                  <div className="space-y-2 text-left">
                    <div className="flex items-center space-x-2">
                      <div className="p-2 bg-[#D4AF37]/15 rounded-lg text-[#D4AF37]">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-bold text-[#D4AF37] tracking-wider uppercase">
                        Resident Join Code
                      </span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                      {society.name}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
                      Share this code with your residents so they can join this society when registering on SocietyPro.
                    </p>
                  </div>

                  {/* Code Display and Copy Box */}
                  <div className="bg-white/10 backdrop-blur-xs border border-white/15 p-4 rounded-xl flex items-center justify-between sm:justify-start gap-4 shadow-inner">
                    <div className="text-left">
                      <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">
                        Society Code
                      </span>
                      <span className="font-mono text-2xl sm:text-3xl font-extrabold text-[#D4AF37] tracking-widest">
                        {society.societyCode}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyCode}
                      className="p-3 bg-[#D4AF37] hover:bg-[#bca030] text-[#0F172A] rounded-lg font-bold transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5"
                      title="Copy Society Code"
                    >
                      {copied ? (
                        <>
                          <Check className="w-5 h-5" />
                          <span className="text-xs font-bold">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-5 h-5" />
                          <span className="text-xs font-bold">Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Profile Details Form or Read-Only Card */}
              {isEditing ? (
                <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden text-left">
                  <div className="px-6 py-4 border-b border-border bg-slate-50/50 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-charcoal">Edit Society Information</h3>
                    <span className="text-xs text-slate-500">Update general society details</span>
                  </div>

                  <form onSubmit={handleSaveProfile} className="p-6 sm:p-8 space-y-6">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-charcoal mb-1">
                        Society Name <span className="text-error">*</span>
                      </label>
                      <input
                        id="name"
                        type="text"
                        placeholder="e.g. Green Valley Housing Society"
                        value={formData.name}
                        onChange={(e) => {
                          setFormData({ ...formData, name: e.target.value });
                          if (formErrors.name) setFormErrors({ ...formErrors, name: '' });
                        }}
                        className={`w-full h-11 px-3.5 py-2.5 bg-white border rounded-lg text-charcoal placeholder-slate/40 focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 focus:border-[#0F172A] transition-colors ${
                          formErrors.name ? 'border-error' : 'border-border'
                        }`}
                        disabled={saveLoading}
                      />
                      {formErrors.name && (
                        <p className="mt-1 text-xs text-error font-medium">{formErrors.name}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="address" className="block text-sm font-medium text-charcoal mb-1">
                        Address <span className="text-error">*</span>
                      </label>
                      <textarea
                        id="address"
                        rows="3"
                        placeholder="e.g. 123 Main Road, Sector 4"
                        value={formData.address}
                        onChange={(e) => {
                          setFormData({ ...formData, address: e.target.value });
                          if (formErrors.address) setFormErrors({ ...formErrors, address: '' });
                        }}
                        className={`w-full px-3.5 py-2.5 bg-white border rounded-lg text-charcoal placeholder-slate/40 focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 focus:border-[#0F172A] transition-colors ${
                          formErrors.address ? 'border-error' : 'border-border'
                        }`}
                        disabled={saveLoading}
                      />
                      {formErrors.address && (
                        <p className="mt-1 text-xs text-error font-medium">{formErrors.address}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <label htmlFor="city" className="block text-sm font-medium text-charcoal mb-1">
                          City <span className="text-error">*</span>
                        </label>
                        <input
                          id="city"
                          type="text"
                          placeholder="e.g. Mumbai"
                          value={formData.city}
                          onChange={(e) => {
                            setFormData({ ...formData, city: e.target.value });
                            if (formErrors.city) setFormErrors({ ...formErrors, city: '' });
                          }}
                          className={`w-full h-11 px-3.5 py-2.5 bg-white border rounded-lg text-charcoal placeholder-slate/40 focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 focus:border-[#0F172A] transition-colors ${
                            formErrors.city ? 'border-error' : 'border-border'
                          }`}
                          disabled={saveLoading}
                        />
                        {formErrors.city && (
                          <p className="mt-1 text-xs text-error font-medium">{formErrors.city}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="registrationNumber" className="block text-sm font-medium text-charcoal mb-1">
                          Registration Number <span className="text-slate/60 text-xs font-normal">(Optional)</span>
                        </label>
                        <input
                          id="registrationNumber"
                          type="text"
                          placeholder="e.g. GV2026001"
                          value={formData.registrationNumber}
                          onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                          className="w-full h-11 px-3.5 py-2.5 bg-white border border-border rounded-lg text-charcoal placeholder-slate/40 focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 focus:border-[#0F172A] transition-colors"
                          disabled={saveLoading}
                        />
                      </div>
                    </div>

                    <div className="pt-4 border-t border-border flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="h-11 px-5 bg-white border border-border text-charcoal hover:bg-slate-50 font-medium text-sm rounded-lg transition-colors cursor-pointer"
                        disabled={saveLoading}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="h-11 px-6 bg-[#0F172A] hover:bg-[#1E293B] text-[#D4AF37] border border-[#D4AF37]/30 font-semibold text-sm rounded-lg transition-colors cursor-pointer flex items-center space-x-2 shadow-xs active:scale-98"
                        disabled={saveLoading}
                      >
                        {saveLoading ? <span>Saving...</span> : <span>Save Changes</span>}
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-border p-6 sm:p-8 space-y-6 text-left">
                  <div className="flex items-center justify-between border-b border-border pb-4">
                    <h3 className="text-lg font-bold text-charcoal">Society Details</h3>
                    <span className="text-xs text-slate-500">
                      Registered on {society.createdAt ? new Date(society.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-100 flex items-start space-x-3.5">
                      <div className="p-2.5 bg-white rounded-lg text-primary border border-border shadow-2xs">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                          Society Name
                        </span>
                        <p className="text-base font-bold text-charcoal mt-0.5">{society.name}</p>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-100 flex items-start space-x-3.5">
                      <div className="p-2.5 bg-white rounded-lg text-primary border border-border shadow-2xs">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                          City / Location
                        </span>
                        <p className="text-base font-bold text-charcoal mt-0.5">{society.city}</p>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-100 flex items-start space-x-3.5 sm:col-span-2">
                      <div className="p-2.5 bg-white rounded-lg text-primary border border-border shadow-2xs">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                          Full Address
                        </span>
                        <p className="text-base font-medium text-charcoal mt-0.5">{society.address}</p>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-100 flex items-start space-x-3.5">
                      <div className="p-2.5 bg-white rounded-lg text-primary border border-border shadow-2xs">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                          Registration Number
                        </span>
                        <p className="text-base font-mono font-medium text-charcoal mt-0.5">
                          {society.registrationNumber || <span className="italic text-slate-400 font-sans">Not Specified</span>}
                        </p>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-100 flex items-start space-x-3.5">
                      <div className="p-2.5 bg-white rounded-lg text-primary border border-border shadow-2xs">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                          Account Created
                        </span>
                        <p className="text-base font-medium text-charcoal mt-0.5">
                          {society.createdAt ? new Date(society.createdAt).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: DEFAULT MAINTENANCE RATES                                          */}
      {/* ========================================================================= */}
      {activeTab === 'rates' && (
        <div className="space-y-6 text-left">
          {/* Alerts */}
          {ratesSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center space-x-3 shadow-xs">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span className="text-sm font-semibold">{ratesSuccess}</span>
            </div>
          )}

          {ratesError && (
            <div className="p-4 bg-red-50 border border-error/20 text-error rounded-xl flex items-center justify-between shadow-xs">
              <div className="flex items-center space-x-2.5">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span className="text-sm font-medium">{ratesError}</span>
              </div>
              <button
                onClick={fetchDefaultRates}
                className="text-sm text-error underline hover:text-red-700 font-semibold cursor-pointer ml-3"
              >
                Retry
              </button>
            </div>
          )}

          {/* Rates Content Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
            <div className="p-6 border-b border-border bg-slate-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-charcoal flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-primary" />
                  <span>Default Monthly Maintenance Rates</span>
                </h3>
                <p className="text-xs text-slate mt-1">
                  Baseline monthly maintenance charge items used for auto-billing and new resident onboarding.
                </p>
              </div>

              {isOwner && (
                <button
                  type="button"
                  onClick={handleAddRateItem}
                  className="h-9 px-3.5 bg-[#0F172A] hover:bg-[#1E293B] text-[#D4AF37] text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 self-start sm:self-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Line Item</span>
                </button>
              )}
            </div>

            {ratesLoading ? (
              <div className="p-8 space-y-4 animate-pulse">
                <div className="h-10 bg-slate-100 rounded-lg"></div>
                <div className="h-10 bg-slate-100 rounded-lg"></div>
                <div className="h-10 bg-slate-100 rounded-lg"></div>
              </div>
            ) : defaultRates.length === 0 ? (
              <div className="p-12 text-center">
                <FileText className="w-10 h-10 text-slate/30 mx-auto mb-3" />
                <h4 className="text-sm font-bold text-charcoal">No Default Rate Items</h4>
                <p className="text-xs text-slate mt-1 max-w-sm mx-auto">
                  {isOwner 
                    ? 'Define society-wide rate items like Water Charges, Security, or Sinking Fund to establish baseline monthly dues.' 
                    : 'No default rates configured by the Society Owner yet.'}
                </p>
                {isOwner && (
                  <button
                    type="button"
                    onClick={handleAddRateItem}
                    className="mt-4 px-4 py-2 bg-primary text-white font-semibold text-xs rounded-lg hover:bg-primary-light transition-colors"
                  >
                    Add First Rate Item
                  </button>
                )}
              </div>
            ) : (
              <form onSubmit={handleSaveRates} className="p-6 space-y-4">
                <div className="space-y-3">
                  {defaultRates.map((item, idx) => (
                    <div 
                      key={idx}
                      className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-slate-50/70 border border-slate-100 rounded-xl"
                    >
                      {/* Name input */}
                      <div className="flex-1">
                        <label className="block text-[11px] font-semibold text-slate uppercase mb-1">
                          Item Name
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Security & Surveillance"
                          value={item.name}
                          disabled={!isOwner || ratesSaveLoading}
                          onChange={(e) => handleRateItemChange(idx, 'name', e.target.value)}
                          className="w-full h-10 px-3 bg-white border border-border rounded-lg text-sm text-charcoal placeholder-slate/40 focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 focus:border-[#0F172A] transition-colors disabled:bg-slate-100 disabled:text-slate-500"
                        />
                      </div>

                      {/* Amount input */}
                      <div className="w-full sm:w-40">
                        <label className="block text-[11px] font-semibold text-slate uppercase mb-1">
                          Amount (₹)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          placeholder="e.g. 500"
                          value={item.amount}
                          disabled={!isOwner || ratesSaveLoading}
                          onChange={(e) => handleRateItemChange(idx, 'amount', e.target.value)}
                          className="w-full h-10 px-3 bg-white border border-border rounded-lg text-sm text-charcoal font-semibold focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 focus:border-[#0F172A] transition-colors disabled:bg-slate-100 disabled:text-slate-500"
                        />
                      </div>

                      {/* GST Toggle */}
                      <div className="sm:pt-5 flex items-center gap-2">
                        <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-medium text-charcoal">
                          <input
                            type="checkbox"
                            checked={Boolean(item.gstApplicable)}
                            disabled={!isOwner || ratesSaveLoading}
                            onChange={(e) => handleRateItemChange(idx, 'gstApplicable', e.target.checked)}
                            className="w-4 h-4 text-[#0F172A] rounded border-border focus:ring-[#0F172A]/20 cursor-pointer disabled:opacity-50"
                          />
                          <span>GST</span>
                        </label>
                      </div>

                      {/* Remove Button */}
                      {isOwner && (
                        <div className="sm:pt-5">
                          <button
                            type="button"
                            onClick={() => handleRemoveRateItem(idx)}
                            disabled={ratesSaveLoading}
                            className="p-2 text-slate hover:text-error hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Remove Item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Total Summary Bar */}
                <div className="mt-6 p-4 bg-slate-100/70 rounded-xl flex items-center justify-between border border-border">
                  <div className="flex items-center gap-2 text-sm font-semibold text-charcoal">
                    <Info className="w-4 h-4 text-primary" />
                    <span>Total Standard Monthly Maintenance:</span>
                  </div>
                  <div className="text-xl font-extrabold text-[#0F172A]">
                    ₹{totalDefaultMonthlyAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </div>
                </div>

                {/* Save Button for SocietyOwner */}
                {isOwner && (
                  <div className="pt-4 border-t border-border flex justify-end">
                    <button
                      type="submit"
                      disabled={ratesSaveLoading}
                      className="h-11 px-6 bg-[#0F172A] hover:bg-[#1E293B] text-[#D4AF37] border border-[#D4AF37]/30 font-semibold text-sm rounded-lg transition-colors cursor-pointer flex items-center space-x-2 shadow-xs active:scale-98"
                    >
                      <Save className="w-4 h-4" />
                      <span>{ratesSaveLoading ? 'Saving Rates...' : 'Save Default Rates'}</span>
                    </button>
                  </div>
                )}
              </form>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: LATE FEE SETTINGS                                                  */}
      {/* ========================================================================= */}
      {activeTab === 'lateFee' && (
        <div className="space-y-6 text-left">
          {/* Alerts */}
          {lateFeeSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center space-x-3 shadow-xs">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span className="text-sm font-semibold">{lateFeeSuccess}</span>
            </div>
          )}

          {lateFeeError && (
            <div className="p-4 bg-red-50 border border-error/20 text-error rounded-xl flex items-center justify-between shadow-xs">
              <div className="flex items-center space-x-2.5">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span className="text-sm font-medium">{lateFeeError}</span>
              </div>
              <button
                onClick={fetchLateFeeSettings}
                className="text-sm text-error underline hover:text-red-700 font-semibold cursor-pointer ml-3"
              >
                Retry
              </button>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
            <div className="p-6 border-b border-border bg-slate-50/50">
              <h3 className="text-lg font-bold text-charcoal flex items-center gap-2">
                <Clock className="w-5 h-5 text-warning" />
                <span>Overdue Bill Penalty & Late Fee Policy</span>
              </h3>
              <p className="text-xs text-slate mt-1">
                Configure automatic interest accrual calculations for maintenance bills past their due date.
              </p>
            </div>

            {lateFeeLoading ? (
              <div className="p-8 space-y-4 animate-pulse">
                <div className="h-10 bg-slate-100 rounded-lg"></div>
                <div className="h-10 bg-slate-100 rounded-lg"></div>
              </div>
            ) : (
              <form onSubmit={handleSaveLateFee} className="p-6 sm:p-8 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {/* Annual Rate */}
                  <div className="p-4 bg-slate-50/70 border border-slate-100 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-charcoal uppercase tracking-wider block">
                        Annual Interest Rate
                      </label>
                      <Percent className="w-4 h-4 text-primary" />
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        max="100"
                        step="0.5"
                        value={lateFeeSettings.ratePercentPerYear}
                        disabled={!isOwner || lateFeeSaveLoading}
                        onChange={(e) =>
                          setLateFeeSettings({
                            ...lateFeeSettings,
                            ratePercentPerYear: e.target.value,
                          })
                        }
                        className="w-full h-11 pr-8 pl-3 bg-white border border-border rounded-lg text-charcoal font-bold text-base focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 focus:border-[#0F172A] disabled:bg-slate-100"
                      />
                      <span className="absolute right-3 top-3 text-slate-400 font-bold text-sm">%</span>
                    </div>
                    <p className="text-[11px] text-slate">Standard society penalty rate (typically 18% – 24% p.a.)</p>
                  </div>

                  {/* Grace Period */}
                  <div className="p-4 bg-slate-50/70 border border-slate-100 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-charcoal uppercase tracking-wider block">
                        Grace Period
                      </label>
                      <Clock className="w-4 h-4 text-warning" />
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="30"
                        step="1"
                        value={lateFeeSettings.gracePeriodDays}
                        disabled={!isOwner || lateFeeSaveLoading}
                        onChange={(e) =>
                          setLateFeeSettings({
                            ...lateFeeSettings,
                            gracePeriodDays: e.target.value,
                          })
                        }
                        className="w-full h-11 pr-14 pl-3 bg-white border border-border rounded-lg text-charcoal font-bold text-base focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 focus:border-[#0F172A] disabled:bg-slate-100"
                      />
                      <span className="absolute right-3 top-3 text-slate-400 font-medium text-xs">Days</span>
                    </div>
                    <p className="text-[11px] text-slate">Days after due date before interest penalty triggers</p>
                  </div>

                  {/* Due Date Day */}
                  <div className="p-4 bg-slate-50/70 border border-slate-100 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-charcoal uppercase tracking-wider block">
                        Monthly Due Day
                      </label>
                      <Calendar className="w-4 h-4 text-primary" />
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        max="28"
                        step="1"
                        value={lateFeeSettings.dueDateDay}
                        disabled={!isOwner || lateFeeSaveLoading}
                        onChange={(e) =>
                          setLateFeeSettings({
                            ...lateFeeSettings,
                            dueDateDay: e.target.value,
                          })
                        }
                        className="w-full h-11 pr-16 pl-3 bg-white border border-border rounded-lg text-charcoal font-bold text-base focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 focus:border-[#0F172A] disabled:bg-slate-100"
                      />
                      <span className="absolute right-3 top-3 text-slate-400 font-medium text-xs">of month</span>
                    </div>
                    <p className="text-[11px] text-slate">Default billing cycle cut-off day (1 – 28)</p>
                  </div>
                </div>

                {/* Calculation Formula Explanation Box */}
                <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/60 text-charcoal text-xs space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-amber-700" />
                    <span>How Late Fees Are Calculated</span>
                  </div>
                  <p className="text-slate leading-relaxed">
                    Charges accrue daily on unpaid balances:
                  </p>
                  <div className="p-2.5 bg-white/80 rounded-lg font-mono text-[11px] text-charcoal border border-amber-200/40">
                    Late Fee = (Bill Amount × {lateFeeSettings.ratePercentPerYear || 21}% / 365) × (Days Overdue − {lateFeeSettings.gracePeriodDays || 5} Grace Days)
                  </div>
                  <p className="text-slate text-[11px]">
                    If payment is received within the grace period, zero late fee is assessed. Once past the grace period, interest applies to the full overdue duration.
                  </p>
                </div>

                {/* Submit for SocietyOwner */}
                {isOwner && (
                  <div className="pt-4 border-t border-border flex justify-end">
                    <button
                      type="submit"
                      disabled={lateFeeSaveLoading}
                      className="h-11 px-6 bg-[#0F172A] hover:bg-[#1E293B] text-[#D4AF37] border border-[#D4AF37]/30 font-semibold text-sm rounded-lg transition-colors cursor-pointer flex items-center space-x-2 shadow-xs active:scale-98"
                    >
                      <Save className="w-4 h-4" />
                      <span>{lateFeeSaveLoading ? 'Saving Policy...' : 'Save Late Fee Policy'}</span>
                    </button>
                  </div>
                )}
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SocietyManagement;
