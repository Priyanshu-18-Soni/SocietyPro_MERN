import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import { 
  Users, 
  UserPlus, 
  UserCheck, 
  Shield, 
  Edit, 
  Trash2, 
  X, 
  AlertCircle, 
  CheckCircle2, 
  Search, 
  CreditCard
} from 'lucide-react';

const CommitteeManagement = () => {
  const { user } = useAuth();
  const isOwner = user?.role === 'SocietyOwner';

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Add Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addFormData, setAddFormData] = useState({
    name: '',
    email: '',
    password: '',
    customLabel: '',
    permissions: [],
  });
  const [addErrors, setAddErrors] = useState({});
  const [addLoading, setAddLoading] = useState(false);
  const [addApiError, setAddApiError] = useState('');

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState(null);
  const [editFormData, setEditFormData] = useState({
    customLabel: '',
    permissions: [],
  });
  const [editErrors, setEditErrors] = useState({});
  const [editLoading, setEditLoading] = useState(false);
  const [editApiError, setEditApiError] = useState('');

  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Fetch committee members
  const fetchMembers = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axiosInstance.get('/committee');
      setMembers(response.data.committeeMembers || []);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to load committee members.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchMembers();
  }, []);

  // Filter members by search
  const filteredMembers = members.filter((m) => {
    const q = searchQuery.toLowerCase();
    const matchesName = m.name?.toLowerCase().includes(q);
    const matchesEmail = m.email?.toLowerCase().includes(q);
    const matchesLabel = m.customLabel?.toLowerCase().includes(q);
    const matchesPermissions = m.permissions?.some((p) => p.toLowerCase().includes(q));
    return matchesName || matchesEmail || matchesLabel || matchesPermissions;
  });

  // Calculate statistics
  const totalMembers = members.length;
  const withBills = members.filter((m) => m.permissions?.includes('manageBills')).length;
  const withResidents = members.filter((m) => m.permissions?.includes('manageResidents')).length;

  // Notification helper
  const notifySuccess = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  // Open Add Modal
  const handleOpenAdd = () => {
    setAddFormData({
      name: '',
      email: '',
      password: '',
      customLabel: '',
      permissions: [],
    });
    setAddErrors({});
    setAddApiError('');
    setIsAddModalOpen(true);
  };

  // Toggle permission in Add Form
  const handleToggleAddPermission = (perm) => {
    setAddFormData((prev) => {
      const perms = prev.permissions.includes(perm)
        ? prev.permissions.filter((p) => p !== perm)
        : [...prev.permissions, perm];
      return { ...prev, permissions: perms };
    });
  };

  // Validate Add Form
  const validateAddForm = () => {
    const errs = {};
    if (!addFormData.name.trim()) errs.name = 'Full Name is required';
    if (!addFormData.email.trim()) {
      errs.email = 'Email Address is required';
    } else if (!/\S+@\S+\.\S+/.test(addFormData.email)) {
      errs.email = 'Please enter a valid email address';
    }
    if (!addFormData.password) {
      errs.password = 'Password is required';
    } else if (addFormData.password.length < 6) {
      errs.password = 'Password must be at least 6 characters long';
    }
    if (!addFormData.customLabel.trim()) {
      errs.customLabel = 'Title / Custom Label is required (e.g. Treasurer, Secretary)';
    }
    setAddErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Submit Add Form
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setAddApiError('');
    if (!validateAddForm()) return;

    setAddLoading(true);
    try {
      const payload = {
        name: addFormData.name.trim(),
        email: addFormData.email.trim(),
        password: addFormData.password,
        customLabel: addFormData.customLabel.trim(),
        permissions: addFormData.permissions,
      };

      const response = await axiosInstance.post('/committee', payload);
      const createdUser = response.data.user;
      const normalizedUser = {
        ...createdUser,
        _id: createdUser._id || createdUser.id,
      };

      setMembers((prev) => [normalizedUser, ...prev]);
      setIsAddModalOpen(false);
      notifySuccess(`Committee member "${createdUser.name}" added successfully!`);
    } catch (err) {
      console.error(err);
      setAddApiError(err.response?.data?.message || 'Failed to add committee member. Please check inputs.');
    } finally {
      setAddLoading(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (member) => {
    setMemberToEdit(member);
    setEditFormData({
      customLabel: member.customLabel || '',
      permissions: member.permissions ? [...member.permissions] : [],
    });
    setEditErrors({});
    setEditApiError('');
    setIsEditModalOpen(true);
  };

  // Toggle permission in Edit Form
  const handleToggleEditPermission = (perm) => {
    setEditFormData((prev) => {
      const perms = prev.permissions.includes(perm)
        ? prev.permissions.filter((p) => p !== perm)
        : [...prev.permissions, perm];
      return { ...prev, permissions: perms };
    });
  };

  // Submit Edit Form
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!memberToEdit) return;

    if (!editFormData.customLabel.trim()) {
      setEditErrors({ customLabel: 'Title / Custom Label is required' });
      return;
    }

    const memberId = memberToEdit._id || memberToEdit.id;
    if (!memberId) {
      setEditApiError('Invalid member identifier.');
      return;
    }

    setEditLoading(true);
    setEditApiError('');
    try {
      const payload = {
        customLabel: editFormData.customLabel.trim(),
        permissions: editFormData.permissions,
      };

      const response = await axiosInstance.patch(`/committee/${memberId}`, payload);
      const updatedUser = response.data.user;

      setMembers((prev) =>
        prev.map((m) => ((m._id || m.id) === memberId ? { ...m, ...updatedUser, _id: memberId } : m))
      );
      setIsEditModalOpen(false);
      notifySuccess(`Permissions and role updated for "${memberToEdit.name}".`);
    } catch (err) {
      console.error(err);
      setEditApiError(err.response?.data?.message || 'Failed to update committee member.');
    } finally {
      setEditLoading(false);
    }
  };

  // Open Delete Modal
  const handleOpenDelete = (member) => {
    setMemberToDelete(member);
    setIsDeleteModalOpen(true);
  };

  // Confirm Delete
  const handleDeleteConfirm = async () => {
    if (!memberToDelete) return;

    const memberId = memberToDelete._id || memberToDelete.id;
    if (!memberId) return;

    setDeleteLoading(true);
    try {
      await axiosInstance.delete(`/committee/${memberId}`);
      setMembers((prev) => prev.filter((m) => (m._id || m.id) !== memberId));
      setIsDeleteModalOpen(false);
      notifySuccess(`Removed "${memberToDelete.name}" from the committee.`);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to remove committee member.');
    } finally {
      setDeleteLoading(false);
      setMemberToDelete(null);
    }
  };

  if (!isOwner) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-border">
        <AlertCircle className="w-12 h-12 text-error mx-auto mb-3" />
        <h2 className="text-xl font-bold text-charcoal">Access Denied</h2>
        <p className="text-slate text-sm mt-1">Only the Society Owner can manage committee members.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-3xl font-bold text-charcoal tracking-tight">Committee Management</h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
              <Shield className="w-3.5 h-3.5" />
              <span>Council Control</span>
            </span>
          </div>
          <p className="text-sm text-slate mt-1">
            Appoint committee members (Treasurer, Secretary, etc.) and delegate administrative permissions.
          </p>
        </div>

        <div>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="w-full sm:w-auto h-11 bg-[#0F172A] hover:bg-[#1E293B] text-[#D4AF37] border border-[#D4AF37]/30 font-semibold px-5 py-2.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center space-x-2 shadow-md active:scale-98"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Committee Member</span>
          </button>
        </div>
      </div>

      {/* Success Notification Alert */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center space-x-3 shadow-sm animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="text-sm font-semibold">{successMessage}</span>
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
            onClick={fetchMembers}
            className="text-sm text-error underline hover:text-red-700 font-semibold cursor-pointer ml-3"
          >
            Retry
          </button>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-xs border border-border p-6 flex items-center space-x-4">
          <div className="p-3.5 rounded-xl bg-purple-50 text-purple-700">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate uppercase tracking-wider">Total Committee</p>
            <h3 className="text-2xl font-bold text-charcoal">{loading ? '...' : totalMembers}</h3>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-xs border border-border p-6 flex items-center space-x-4">
          <div className="p-3.5 rounded-xl bg-emerald-50 text-emerald-600">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate uppercase tracking-wider">Can Manage Bills</p>
            <h3 className="text-2xl font-bold text-charcoal">{loading ? '...' : withBills}</h3>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-xs border border-border p-6 flex items-center space-x-4">
          <div className="p-3.5 rounded-xl bg-blue-50 text-blue-600">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate uppercase tracking-wider">Can Manage Residents</p>
            <h3 className="text-2xl font-bold text-charcoal">{loading ? '...' : withResidents}</h3>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-border shadow-2xs">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, email, or role title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 bg-slate-50 border border-border rounded-lg text-sm text-charcoal placeholder-slate/40 focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 focus:border-[#0F172A] transition-colors"
          />
        </div>

        <div className="text-xs text-slate font-medium">
          Showing <span className="font-bold text-charcoal">{filteredMembers.length}</span> of {totalMembers} members
        </div>
      </div>

      {/* Committee Member List */}
      {loading ? (
        <div className="bg-white rounded-xl border border-border p-8 space-y-4">
          <div className="h-6 bg-slate-100 rounded w-1/4 animate-pulse"></div>
          <div className="space-y-3 pt-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-slate-50 rounded-lg animate-pulse"></div>
            ))}
          </div>
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-border p-12 text-center shadow-xs">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
            <Users className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-charcoal">No Committee Members Found</h3>
          <p className="text-sm text-slate mt-1.5 max-w-md mx-auto">
            {searchQuery
              ? 'No members matched your search query. Try clearing the search.'
              : 'Empower your society operations by appointing committee members (e.g. Treasurer, Secretary) with delegated management permissions.'}
          </p>
          {!searchQuery && (
            <button
              type="button"
              onClick={handleOpenAdd}
              className="mt-5 inline-flex items-center gap-2 bg-[#0F172A] hover:bg-[#1E293B] text-[#D4AF37] border border-[#D4AF37]/30 font-semibold px-5 py-2.5 rounded-lg transition-colors cursor-pointer shadow-sm active:scale-98 text-sm"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Your First Member</span>
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block bg-white rounded-2xl shadow-xs border border-border overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-border">
                  <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-slate-600">Member</th>
                  <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-slate-600">Role / Title</th>
                  <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-slate-600">Permissions</th>
                  <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-slate-600">Joined</th>
                  <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-slate-600 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredMembers.map((member) => (
                  <tr key={member._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-3.5">
                        <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center font-bold text-sm shrink-0">
                          {member.name ? member.name.charAt(0).toUpperCase() : 'C'}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-charcoal">{member.name}</p>
                          <p className="text-xs text-slate-500">{member.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-6">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-[#0F172A] text-[#D4AF37] border border-[#D4AF37]/30 shadow-2xs">
                        {member.customLabel || 'Committee Member'}
                      </span>
                    </td>

                    <td className="py-4 px-6">
                      <div className="flex flex-wrap gap-1.5">
                        {member.permissions?.includes('manageBills') && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CreditCard className="w-3 h-3" />
                            <span>Manages Bills</span>
                          </span>
                        )}
                        {member.permissions?.includes('manageResidents') && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            <UserCheck className="w-3 h-3" />
                            <span>Manages Residents</span>
                          </span>
                        )}
                        {(!member.permissions || member.permissions.length === 0) && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-500">
                            Read-Only Access
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-4 px-6 text-xs text-slate-500 font-medium">
                      {member.createdAt ? new Date(member.createdAt).toLocaleDateString() : 'N/A'}
                    </td>

                    <td className="py-4 px-6 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(member)}
                        className="p-1.5 text-slate-600 hover:text-primary hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        title="Edit Permissions & Title"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenDelete(member)}
                        className="p-1.5 text-slate-600 hover:text-error hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Remove Member"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View (<768px) */}
          <div className="block md:hidden space-y-4">
            {filteredMembers.map((member) => (
              <div key={member._id} className="bg-white rounded-xl shadow-xs border border-border p-5 space-y-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center font-bold text-sm">
                      {member.name ? member.name.charAt(0).toUpperCase() : 'C'}
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-charcoal">{member.name}</h4>
                      <p className="text-xs text-slate-500">{member.email}</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#0F172A] text-[#D4AF37]">
                    {member.customLabel || 'Committee'}
                  </span>
                </div>

                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Assigned Permissions
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {member.permissions?.includes('manageBills') && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CreditCard className="w-3 h-3" />
                        <span>Manages Bills</span>
                      </span>
                    )}
                    {member.permissions?.includes('manageResidents') && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        <UserCheck className="w-3 h-3" />
                        <span>Manages Residents</span>
                      </span>
                    )}
                    {(!member.permissions || member.permissions.length === 0) && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-500">
                        Read-Only Access
                      </span>
                    )}
                  </div>
                </div>

                <div className="border-t border-border pt-3 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(member)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-light"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenDelete(member)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-error hover:text-red-700"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* === ADD COMMITTEE MEMBER MODAL === */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-charcoal/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-border w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-[#0F172A] text-[#D4AF37] rounded-lg">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-bold text-charcoal">Add Committee Member</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate hover:text-charcoal cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit}>
              <div className="p-6 space-y-4">
                {addApiError && (
                  <div className="p-3 bg-red-50 border border-error/20 text-error rounded-lg text-sm font-medium">
                    {addApiError}
                  </div>
                )}

                {/* Full Name */}
                <div>
                  <label htmlFor="add-name" className="block text-sm font-medium text-charcoal mb-1">
                    Full Name <span className="text-error">*</span>
                  </label>
                  <input
                    id="add-name"
                    type="text"
                    placeholder="e.g. Rahul Verma"
                    value={addFormData.name}
                    onChange={(e) => {
                      setAddFormData({ ...addFormData, name: e.target.value });
                      if (addErrors.name) setAddErrors({ ...addErrors, name: '' });
                    }}
                    className={`w-full h-11 px-3.5 py-2.5 bg-white border rounded-lg text-charcoal placeholder-slate/40 focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 focus:border-[#0F172A] transition-colors ${
                      addErrors.name ? 'border-error' : 'border-border'
                    }`}
                    disabled={addLoading}
                  />
                  {addErrors.name && (
                    <p className="mt-1 text-xs text-error font-medium">{addErrors.name}</p>
                  )}
                </div>

                {/* Email Address */}
                <div>
                  <label htmlFor="add-email" className="block text-sm font-medium text-charcoal mb-1">
                    Email Address <span className="text-error">*</span>
                  </label>
                  <input
                    id="add-email"
                    type="email"
                    placeholder="e.g. rahul@example.com"
                    value={addFormData.email}
                    onChange={(e) => {
                      setAddFormData({ ...addFormData, email: e.target.value });
                      if (addErrors.email) setAddErrors({ ...addErrors, email: '' });
                    }}
                    className={`w-full h-11 px-3.5 py-2.5 bg-white border rounded-lg text-charcoal placeholder-slate/40 focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 focus:border-[#0F172A] transition-colors ${
                      addErrors.email ? 'border-error' : 'border-border'
                    }`}
                    disabled={addLoading}
                  />
                  {addErrors.email && (
                    <p className="mt-1 text-xs text-error font-medium">{addErrors.email}</p>
                  )}
                </div>

                {/* Password */}
                <div>
                  <label htmlFor="add-password" className="block text-sm font-medium text-charcoal mb-1">
                    Password <span className="text-error">*</span>
                  </label>
                  <input
                    id="add-password"
                    type="password"
                    placeholder="Temporary login password (min 6 characters)"
                    value={addFormData.password}
                    onChange={(e) => {
                      setAddFormData({ ...addFormData, password: e.target.value });
                      if (addErrors.password) setAddErrors({ ...addErrors, password: '' });
                    }}
                    className={`w-full h-11 px-3.5 py-2.5 bg-white border rounded-lg text-charcoal placeholder-slate/40 focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 focus:border-[#0F172A] transition-colors ${
                      addErrors.password ? 'border-error' : 'border-border'
                    }`}
                    disabled={addLoading}
                  />
                  {addErrors.password && (
                    <p className="mt-1 text-xs text-error font-medium">{addErrors.password}</p>
                  )}
                </div>

                {/* Custom Label */}
                <div>
                  <label htmlFor="add-label" className="block text-sm font-medium text-charcoal mb-1">
                    Role / Custom Title <span className="text-error">*</span>
                  </label>
                  <input
                    id="add-label"
                    type="text"
                    placeholder="e.g. Treasurer, Secretary, Vice Chairman"
                    value={addFormData.customLabel}
                    onChange={(e) => {
                      setAddFormData({ ...addFormData, customLabel: e.target.value });
                      if (addErrors.customLabel) setAddErrors({ ...addErrors, customLabel: '' });
                    }}
                    className={`w-full h-11 px-3.5 py-2.5 bg-white border rounded-lg text-charcoal placeholder-slate/40 focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 focus:border-[#0F172A] transition-colors ${
                      addErrors.customLabel ? 'border-error' : 'border-border'
                    }`}
                    disabled={addLoading}
                  />
                  {addErrors.customLabel && (
                    <p className="mt-1 text-xs text-error font-medium">{addErrors.customLabel}</p>
                  )}
                </div>

                {/* Delegated Permissions Checkboxes */}
                <div>
                  <label className="block text-sm font-medium text-charcoal mb-2">
                    Delegated Permissions
                  </label>
                  <div className="space-y-2.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <label className="flex items-start space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={addFormData.permissions.includes('manageResidents')}
                        onChange={() => handleToggleAddPermission('manageResidents')}
                        className="mt-0.5 h-4 w-4 rounded text-[#0F172A] focus:ring-[#0F172A] border-slate-300 cursor-pointer"
                      />
                      <div>
                        <span className="text-xs font-bold text-charcoal block">Can manage residents</span>
                        <span className="text-[11px] text-slate-500 block">
                          View, add, edit, and remove resident accounts in this society.
                        </span>
                      </div>
                    </label>

                    <label className="flex items-start space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={addFormData.permissions.includes('manageBills')}
                        onChange={() => handleToggleAddPermission('manageBills')}
                        className="mt-0.5 h-4 w-4 rounded text-[#0F172A] focus:ring-[#0F172A] border-slate-300 cursor-pointer"
                      />
                      <div>
                        <span className="text-xs font-bold text-charcoal block">Can manage bills & payments</span>
                        <span className="text-[11px] text-slate-500 block">
                          Generate monthly maintenance bills for residents and view society payment records.
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-50 border-t border-border flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="bg-white border border-border text-charcoal hover:bg-slate-100 font-medium px-4 py-2.5 text-sm rounded-lg transition-colors cursor-pointer"
                  disabled={addLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#0F172A] hover:bg-[#1E293B] text-[#D4AF37] border border-[#D4AF37]/30 font-semibold px-5 py-2.5 text-sm rounded-lg transition-colors cursor-pointer flex items-center space-x-2 shadow-md active:scale-98"
                  disabled={addLoading}
                >
                  {addLoading ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-[#D4AF37]" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <span>Creating...</span>
                    </>
                  ) : (
                    <span>Add Member</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* === EDIT COMMITTEE MEMBER MODAL === */}
      {isEditModalOpen && memberToEdit && (
        <div className="fixed inset-0 bg-charcoal/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-border w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-lg font-bold text-charcoal">Edit Member Permissions</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Updating role for <span className="font-semibold text-charcoal">{memberToEdit.name}</span> ({memberToEdit.email})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate hover:text-charcoal cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit}>
              <div className="p-6 space-y-4">
                {editApiError && (
                  <div className="p-3 bg-red-50 border border-error/20 text-error rounded-lg text-sm font-medium">
                    {editApiError}
                  </div>
                )}

                {/* Custom Label */}
                <div>
                  <label htmlFor="edit-label" className="block text-sm font-medium text-charcoal mb-1">
                    Role / Custom Title <span className="text-error">*</span>
                  </label>
                  <input
                    id="edit-label"
                    type="text"
                    placeholder="e.g. Treasurer, Secretary"
                    value={editFormData.customLabel}
                    onChange={(e) => {
                      setEditFormData({ ...editFormData, customLabel: e.target.value });
                      if (editErrors.customLabel) setEditErrors({ ...editErrors, customLabel: '' });
                    }}
                    className={`w-full h-11 px-3.5 py-2.5 bg-white border rounded-lg text-charcoal placeholder-slate/40 focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 focus:border-[#0F172A] transition-colors ${
                      editErrors.customLabel ? 'border-error' : 'border-border'
                    }`}
                    disabled={editLoading}
                  />
                  {editErrors.customLabel && (
                    <p className="mt-1 text-xs text-error font-medium">{editErrors.customLabel}</p>
                  )}
                </div>

                {/* Permissions Checkboxes */}
                <div>
                  <label className="block text-sm font-medium text-charcoal mb-2">
                    Delegated Permissions
                  </label>
                  <div className="space-y-2.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <label className="flex items-start space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editFormData.permissions.includes('manageResidents')}
                        onChange={() => handleToggleEditPermission('manageResidents')}
                        className="mt-0.5 h-4 w-4 rounded text-[#0F172A] focus:ring-[#0F172A] border-slate-300 cursor-pointer"
                      />
                      <div>
                        <span className="text-xs font-bold text-charcoal block">Can manage residents</span>
                        <span className="text-[11px] text-slate-500 block">
                          View, add, edit, and remove resident accounts in this society.
                        </span>
                      </div>
                    </label>

                    <label className="flex items-start space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editFormData.permissions.includes('manageBills')}
                        onChange={() => handleToggleEditPermission('manageBills')}
                        className="mt-0.5 h-4 w-4 rounded text-[#0F172A] focus:ring-[#0F172A] border-slate-300 cursor-pointer"
                      />
                      <div>
                        <span className="text-xs font-bold text-charcoal block">Can manage bills & payments</span>
                        <span className="text-[11px] text-slate-500 block">
                          Generate monthly maintenance bills for residents and view society payment records.
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-50 border-t border-border flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="bg-white border border-border text-charcoal hover:bg-slate-100 font-medium px-4 py-2.5 text-sm rounded-lg transition-colors cursor-pointer"
                  disabled={editLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#0F172A] hover:bg-[#1E293B] text-[#D4AF37] border border-[#D4AF37]/30 font-semibold px-5 py-2.5 text-sm rounded-lg transition-colors cursor-pointer flex items-center space-x-2 shadow-md active:scale-98"
                  disabled={editLoading}
                >
                  {editLoading ? (
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
        </div>
      )}

      {/* === DELETE CONFIRMATION MODAL === */}
      {isDeleteModalOpen && memberToDelete && (
        <div className="fixed inset-0 bg-charcoal/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-border w-full max-w-md overflow-hidden">
            <div className="p-6">
              <div className="flex items-center space-x-3 text-error mb-4">
                <div className="p-2.5 bg-red-50 text-error rounded-xl">
                  <Trash2 className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-charcoal">Remove Committee Member</h3>
              </div>
              <p className="text-slate text-sm leading-relaxed">
                Are you sure you want to remove <strong className="text-charcoal">{memberToDelete.name}</strong> ({memberToDelete.customLabel || 'Committee'})? This action will revoke their administrative privileges immediately.
              </p>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-border flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="bg-white border border-border text-charcoal hover:bg-slate-100 font-medium px-4 py-2.5 text-sm rounded-lg transition-colors cursor-pointer"
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="bg-error hover:bg-red-700 text-white font-medium px-5 py-2.5 text-sm rounded-lg transition-colors cursor-pointer flex items-center space-x-2 shadow-sm"
                disabled={deleteLoading}
              >
                {deleteLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span>Removing...</span>
                  </>
                ) : (
                  <span>Yes, Remove</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommitteeManagement;
