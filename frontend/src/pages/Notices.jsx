import { useState, useEffect } from 'react';
import { 
  Bell, 
  Megaphone, 
  Pin, 
  Trash2, 
  Plus, 
  X, 
  AlertCircle, 
  CheckCircle, 
  Calendar, 
  AlertTriangle, 
  User, 
  RefreshCw, 
  Sparkles,
  RotateCw
} from 'lucide-react';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';

const Notices = () => {
  const { user } = useAuth();
  const currentUserId = user?.id || user?._id;

  const canManageNotices =
    user?.role === 'SocietyOwner' ||
    (user?.role === 'Committee' && user?.permissions?.includes('manageNotices'));

  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [notification, setNotification] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Create Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    title: '',
    body: '',
    isPriority: false,
  });
  const [createFormErrors, setCreateFormErrors] = useState({});
  const [createSubmitLoading, setCreateSubmitLoading] = useState(false);
  const [createSubmitError, setCreateSubmitError] = useState('');

  // Delete Confirmation Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [noticeToDelete, setNoticeToDelete] = useState(null);
  const [deleteSubmitLoading, setDeleteSubmitLoading] = useState(false);

  // Fetch all notices from API
  const fetchNotices = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axiosInstance.get('/notices');
      setNotices(response.data.notices || []);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to load community notices.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotices();
  }, []);

  // Helper to check if current user pinned the notice
  const isNoticePinned = (notice) => {
    if (!notice?.pinnedBy || !Array.isArray(notice.pinnedBy)) return false;
    return notice.pinnedBy.some(
      (uid) => String(uid?._id || uid?.id || uid) === String(currentUserId)
    );
  };

  // Pin / Bookmark Toggle
  const handleTogglePin = async (noticeId) => {
    setActionLoadingId(noticeId);
    try {
      const response = await axiosInstance.patch(`/notices/${noticeId}/pin`);
      const { isPinned, notice: updatedNotice } = response.data;
      
      setNotices((prev) =>
        prev.map((n) => (n._id === noticeId ? (updatedNotice || {
          ...n,
          pinnedBy: isPinned
            ? [...(n.pinnedBy || []), currentUserId]
            : (n.pinnedBy || []).filter((uid) => String(uid?._id || uid?.id || uid) !== String(currentUserId)),
        }) : n))
      );

      setNotification({
        type: 'success',
        message: isPinned ? 'Notice pinned to your board!' : 'Notice unpinned.',
      });
    } catch (err) {
      console.error(err);
      setNotification({
        type: 'error',
        message: err.response?.data?.message || 'Failed to toggle notice pin status.',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Open Delete Confirmation
  const handleOpenDeleteModal = (notice) => {
    setNoticeToDelete(notice);
    setIsDeleteModalOpen(true);
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!noticeToDelete) return;
    setDeleteSubmitLoading(true);
    try {
      await axiosInstance.delete(`/notices/${noticeToDelete._id}`);
      setNotices((prev) => prev.filter((n) => n._id !== noticeToDelete._id));
      setIsDeleteModalOpen(false);
      setNotification({
        type: 'success',
        message: `Notice "${noticeToDelete.title}" removed successfully.`,
      });
    } catch (err) {
      console.error(err);
      setNotification({
        type: 'error',
        message: err.response?.data?.message || 'Failed to delete notice.',
      });
    } finally {
      setDeleteSubmitLoading(false);
      setNoticeToDelete(null);
    }
  };

  // Submit New Notice
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreateSubmitError('');

    const errors = {};
    if (!createFormData.title.trim()) errors.title = 'Title is required';
    if (!createFormData.body.trim()) errors.body = 'Notice content is required';
    setCreateFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setCreateSubmitLoading(true);
    try {
      const payload = {
        title: createFormData.title.trim(),
        body: createFormData.body.trim(),
        isPriority: Boolean(createFormData.isPriority),
      };

      await axiosInstance.post('/notices', payload);
      setIsCreateModalOpen(false);
      setCreateFormData({ title: '', body: '', isPriority: false });
      setNotification({
        type: 'success',
        message: 'Notice broadcasted successfully to all residents!',
      });
      fetchNotices();
    } catch (err) {
      console.error(err);
      setCreateSubmitError(err.response?.data?.message || 'Failed to broadcast notice.');
    } finally {
      setCreateSubmitLoading(false);
    }
  };

  // Calculate Metrics
  const totalCount = notices.length;
  const priorityCount = notices.filter((n) => n.isPriority).length;
  const pinnedCount = notices.filter((n) => isNoticePinned(n)).length;

  // Filter notices for listing
  const filteredNotices = notices.filter((notice) => {
    if (activeTab === 'All') return true;
    if (activeTab === 'Priority') return notice.isPriority;
    if (activeTab === 'Pinned') return isNoticePinned(notice);
    if (activeTab === 'General') return !notice.isPriority;
    return true;
  });

  // Top Priority Notices for Spotlight Banner
  const priorityNotices = notices.filter((n) => n.isPriority);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-6">
        <div className="text-left">
          <div className="flex items-center space-x-2.5">
            <h1 className="text-3xl font-bold text-charcoal tracking-tight">Notice Board</h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-subtle text-primary border border-primary/20">
              <Megaphone className="w-3.5 h-3.5" />
              <span>Announcements</span>
            </span>
          </div>
          <p className="text-sm text-slate mt-1">
            Official society circulars, maintenance schedules, and urgent community alerts.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {canManageNotices && (
            <button
              onClick={() => {
                setCreateFormData({ title: '', body: '', isPriority: false });
                setCreateFormErrors({});
                setCreateSubmitError('');
                setIsCreateModalOpen(true);
              }}
              className="h-10 px-4 bg-[#0F172A] hover:bg-[#1E293B] active:scale-98 text-[#D4AF37] font-semibold text-xs sm:text-sm rounded-lg transition-all flex items-center gap-2 shadow-sm border border-[#D4AF37]/30 cursor-pointer"
              title="Broadcast New Notice"
            >
              <Plus className="w-4 h-4" />
              <span>Post Notice</span>
            </button>
          )}

          <button
            onClick={fetchNotices}
            disabled={loading}
            className="h-10 px-4 bg-white border border-border hover:bg-slate-50 text-slate font-medium text-xs rounded-lg transition-colors flex items-center gap-2 shadow-xs cursor-pointer active:scale-98"
            title="Refresh Notices"
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
            onClick={fetchNotices}
            className="text-sm text-error underline hover:text-red-700 font-semibold cursor-pointer ml-3"
          >
            Retry
          </button>
        </div>
      )}

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Total Notices */}
        <div className="bg-white border border-border rounded-2xl p-5 sm:p-6 flex items-center justify-between shadow-xs hover:shadow-md transition-all duration-200">
          <div className="space-y-1 text-left">
            <span className="text-xs font-semibold text-slate uppercase tracking-wider block">
              Total Circulars
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-charcoal">
              {totalCount}
            </h2>
            <p className="text-slate text-xs font-medium">
              Published announcements
            </p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-200/50 shadow-2xs">
            <Megaphone className="h-6 w-6" />
          </div>
        </div>

        {/* Priority Alerts */}
        <div className="bg-white border border-border rounded-2xl p-5 sm:p-6 flex items-center justify-between shadow-xs hover:shadow-md transition-all duration-200">
          <div className="space-y-1 text-left">
            <span className="text-xs font-semibold text-slate uppercase tracking-wider block">
              Priority Alerts
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-charcoal">
              {priorityCount}
            </h2>
            <p className="text-amber-700 text-xs font-semibold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>High-importance notices</span>
            </p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200 shadow-2xs">
            <AlertTriangle className="h-6 w-6" />
          </div>
        </div>

        {/* My Pinned */}
        <div className="bg-white border border-border rounded-2xl p-5 sm:p-6 flex items-center justify-between shadow-xs hover:shadow-md transition-all duration-200">
          <div className="space-y-1 text-left">
            <span className="text-xs font-semibold text-slate uppercase tracking-wider block">
              My Saved
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-charcoal">
              {pinnedCount}
            </h2>
            <p className="text-emerald-700 text-xs font-semibold flex items-center gap-1">
              <Pin className="w-3.5 h-3.5" />
              <span>Pinned by you</span>
            </p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200 shadow-2xs">
            <Pin className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Priority Spotlight Banner Section (if priority notices exist) */}
      {priorityNotices.length > 0 && activeTab === 'All' && (
        <div className="space-y-3">
          <div className="flex items-center space-x-2 text-left">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <h2 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
              Priority Community Alerts ({priorityNotices.length})
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-3.5">
            {priorityNotices.map((pNotice) => {
              const isPinned = isNoticePinned(pNotice);
              const formattedDate = pNotice.createdAt
                ? new Date(pNotice.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })
                : 'N/A';
              const author = pNotice.createdBy?.name || 'Society Admin';

              return (
                <div
                  key={pNotice._id}
                  className="bg-gradient-to-r from-amber-50/90 via-amber-50/50 to-white border-2 border-amber-300/80 rounded-2xl p-5 sm:p-6 shadow-sm relative overflow-hidden text-left"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase tracking-wider bg-amber-500 text-slate-900 shadow-xs">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Priority Alert</span>
                        </span>
                        <h3 className="text-lg font-bold text-charcoal">{pNotice.title}</h3>
                      </div>

                      <p className="text-slate-800 text-sm leading-relaxed whitespace-pre-line pt-1">
                        {pNotice.body}
                      </p>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-600 text-xs pt-2">
                        <span className="flex items-center gap-1 font-semibold text-charcoal">
                          <User className="w-3.5 h-3.5 text-amber-700" />
                          <span>{author}</span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formattedDate}</span>
                        </span>
                      </div>
                    </div>

                    {/* Actions: Pin & Delete */}
                    <div className="flex items-center space-x-2 self-end sm:self-start shrink-0">
                      <button
                        onClick={() => handleTogglePin(pNotice._id)}
                        disabled={actionLoadingId === pNotice._id}
                        className={`p-2 rounded-lg border transition-all cursor-pointer ${
                          isPinned
                            ? 'bg-amber-500 text-slate-900 border-amber-600 shadow-xs'
                            : 'bg-white text-slate hover:text-charcoal border-amber-200 hover:bg-amber-100/50'
                        }`}
                        title={isPinned ? 'Unpin from your board' : 'Pin to your board'}
                      >
                        <Pin className={`w-4 h-4 ${isPinned ? 'fill-slate-900' : ''}`} />
                      </button>

                      {canManageNotices && (
                        <button
                          onClick={() => handleOpenDeleteModal(pNotice)}
                          className="p-2 rounded-lg border border-amber-200 bg-white text-error hover:bg-red-50 hover:border-red-200 transition-colors cursor-pointer"
                          title="Delete Notice"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex border-b border-border pb-1">
        <div className="flex space-x-1.5 p-1 bg-slate-100/70 rounded-xl border border-border/40">
          {['All', 'Priority', 'Pinned', 'General'].map((tab) => {
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

      {/* Notices List */}
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
      ) : filteredNotices.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-border shadow-xs">
          <Bell className="h-12 w-12 text-slate/30 mx-auto mb-3" />
          <h3 className="text-charcoal font-bold text-base">No notices found</h3>
          <p className="text-slate text-xs mt-1 max-w-sm mx-auto">
            There are no circulars matching the '{activeTab}' filter category.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredNotices.map((notice) => {
            const isPinned = isNoticePinned(notice);
            const formattedDate = notice.createdAt
              ? new Date(notice.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'N/A';
            const author = notice.createdBy?.name || 'Society Admin';

            return (
              <div
                key={notice._id}
                className={`bg-white border rounded-2xl p-5 sm:p-6 shadow-xs hover:shadow-md transition-all duration-200 text-left relative ${
                  notice.isPriority
                    ? 'border-l-4 border-l-amber-500 bg-amber-50/20'
                    : isPinned
                      ? 'border-l-4 border-l-primary bg-primary-subtle/10'
                      : 'border-l-4 border-l-slate-300'
                } border-border`}
              >
                {/* Top Row */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-bold text-charcoal">{notice.title}</h3>
                      
                      {notice.isPriority ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Priority</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                          General
                        </span>
                      )}

                      {isPinned && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary-subtle text-primary border border-primary/20">
                          <Pin className="w-3 h-3 fill-primary" />
                          <span>Pinned</span>
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate text-xs">
                      <span className="flex items-center gap-1 font-medium text-charcoal">
                        <User className="w-3.5 h-3.5 text-primary" />
                        <span>{author}</span>
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formattedDate}</span>
                      </span>
                    </div>
                  </div>

                  {/* Actions: Pin & Delete */}
                  <div className="flex items-center space-x-2 self-start shrink-0">
                    <button
                      onClick={() => handleTogglePin(notice._id)}
                      disabled={actionLoadingId === notice._id}
                      className={`h-9 px-3 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
                        isPinned
                          ? 'bg-[#0F172A] text-[#D4AF37] border-[#0F172A] shadow-xs'
                          : 'bg-white hover:bg-slate-50 text-charcoal border-border hover:border-slate-300'
                      }`}
                      title={isPinned ? 'Unpin this notice' : 'Pin notice to top'}
                    >
                      <Pin className={`w-3.5 h-3.5 ${isPinned ? 'fill-[#D4AF37]' : 'text-slate'}`} />
                      <span>{isPinned ? 'Pinned' : 'Pin'}</span>
                    </button>

                    {canManageNotices && (
                      <button
                        onClick={() => handleOpenDeleteModal(notice)}
                        className="h-9 w-9 rounded-lg border border-border hover:border-red-200 hover:bg-red-50 text-slate hover:text-error transition-colors flex items-center justify-center cursor-pointer"
                        title="Delete Notice"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Body Content */}
                <div className="mt-3.5 pt-3 border-t border-slate-100">
                  <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-line">
                    {notice.body}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Post Notice Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-charcoal/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-lg border border-border w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150 text-left">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-primary-subtle text-primary rounded-lg">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-charcoal">Broadcast Society Notice</h3>
                  <p className="text-xs text-slate">Publish an official circular to all society residents.</p>
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
                  <label htmlFor="notice-title" className="block text-sm font-medium text-charcoal mb-1">
                    Notice Title <span className="text-error">*</span>
                  </label>
                  <input
                    id="notice-title"
                    type="text"
                    placeholder="e.g. Annual General Body Meeting (AGM) Scheduled"
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

                {/* Body */}
                <div>
                  <label htmlFor="notice-body" className="block text-sm font-medium text-charcoal mb-1">
                    Notice Content <span className="text-error">*</span>
                  </label>
                  <textarea
                    id="notice-body"
                    rows={5}
                    placeholder="Write the full details of the circular, dates, agendas, instructions for residents..."
                    value={createFormData.body}
                    onChange={(e) => {
                      setCreateFormData({ ...createFormData, body: e.target.value });
                      if (createFormErrors.body) {
                        setCreateFormErrors({ ...createFormErrors, body: '' });
                      }
                    }}
                    disabled={createSubmitLoading}
                    className={`w-full p-3.5 bg-white border rounded-lg text-charcoal placeholder-slate/40 focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 focus:border-[#0F172A] transition-colors ${
                      createFormErrors.body ? 'border-error' : 'border-border'
                    }`}
                  />
                  {createFormErrors.body && (
                    <p className="mt-1 text-xs text-error font-medium">{createFormErrors.body}</p>
                  )}
                </div>

                {/* Priority Checkbox Card */}
                <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl">
                  <label className="flex items-start space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={createFormData.isPriority}
                      onChange={(e) =>
                        setCreateFormData({ ...createFormData, isPriority: e.target.checked })
                      }
                      disabled={createSubmitLoading}
                      className="mt-0.5 h-4 w-4 rounded text-[#0F172A] focus:ring-[#0F172A] border-amber-300 cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        <span>Mark as Priority Community Alert</span>
                      </span>
                      <span className="text-[11px] text-amber-800/80 block mt-0.5">
                        Priority notices appear highlighted in the top spotlight banner and stay pinned for all residents.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 bg-slate-50 border-t border-border flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
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
                      <span>Broadcasting...</span>
                    </>
                  ) : (
                    <>
                      <Megaphone className="w-4 h-4" />
                      <span>Post Notice</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-charcoal/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-lg border border-border w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150 text-left">
            <div className="p-6">
              <div className="flex items-center space-x-3 text-error mb-4">
                <div className="p-2 bg-red-50 rounded-full">
                  <Trash2 className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-charcoal">Delete Notice</h3>
              </div>
              
              <p className="text-slate text-sm leading-relaxed">
                Are you sure you want to delete notice <strong className="text-charcoal">"{noticeToDelete?.title}"</strong>?
              </p>
              <p className="text-xs text-slate-500 mt-2">
                This notice will be permanently removed from all residents' boards.
              </p>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-border flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setNoticeToDelete(null);
                }}
                className="bg-white border border-border text-charcoal hover:bg-slate-100 font-medium px-4 py-2.5 text-sm rounded-lg transition-colors cursor-pointer h-11"
                disabled={deleteSubmitLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="bg-error hover:bg-red-700 text-white font-medium px-5 py-2.5 text-sm rounded-lg transition-colors cursor-pointer h-11 flex items-center space-x-2"
                disabled={deleteSubmitLoading}
              >
                {deleteSubmitLoading ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin text-white" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Yes, Delete Notice</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notices;
