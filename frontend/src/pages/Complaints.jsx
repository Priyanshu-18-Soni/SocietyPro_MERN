import { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  ThumbsUp, 
  CheckCircle, 
  RotateCcw, 
  Plus, 
  X, 
  AlertCircle, 
  Clock, 
  RefreshCw, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  Image as ImageIcon,
  Building,
  User,
  ShieldCheck
} from 'lucide-react';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';

const Complaints = () => {
  const { user } = useAuth();
  const currentUserId = user?.id || user?._id;
  const currentUserFlat = user?.unitNumber || user?.flatNo || '';

  const canResolveComplaints =
    user?.role === 'SocietyOwner' ||
    (user?.role === 'Committee' && user?.permissions?.includes('resolveComplaints'));

  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [notification, setNotification] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  // Create Complaint Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    title: '',
    description: '',
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState(null);
  const [fileError, setFileError] = useState('');
  const [createFormErrors, setCreateFormErrors] = useState({});
  const [createSubmitLoading, setCreateSubmitLoading] = useState(false);
  const [createSubmitError, setCreateSubmitError] = useState('');

  // Helper to resolve image URL with backward compatibility
  const getImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    const apiBase = import.meta.env.VITE_API_BASE_URL;
    if (apiBase) {
      const host = apiBase.replace(/\/api\/?$/, '');
      return `${host}${url.startsWith('/') ? '' : '/'}${url}`;
    }
    return url;
  };

  // Revoke object URL on unmount or file change to prevent memory leaks
  useEffect(() => {
    return () => {
      if (filePreviewUrl) {
        URL.revokeObjectURL(filePreviewUrl);
      }
    };
  }, [filePreviewUrl]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    setFileError('');

    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
      setFilePreviewUrl(null);
    }

    if (!file) {
      setSelectedFile(null);
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setFileError('Invalid file type. Only JPEG, PNG, and WebP images are allowed.');
      setSelectedFile(null);
      e.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFileError('File size exceeds the maximum limit of 5MB.');
      setSelectedFile(null);
      e.target.value = '';
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setFilePreviewUrl(objectUrl);
  };

  const handleClearFile = () => {
    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
    }
    setSelectedFile(null);
    setFilePreviewUrl(null);
    setFileError('');
  };

  const resetCreateForm = () => {
    setCreateFormData({ title: '', description: '' });
    handleClearFile();
    setCreateFormErrors({});
    setCreateSubmitError('');
  };

  // Fetch Complaints based on activeTab
  const fetchComplaints = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (activeTab === 'Open') params.status = 'open';
      else if (activeTab === 'In Progress') params.status = 'in_progress';
      else if (activeTab === 'Resolved') params.status = 'resolved';
      else if (activeTab === 'Closed') params.status = 'closed';

      const response = await axiosInstance.get('/complaints', { params });
      setComplaints(response.data.complaints || []);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to load complaints.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Upvote / Facing Same Issue
  const handleUpvote = async (complaintId) => {
    setActionLoadingId(complaintId);
    try {
      const response = await axiosInstance.patch(`/complaints/${complaintId}/upvote`);
      const updated = response.data.complaint;
      setComplaints((prev) =>
        prev.map((c) => (c._id === complaintId ? updated : c))
      );
      setNotification({
        type: 'success',
        message: response.data.message || 'Your vote has been updated.',
      });
    } catch (err) {
      console.error(err);
      setNotification({
        type: 'error',
        message: err.response?.data?.message || 'Failed to upvote complaint.',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Status Change (Admin / Committee with resolveComplaints)
  const handleUpdateStatus = async (complaintId, newStatus) => {
    setActionLoadingId(complaintId);
    try {
      const response = await axiosInstance.patch(`/complaints/${complaintId}/status`, { status: newStatus });
      const updated = response.data.complaint;
      setComplaints((prev) =>
        prev.map((c) => (c._id === complaintId ? updated : c))
      );
      setNotification({
        type: 'success',
        message: `Complaint status changed to "${newStatus.replace('_', ' ')}".`,
      });
    } catch (err) {
      console.error(err);
      setNotification({
        type: 'error',
        message: err.response?.data?.message || 'Failed to update complaint status.',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Creator Verdict (Confirm Resolution or Reopen Ticket)
  const handleVerdict = async (complaintId, verdict) => {
    setActionLoadingId(complaintId);
    try {
      const response = await axiosInstance.patch(`/complaints/${complaintId}/verdict`, { verdict });
      const updated = response.data.complaint;
      setComplaints((prev) =>
        prev.map((c) => (c._id === complaintId ? updated : c))
      );
      setNotification({
        type: 'success',
        message: verdict === 'confirmed' 
          ? 'Resolution confirmed! The grievance is now marked as closed.' 
          : 'Grievance ticket reopened for resolution.',
      });
    } catch (err) {
      console.error(err);
      setNotification({
        type: 'error',
        message: err.response?.data?.message || 'Failed to submit verdict.',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Submit New Complaint via FormData
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreateSubmitError('');

    if (fileError) return;

    const errors = {};
    if (!createFormData.title.trim()) errors.title = 'Title is required';
    if (!createFormData.description.trim()) errors.description = 'Description is required';
    setCreateFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setCreateSubmitLoading(true);
    try {
      const formData = new FormData();
      formData.append('title', createFormData.title.trim());
      formData.append('description', createFormData.description.trim());
      if (currentUserFlat) {
        formData.append('flatNo', currentUserFlat);
      }
      if (selectedFile) {
        formData.append('image', selectedFile);
      }

      await axiosInstance.post('/complaints', formData);
      setIsCreateModalOpen(false);
      resetCreateForm();
      setNotification({
        type: 'success',
        message: 'Grievance ticket filed successfully!',
      });
      fetchComplaints();
    } catch (err) {
      console.error(err);
      setCreateSubmitError(err.response?.data?.message || 'Failed to file complaint.');
    } finally {
      setCreateSubmitLoading(false);
    }
  };

  // Helper for Status Badge Styling
  const renderStatusBadge = (status) => {
    switch (status) {
      case 'open':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-600 animate-pulse" />
            <span>Open</span>
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5" />
            <span>In Progress</span>
          </span>
        );
      case 'resolved':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Resolved</span>
          </span>
        );
      case 'closed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Closed</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-slate-50 text-slate border border-border">
            {status}
          </span>
        );
    }
  };

  // Summary counts
  const totalCount = complaints.length;
  const openCount = complaints.filter(c => c.status === 'open' || c.status === 'in_progress').length;
  const resolvedCount = complaints.filter(c => c.status === 'resolved' || c.status === 'closed').length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-6">
        <div className="text-left">
          <div className="flex items-center space-x-2.5">
            <h1 className="text-3xl font-bold text-charcoal tracking-tight">Complaints & Grievances</h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-subtle text-primary border border-primary/20">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Redressal</span>
            </span>
          </div>
          <p className="text-sm text-slate mt-1">
            Report community concerns, upvote common issues across flats, and track grievance resolution.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => {
              resetCreateForm();
              setIsCreateModalOpen(true);
            }}
            className="h-10 px-4 bg-[#0F172A] hover:bg-[#1E293B] active:scale-98 text-[#D4AF37] font-semibold text-xs sm:text-sm rounded-lg transition-all flex items-center gap-2 shadow-sm border border-[#D4AF37]/30 cursor-pointer"
            title="File a New Complaint"
          >
            <Plus className="w-4 h-4" />
            <span>File Complaint</span>
          </button>

          <button
            onClick={fetchComplaints}
            disabled={loading}
            className="h-10 px-4 bg-white border border-border hover:bg-slate-50 text-slate font-medium text-xs rounded-lg transition-colors flex items-center gap-2 shadow-xs cursor-pointer active:scale-98"
            title="Refresh Complaints"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {notification && (
        <div 
          className={`p-4 rounded-xl border flex items-start space-x-3 transition-all duration-300 shadow-sm ${
            notification.type === 'success' 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
              : 'bg-red-50 border-error/20 text-error'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-5 w-5 text-error shrink-0 mt-0.5" />
          )}
          <div className="flex-1 text-sm font-medium text-left">{notification.message}</div>
          <button 
            onClick={() => setNotification(null)}
            className="text-xs font-bold hover:underline shrink-0 opacity-80 hover:opacity-100 cursor-pointer"
          >
            Dismiss
          </button>
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
            onClick={fetchComplaints}
            className="text-sm text-error underline hover:text-red-700 font-semibold cursor-pointer ml-3"
          >
            Retry
          </button>
        </div>
      )}

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Total Filed */}
        <div className="bg-white border border-border rounded-2xl p-5 sm:p-6 flex items-center justify-between shadow-xs hover:shadow-md transition-all duration-200">
          <div className="space-y-1 text-left">
            <span className="text-xs font-semibold text-slate uppercase tracking-wider block">
              Total In Roster
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-charcoal">
              {totalCount}
            </h2>
            <p className="text-slate text-xs font-medium">
              Across current view
            </p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-200/50 shadow-2xs">
            <MessageSquare className="h-6 w-6" />
          </div>
        </div>

        {/* Action Required / Active */}
        <div className="bg-white border border-border rounded-2xl p-5 sm:p-6 flex items-center justify-between shadow-xs hover:shadow-md transition-all duration-200">
          <div className="space-y-1 text-left">
            <span className="text-xs font-semibold text-slate uppercase tracking-wider block">
              Action Required
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-charcoal">
              {openCount}
            </h2>
            <p className="text-amber-700 text-xs font-semibold flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>Open & In Progress</span>
            </p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200 shadow-2xs">
            <AlertTriangle className="h-6 w-6" />
          </div>
        </div>

        {/* Resolved / Closed */}
        <div className="bg-white border border-border rounded-2xl p-5 sm:p-6 flex items-center justify-between shadow-xs hover:shadow-md transition-all duration-200">
          <div className="space-y-1 text-left">
            <span className="text-xs font-semibold text-slate uppercase tracking-wider block">
              Redressed
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-charcoal">
              {resolvedCount}
            </h2>
            <p className="text-emerald-700 text-xs font-semibold flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Resolved or Closed</span>
            </p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200 shadow-2xs">
            <CheckCircle className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex border-b border-border pb-1">
        <div className="flex space-x-1.5 p-1 bg-slate-100/70 rounded-xl border border-border/40">
          {['All', 'Open', 'In Progress', 'Resolved', 'Closed'].map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#0F172A] text-[#D4AF37] shadow-sm font-bold'
                    : 'text-slate hover:text-charcoal hover:bg-white/60'
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>
      </div>

      {/* Complaints List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="p-5 bg-white border border-border rounded-2xl shadow-xs animate-pulse flex flex-col space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="h-4 bg-slate-100 rounded w-48"></div>
                <div className="h-6 bg-slate-100 rounded-full w-20"></div>
              </div>
              <div className="h-3 bg-slate-100 rounded w-full"></div>
              <div className="h-3 bg-slate-100 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      ) : complaints.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-border shadow-xs">
          <MessageSquare className="h-12 w-12 text-slate/30 mx-auto mb-3" />
          <h3 className="text-charcoal font-bold text-base">No complaints found</h3>
          <p className="text-slate text-xs mt-1 max-w-sm mx-auto">
            There are no grievance records under the '{activeTab}' category.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {complaints.map((complaint) => {
            const creatorId = complaint.createdBy?._id || complaint.createdBy?.id || complaint.createdBy;
            const isCreator = String(creatorId) === String(currentUserId);
            const creatorName = complaint.createdBy?.name || 'Resident';
            const flatLabel = complaint.flatNo || complaint.createdBy?.unitNumber || 'N/A';
            const isProcessing = actionLoadingId === complaint._id;
            
            const affectedFlatsList = complaint.affectedFlats || [];
            const upvotedByList = complaint.upvotedBy || [];
            const hasUpvoted =
              upvotedByList.some((uid) => String(uid?._id || uid?.id || uid) === String(currentUserId)) ||
              (currentUserFlat && affectedFlatsList.includes(currentUserFlat));
            const upvoteDisplayCount =
              complaint.upvoteCount !== undefined && complaint.upvoteCount !== null
                ? complaint.upvoteCount
                : affectedFlatsList.length;
            const isExpanded = expandedId === complaint._id;
            const formattedDate = complaint.createdAt
              ? new Date(complaint.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'N/A';

            return (
              <div
                key={complaint._id}
                className={`bg-white border rounded-2xl p-5 sm:p-6 shadow-xs hover:shadow-md transition-all duration-200 text-left relative ${
                  complaint.status === 'open' 
                    ? 'border-l-4 border-l-rose-500' 
                    : complaint.status === 'in_progress'
                      ? 'border-l-4 border-l-amber-500'
                      : complaint.status === 'resolved'
                        ? 'border-l-4 border-l-emerald-500'
                        : 'border-l-4 border-l-slate-400'
                } border-border`}
              >
                {/* Top Bar: Title, Flat, Status */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-bold text-charcoal">{complaint.title}</h3>
                      {renderStatusBadge(complaint.status)}
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-charcoal border border-slate-200">
                        <Building className="w-3 h-3 text-slate-500" />
                        <span>Unit {flatLabel}</span>
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate text-xs">
                      <span className="flex items-center gap-1 text-charcoal font-medium">
                        <User className="w-3.5 h-3.5 text-primary" />
                        <span>{creatorName} {isCreator && <strong className="text-primary font-bold">(You)</strong>}</span>
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formattedDate}</span>
                      </span>
                      {complaint.verdict && complaint.verdict !== 'pending' && (
                        <>
                          <span>•</span>
                          <span className="font-semibold text-slate-700 capitalize">
                            Verdict: {complaint.verdict}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Upvote / Facing Same Issue Button */}
                  <div className="self-start sm:self-auto shrink-0 mt-2 sm:mt-0">
                    <button
                      onClick={() => handleUpvote(complaint._id)}
                      disabled={isProcessing}
                      className={`h-9 px-3.5 rounded-lg text-xs font-semibold flex items-center gap-2 border transition-all cursor-pointer active:scale-95 ${
                        hasUpvoted
                          ? 'bg-blue-50 text-blue-700 border-blue-300 font-bold'
                          : 'bg-white hover:bg-slate-50 text-charcoal border-border hover:border-slate-300'
                      } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                      title={hasUpvoted ? 'Click to remove upvote' : 'Click to report your flat also faces this'}
                    >
                      <ThumbsUp className={`w-3.5 h-3.5 ${hasUpvoted ? 'fill-blue-700 text-blue-700' : 'text-slate'}`} />
                      <span>{hasUpvoted ? 'Facing Issue' : 'Facing Same Issue'}</span>
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                        {upvoteDisplayCount}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Description */}
                <div className="mt-3">
                  <p className={`text-slate-700 text-sm leading-relaxed ${!isExpanded ? 'line-clamp-3' : ''}`}>
                    {complaint.description}
                  </p>
                  {complaint.description.length > 200 && (
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : complaint._id)}
                      className="text-xs font-semibold text-primary hover:underline mt-1 cursor-pointer"
                    >
                      {isExpanded ? 'Show Less' : 'Read Full Details'}
                    </button>
                  )}
                </div>

                {/* Optional Attached Image Thumbnail */}
                {complaint.imageUrl && (
                  <div className="mt-3 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setPreviewImage(getImageUrl(complaint.imageUrl))}
                      className="group relative h-16 w-16 sm:h-20 sm:w-20 rounded-lg overflow-hidden border border-border bg-slate-100 shrink-0 cursor-pointer shadow-2xs hover:shadow-xs transition-shadow"
                      title="Click to view full image"
                    >
                      <img
                        src={getImageUrl(complaint.imageUrl)}
                        alt="Complaint thumbnail"
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://via.placeholder.com/150?text=Preview';
                        }}
                      />
                      <div className="absolute inset-0 bg-charcoal/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <ImageIcon className="w-5 h-5 text-white drop-shadow-md" />
                      </div>
                    </button>
                    <div className="text-left">
                      <button
                        type="button"
                        onClick={() => setPreviewImage(getImageUrl(complaint.imageUrl))}
                        className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span>View Photo Attachment</span>
                      </button>
                      <p className="text-[11px] text-slate-400 mt-0.5">Click thumbnail to enlarge</p>
                    </div>
                  </div>
                )}

                {/* Affected Flats details if multiple */}
                {affectedFlatsList.length > 1 && (
                  <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                    <span className="font-semibold text-charcoal">Affected Units ({affectedFlatsList.length}):</span>
                    {affectedFlatsList.map((flat, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-mono font-medium">
                        {flat}
                      </span>
                    ))}
                  </div>
                )}

                {/* Action Controls Section */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Left: Admin Status Changer */}
                  {canResolveComplaints ? (
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-semibold text-slate flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                        <span>Manage Status:</span>
                      </span>
                      <select
                        value={complaint.status}
                        onChange={(e) => handleUpdateStatus(complaint._id, e.target.value)}
                        disabled={isProcessing}
                        className="h-8 px-2.5 text-xs font-semibold rounded-lg bg-white border border-border text-charcoal focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 cursor-pointer"
                      >
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                    </div>
                  ) : (
                    <div></div>
                  )}

                  {/* Right: Creator Verdict Buttons (When status is "resolved") */}
                  {isCreator && complaint.status === 'resolved' && (
                    <div className="flex items-center space-x-2.5">
                      <button
                        onClick={() => handleVerdict(complaint._id, 'confirmed')}
                        disabled={isProcessing}
                        className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Confirm Resolution</span>
                      </button>

                      <button
                        onClick={() => handleVerdict(complaint._id, 'reopened')}
                        disabled={isProcessing}
                        className="h-8 px-3 bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 active:scale-95 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reopen Ticket</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* File Complaint Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-charcoal/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-lg border border-border w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150 text-left">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-primary-subtle text-primary rounded-lg">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-charcoal">File Grievance Ticket</h3>
                  <p className="text-xs text-slate">Report a maintenance or community issue in the society.</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate hover:text-charcoal cursor-pointer p-1 rounded-lg hover:bg-slate-100 transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateSubmit}>
              <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                {createSubmitError && (
                  <div className="p-3 bg-red-50 border border-error/20 text-error rounded-lg text-sm font-medium flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{createSubmitError}</span>
                  </div>
                )}

                {/* Title */}
                <div>
                  <label htmlFor="complaint-title" className="block text-sm font-medium text-charcoal mb-1">
                    Grievance Title <span className="text-error">*</span>
                  </label>
                  <input
                    id="complaint-title"
                    type="text"
                    placeholder="e.g. Water leakage in Block B corridor"
                    value={createFormData.title}
                    onChange={(e) => {
                      setCreateFormData({ ...createFormData, title: e.target.value });
                      if (createFormErrors.title) {
                        setCreateFormErrors({ ...createFormErrors, title: '' });
                      }
                    }}
                    disabled={createSubmitLoading}
                    className={`w-full h-11 px-3.5 py-2.5 bg-white border rounded-lg text-charcoal placeholder-slate/40 focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 focus:border-[#0F172A] transition-colors ${
                      createFormErrors.title ? 'border-error' : 'border-border'
                    }`}
                  />
                  {createFormErrors.title && (
                    <p className="mt-1 text-xs text-error font-medium">{createFormErrors.title}</p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label htmlFor="complaint-description" className="block text-sm font-medium text-charcoal mb-1">
                    Detailed Description <span className="text-error">*</span>
                  </label>
                  <textarea
                    id="complaint-description"
                    rows={4}
                    placeholder="Describe the issue in detail, exact location, urgency, and any immediate hazard..."
                    value={createFormData.description}
                    onChange={(e) => {
                      setCreateFormData({ ...createFormData, description: e.target.value });
                      if (createFormErrors.description) {
                        setCreateFormErrors({ ...createFormErrors, description: '' });
                      }
                    }}
                    disabled={createSubmitLoading}
                    className={`w-full p-3.5 bg-white border rounded-lg text-charcoal placeholder-slate/40 focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 focus:border-[#0F172A] transition-colors ${
                      createFormErrors.description ? 'border-error' : 'border-border'
                    }`}
                  />
                  {createFormErrors.description && (
                    <p className="mt-1 text-xs text-error font-medium">{createFormErrors.description}</p>
                  )}
                </div>

                {/* Photo Attachment (Optional) */}
                <div>
                  <label htmlFor="complaint-image" className="block text-sm font-medium text-charcoal mb-1">
                    Attach Photo Proof (Optional)
                  </label>

                  {!filePreviewUrl ? (
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-200 border-dashed rounded-lg hover:border-primary/50 transition-colors bg-slate-50/50">
                      <div className="space-y-1 text-center">
                        <ImageIcon className="mx-auto h-8 w-8 text-slate-400" />
                        <div className="flex text-sm text-slate-600 justify-center">
                          <label
                            htmlFor="complaint-image"
                            className="relative cursor-pointer rounded-md font-semibold text-primary hover:text-primary-hover focus-within:outline-none"
                          >
                            <span>Upload an image</span>
                            <input
                              id="complaint-image"
                              name="image"
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              onChange={handleFileChange}
                              disabled={createSubmitLoading}
                              className="sr-only"
                            />
                          </label>
                          <p className="pl-1">or drag and drop</p>
                        </div>
                        <p className="text-xs text-slate-400">PNG, JPG, WebP up to 5MB</p>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 relative rounded-lg border border-border p-2 bg-slate-50 flex items-center gap-3">
                      <img
                        src={filePreviewUrl}
                        alt="Selected preview"
                        className="w-16 h-16 object-cover rounded-md border border-slate-200"
                      />
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-xs font-semibold text-charcoal truncate">{selectedFile?.name}</p>
                        <p className="text-[11px] text-slate-400">
                          {selectedFile?.size ? (selectedFile.size / 1024).toFixed(1) : 0} KB
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleClearFile}
                        disabled={createSubmitLoading}
                        className="p-1.5 rounded-full text-slate-400 hover:text-error hover:bg-red-50 transition-colors cursor-pointer"
                        title="Remove photo"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {fileError && (
                    <p className="mt-1 text-xs text-error font-medium">{fileError}</p>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 bg-slate-50 border-t border-border flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    resetCreateForm();
                  }}
                  disabled={createSubmitLoading}
                  className="bg-white border border-border text-charcoal hover:bg-slate-100 font-medium px-4 py-2.5 text-sm rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSubmitLoading}
                  className="bg-[#0F172A] hover:bg-[#1E293B] text-[#D4AF37] border border-[#D4AF37]/30 font-semibold px-5 py-2.5 text-sm rounded-lg transition-colors cursor-pointer flex items-center space-x-2 shadow-md active:scale-98 disabled:opacity-50"
                >
                  {createSubmitLoading ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-[#D4AF37]" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Submit Grievance</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <div 
          className="fixed inset-0 bg-charcoal/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
          onClick={() => setPreviewImage(null)}
        >
          <div 
            className="bg-white rounded-xl max-w-2xl w-full p-2 overflow-hidden shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-charcoal/60 text-white hover:bg-charcoal transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <img 
              src={previewImage} 
              alt="Complaint attachment preview" 
              className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'https://via.placeholder.com/600x400?text=Image+Load+Failed';
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Complaints;
