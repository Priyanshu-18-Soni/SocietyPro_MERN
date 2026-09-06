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
  Lock
} from 'lucide-react';

const SocietyManagement = () => {
  const { user } = useAuth();
  const isOwner = user?.role === 'SocietyOwner';
  const societyId = user?.societyId;

  const [society, setSociety] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Editing state
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

  // Fetch society on mount or when societyId changes
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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSociety();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [societyId]);

  // Copy societyCode to clipboard
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

  // Form Validation
  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Society Name is required';
    if (!formData.address.trim()) errors.address = 'Address is required';
    if (!formData.city.trim()) errors.city = 'City is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Cancel edit mode
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

  // Handle Save
  const handleSave = async (e) => {
    e.preventDefault();
    if (!isOwner) return;

    if (!validateForm()) return;

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
      setFormData({
        name: updated.name || '',
        address: updated.address || '',
        city: updated.city || '',
        registrationNumber: updated.registrationNumber || '',
      });
      setIsEditing(false);
      setSaveSuccess('Society profile updated successfully!');
      setTimeout(() => setSaveSuccess(''), 4000);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to update society details. Please try again.');
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Section */}
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
            Society profile, residential join code, and registration information.
          </p>
        </div>

        {/* Edit Button for SocietyOwner only */}
        {isOwner && !loading && society && (
          <div>
            {isEditing ? (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="h-11 bg-white hover:bg-slate-50 text-slate font-medium px-5 py-2.5 rounded-lg border border-border transition-colors cursor-pointer flex items-center justify-center space-x-2 shadow-sm"
              >
                <X className="w-4 h-4" />
                <span>Cancel</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="h-11 bg-[#0F172A] hover:bg-[#1E293B] text-[#D4AF37] border border-[#D4AF37]/30 font-semibold px-5 py-2.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center space-x-2 shadow-sm active:scale-98"
              >
                <Edit3 className="w-4 h-4" />
                <span>Edit Details</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Save Success Alert */}
      {saveSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center space-x-3 shadow-sm animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="text-sm font-semibold">{saveSuccess}</span>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-red-50 border border-error/20 text-error rounded-xl flex items-center justify-between shadow-sm">
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

      {/* Loading Skeleton */}
      {loading ? (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-border p-8 animate-pulse space-y-4">
            <div className="h-8 bg-slate-100 rounded w-1/3"></div>
            <div className="h-5 bg-slate-100 rounded w-1/2"></div>
            <div className="h-20 bg-slate-50 rounded-xl mt-6"></div>
          </div>
          <div className="bg-white rounded-xl border border-border p-8 animate-pulse space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="h-16 bg-slate-50 rounded-lg"></div>
              <div className="h-16 bg-slate-50 rounded-lg"></div>
              <div className="h-16 bg-slate-50 rounded-lg"></div>
              <div className="h-16 bg-slate-50 rounded-lg"></div>
            </div>
          </div>
        </div>
      ) : society ? (
        <div className="space-y-6">
          {/* Prominent Society Code Card */}
          <div className="bg-gradient-to-br from-[#0F172A] to-[#1E293B] rounded-2xl p-6 sm:p-8 text-white shadow-xl border border-slate-700/30">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="space-y-2">
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
                <div>
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

          {/* Edit Form or Read-Only Profile View */}
          {isEditing ? (
            /* Edit Form */
            <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
              <div className="px-6 py-4 border-b border-border bg-slate-50/50 flex items-center justify-between">
                <h3 className="text-lg font-bold text-charcoal">Edit Society Information</h3>
                <span className="text-xs text-slate-500">Update society profile details</span>
              </div>

              <form onSubmit={handleSave} className="p-6 sm:p-8 space-y-6">
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

                {/* Form Actions */}
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
                    className="h-11 px-6 bg-[#0F172A] hover:bg-[#1E293B] text-[#D4AF37] border border-[#D4AF37]/30 font-semibold text-sm rounded-lg transition-colors cursor-pointer flex items-center space-x-2 shadow-md active:scale-98"
                    disabled={saveLoading}
                  >
                    {saveLoading ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-[#D4AF37]" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        <span>Saving...</span>
                      </>
                    ) : (
                      <span>Save Changes</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* Read-Only Details Grid View */
            <div className="bg-white rounded-2xl shadow-sm border border-border p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <h3 className="text-lg font-bold text-charcoal">Society Details</h3>
                <span className="text-xs text-slate-500">
                  Registered on {society.createdAt ? new Date(society.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Society Name */}
                <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-100 flex items-start space-x-3.5">
                  <div className="p-2.5 bg-white rounded-lg text-primary border border-border shadow-2xs">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                      Society Name
                    </span>
                    <p className="text-base font-bold text-charcoal mt-0.5">
                      {society.name}
                    </p>
                  </div>
                </div>

                {/* City */}
                <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-100 flex items-start space-x-3.5">
                  <div className="p-2.5 bg-white rounded-lg text-primary border border-border shadow-2xs">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                      City / Location
                    </span>
                    <p className="text-base font-bold text-charcoal mt-0.5">
                      {society.city}
                    </p>
                  </div>
                </div>

                {/* Address */}
                <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-100 flex items-start space-x-3.5 sm:col-span-2">
                  <div className="p-2.5 bg-white rounded-lg text-primary border border-border shadow-2xs">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                      Full Address
                    </span>
                    <p className="text-base font-medium text-charcoal mt-0.5">
                      {society.address}
                    </p>
                  </div>
                </div>

                {/* Registration Number */}
                <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-100 flex items-start space-x-3.5">
                  <div className="p-2.5 bg-white rounded-lg text-primary border border-border shadow-2xs">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                      Govt. Registration Number
                    </span>
                    <p className="text-base font-mono font-medium text-charcoal mt-0.5">
                      {society.registrationNumber || <span className="italic text-slate-400 font-sans">Not Specified</span>}
                    </p>
                  </div>
                </div>

                {/* Created Date */}
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
    </div>
  );
};

export default SocietyManagement;
