import { useState, useEffect } from 'react';
import axiosInstance from '../api/axiosInstance';
import { 
  Users, 
  Search, 
  Edit, 
  Trash2, 
  X, 
  Shield, 
  Home, 
  Mail,
  AlertCircle
} from 'lucide-react';

const ResidentManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    unitNumber: ''
  });
  const [editFormErrors, setEditFormErrors] = useState({});
  const [editSubmitLoading, setEditSubmitLoading] = useState(false);
  const [editSubmitError, setEditSubmitError] = useState('');

  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [deleteSubmitLoading, setDeleteSubmitLoading] = useState(false);

  // Fetch users within the admin's society
  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axiosInstance.get('/users');
      // Backend returns { users: [...] }
      setUsers(response.data.users || []);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to fetch residents. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Filter users by search query
  const filteredUsers = users.filter((u) => {
    const query = searchQuery.toLowerCase();
    return (
      u.name?.toLowerCase().includes(query) ||
      u.email?.toLowerCase().includes(query) ||
      u.unitNumber?.toLowerCase().includes(query) ||
      u.role?.toLowerCase().includes(query)
    );
  });

  // Calculate statistics
  const totalResidentsCount = users.filter(u => u.role === 'Resident').length;
  const totalAdminsCount = users.filter(u => u.role === 'SocietyAdmin').length;
  const assignedUnitsCount = users.filter(u => u.unitNumber && u.unitNumber.trim() !== '').length;

  // Open Edit Modal
  const handleOpenEditModal = (user) => {
    setSelectedUser(user);
    setEditFormData({
      name: user.name || '',
      unitNumber: user.unitNumber || ''
    });
    setEditFormErrors({});
    setEditSubmitError('');
    setIsEditModalOpen(true);
  };

  // Validate Edit Form
  const validateEditForm = () => {
    const errors = {};
    if (!editFormData.name.trim()) {
      errors.name = 'Name is required';
    }
    setEditFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit Edit Form
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditSubmitError('');
    if (!validateEditForm()) return;

    setEditSubmitLoading(true);
    try {
      const response = await axiosInstance.patch(`/users/${selectedUser._id}`, editFormData);
      // Backend returns updated user as response.data.user
      const updatedUser = response.data.user;
      setUsers((prev) =>
        prev.map((u) => (u._id === selectedUser._id ? { ...u, ...updatedUser } : u))
      );
      setIsEditModalOpen(false);
    } catch (err) {
      console.error(err);
      setEditSubmitError(err.response?.data?.message || 'Failed to update resident details.');
    } finally {
      setEditSubmitLoading(false);
    }
  };

  // Open Delete Modal
  const handleOpenDeleteModal = (user) => {
    setUserToDelete(user);
    setIsDeleteModalOpen(true);
  };

  // Confirm Delete
  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;
    setDeleteSubmitLoading(true);
    try {
      await axiosInstance.delete(`/users/${userToDelete._id}`);
      setUsers((prev) => prev.filter((u) => u._id !== userToDelete._id));
      setIsDeleteModalOpen(false);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to remove resident. Please try again.');
    } finally {
      setDeleteSubmitLoading(false);
      setUserToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-charcoal tracking-tight">Resident Management</h1>
          <p className="text-sm text-slate mt-1">Manage residents, view profiles, assign units, and update records for your society.</p>
        </div>
      </div>

      {/* Stats Cards Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Total Residents Card */}
        <div className="bg-white rounded-xl shadow-sm border border-border p-6 flex items-center space-x-4">
          <div className="p-3.5 rounded-lg bg-primary-subtle text-primary">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate">Total Residents</p>
            <h3 className="text-2xl font-bold text-charcoal">{loading ? '...' : totalResidentsCount}</h3>
          </div>
        </div>

        {/* Society Admins Card */}
        <div className="bg-white rounded-xl shadow-sm border border-border p-6 flex items-center space-x-4">
          <div className="p-3.5 rounded-lg bg-emerald-50 text-success">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate">Society Admins</p>
            <h3 className="text-2xl font-bold text-charcoal">{loading ? '...' : totalAdminsCount}</h3>
          </div>
        </div>

        {/* Assigned Units Card */}
        <div className="bg-white rounded-xl shadow-sm border border-border p-6 flex items-center space-x-4">
          <div className="p-3.5 rounded-lg bg-blue-50 text-info">
            <Home className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate">Assigned Units</p>
            <h3 className="text-2xl font-bold text-charcoal">{loading ? '...' : assignedUnitsCount}</h3>
          </div>
        </div>
      </div>

      {/* Search & Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate/50">
            <Search className="w-5 h-5" />
          </span>
          <input
            type="text"
            placeholder="Search residents by name, email, unit number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-11 pr-10 bg-white border border-border rounded-lg text-charcoal placeholder-slate/40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate hover:text-charcoal cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-error/20 text-error rounded-lg flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium">{error}</span>
          </div>
          <button
            onClick={fetchUsers}
            className="text-sm text-error underline hover:text-red-700 font-semibold cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Residents Card Grid or Skeleton */}
      {loading ? (
        /* Skeletons */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="bg-white rounded-xl border border-border p-6 space-y-4 shadow-sm animate-pulse">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-full bg-slate-100"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-100 rounded w-2/3"></div>
                  <div className="h-3 bg-slate-100 rounded w-1/2"></div>
                </div>
              </div>
              <div className="h-px bg-border pt-1"></div>
              <div className="flex justify-between items-center pt-2">
                <div className="h-5 bg-slate-100 rounded w-20"></div>
                <div className="flex space-x-2">
                  <div className="w-8 h-8 bg-slate-100 rounded-lg"></div>
                  <div className="w-8 h-8 bg-slate-100 rounded-lg"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="bg-white rounded-xl border border-border p-12 text-center shadow-xs">
          <Users className="w-12 h-12 text-slate/30 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-charcoal">No Residents Found</h3>
          <p className="text-sm text-slate mt-1 max-w-sm mx-auto">
            {searchQuery 
              ? `No results match your search query: "${searchQuery}"`
              : 'Add some residents or ask them to register using the society portal.'}
          </p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="mt-4 bg-white border border-border hover:bg-slate-50 text-charcoal font-semibold px-4 py-2 rounded-lg transition-colors cursor-pointer text-sm"
            >
              Clear Search Filter
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
          {filteredUsers.map((resident) => {
            const initial = resident.name ? resident.name.charAt(0).toUpperCase() : '?';
            const isAdmin = resident.role === 'SocietyAdmin';
            
            return (
              <div 
                key={resident._id} 
                className="bg-white rounded-xl border border-border p-6 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center space-x-3">
                      {/* Avatar */}
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shrink-0 ${
                        isAdmin 
                          ? 'bg-emerald-50 text-success border border-success/10' 
                          : 'bg-primary-subtle text-primary border border-primary-light/10'
                      }`}>
                        {initial}
                      </div>
                      
                      <div className="min-w-0">
                        <h4 className="text-base font-bold text-charcoal truncate">{resident.name}</h4>
                        <span className={`inline-block px-2 py-0.5 mt-1 text-[10px] font-semibold uppercase tracking-wider rounded-md border ${
                          isAdmin 
                            ? 'bg-emerald-50 text-success border-success/20' 
                            : 'bg-blue-50 text-info border-info/20'
                        }`}>
                          {resident.role === 'SocietyAdmin' ? 'Admin' : 'Resident'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm text-slate">
                    <div className="flex items-center space-x-2 text-slate-500">
                      <Mail className="w-4 h-4 shrink-0" />
                      <span className="truncate" title={resident.email}>{resident.email}</span>
                    </div>
                    
                    {/* Unit Number Badge */}
                    <div className="pt-1">
                      {resident.unitNumber ? (
                        <span className="inline-flex items-center space-x-1.5 bg-slate-100 text-slate text-xs font-semibold px-2.5 py-1 rounded border border-border">
                          <Home className="w-3.5 h-3.5" />
                          <span>Unit: {resident.unitNumber}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1.5 bg-amber-50 text-warning text-xs font-semibold px-2.5 py-1 rounded border border-warning/20">
                          <Home className="w-3.5 h-3.5" />
                          <span className="italic">No Unit Assigned</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-border flex items-center justify-end space-x-2">
                  <button
                    onClick={() => handleOpenEditModal(resident)}
                    className="p-2 rounded-lg text-slate hover:bg-primary-subtle hover:text-primary transition-all duration-200 cursor-pointer"
                    title="Edit Resident"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleOpenDeleteModal(resident)}
                    className="p-2 rounded-lg text-slate hover:bg-red-50 hover:text-error transition-all duration-200 cursor-pointer"
                    title="Remove Resident"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Resident Form Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-charcoal/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-lg border border-border w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="text-xl font-bold text-charcoal">Edit Resident</h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate hover:text-charcoal cursor-pointer p-1 rounded hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit}>
              <div className="p-6 space-y-4">
                {editSubmitError && (
                  <div className="p-3 bg-red-50 border border-error/20 text-error rounded-lg text-sm font-medium">
                    {editSubmitError}
                  </div>
                )}

                <div>
                  <label htmlFor="modal-edit-name" className="block text-sm font-medium text-charcoal mb-1">
                    Name <span className="text-error">*</span>
                  </label>
                  <input
                    id="modal-edit-name"
                    type="text"
                    placeholder="e.g. Priyanshu Soni"
                    value={editFormData.name}
                    onChange={(e) => {
                      setEditFormData({ ...editFormData, name: e.target.value });
                      if (editFormErrors.name) setEditFormErrors({ ...editFormErrors, name: '' });
                    }}
                    className={`w-full h-11 px-3.5 py-2.5 bg-white border rounded-lg text-charcoal placeholder-slate/40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors ${
                      editFormErrors.name ? 'border-error' : 'border-border'
                    }`}
                    disabled={editSubmitLoading}
                  />
                  {editFormErrors.name && (
                    <p className="mt-1 text-xs text-error font-medium">{editFormErrors.name}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="modal-edit-unit" className="block text-sm font-medium text-charcoal mb-1">
                    Unit Number
                  </label>
                  <input
                    id="modal-edit-unit"
                    type="text"
                    placeholder="e.g. A-102"
                    value={editFormData.unitNumber}
                    onChange={(e) => setEditFormData({ ...editFormData, unitNumber: e.target.value })}
                    className="w-full h-11 px-3.5 py-2.5 bg-white border border-border rounded-lg text-charcoal placeholder-slate/40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                    disabled={editSubmitLoading}
                  />
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-50 border-t border-border flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="bg-white border border-border text-charcoal hover:bg-slate-100 font-medium px-4 py-2.5 text-sm rounded-lg transition-colors cursor-pointer h-11"
                  disabled={editSubmitLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-primary hover:bg-primary-light text-white font-medium px-5 py-2.5 text-sm rounded-lg transition-colors cursor-pointer h-11 flex items-center space-x-2"
                  disabled={editSubmitLoading}
                >
                  {editSubmitLoading ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
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

      {/* Delete Confirmation Modal Overlay */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-charcoal/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-lg border border-border w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-6">
              <div className="flex items-center space-x-3 text-error mb-4">
                <div className="p-2 bg-red-50 rounded-full">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-charcoal">Remove Resident</h3>
              </div>
              
              <p className="text-slate text-sm leading-relaxed">
                Are you sure you want to remove <strong className="text-charcoal">"{userToDelete?.name}"</strong> from your society? This action cannot be undone and they will lose access to the portal.
              </p>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-border flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="bg-white border border-border text-charcoal hover:bg-slate-100 font-medium px-4 py-2.5 text-sm rounded-lg transition-colors cursor-pointer h-11"
                disabled={deleteSubmitLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="bg-error hover:bg-red-700 text-white font-medium px-5 py-2.5 text-sm rounded-lg transition-colors cursor-pointer h-11 flex items-center space-x-2"
                disabled={deleteSubmitLoading}
              >
                {deleteSubmitLoading ? (
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

export default ResidentManagement;
