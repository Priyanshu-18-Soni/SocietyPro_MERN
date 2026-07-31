import { useState, useEffect } from 'react';
import axiosInstance from '../api/axiosInstance';

const SocietyManagement = () => {
  const [societies, setSocieties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modal states for Add/Edit
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formMode, setFormMode] = useState('add'); // 'add' or 'edit'
  const [selectedSocietyId, setSelectedSocietyId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    registrationNumber: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [formSubmitLoading, setFormSubmitLoading] = useState(false);
  const [formSubmitError, setFormSubmitError] = useState('');

  // Modal states for Delete Confirmation
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [societyToDelete, setSocietyToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Fetch all societies on mount
  const fetchSocieties = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axiosInstance.get('/society');
      // Backend returns { societies: [...] }
      setSocieties(response.data.societies || []);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to fetch societies list. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSocieties();
  }, []);

  // Form Validation
  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Society Name is required';
    if (!formData.address.trim()) errors.address = 'Address is required';
    if (!formData.city.trim()) errors.city = 'City is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Open modal for Add
  const handleOpenAddModal = () => {
    setFormMode('add');
    setSelectedSocietyId(null);
    setFormData({
      name: '',
      address: '',
      city: '',
      registrationNumber: '',
    });
    setFormErrors({});
    setFormSubmitError('');
    setIsFormModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEditModal = (society) => {
    setFormMode('edit');
    setSelectedSocietyId(society._id);
    setFormData({
      name: society.name || '',
      address: society.address || '',
      city: society.city || '',
      registrationNumber: society.registrationNumber || '',
    });
    setFormErrors({});
    setFormSubmitError('');
    setIsFormModalOpen(true);
  };

  // Submit Add/Edit Form
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormSubmitError('');
    if (!validateForm()) return;

    setFormSubmitLoading(true);
    try {
      if (formMode === 'add') {
        const response = await axiosInstance.post('/society', formData);
        // Refresh local state list
        setSocieties((prev) => [...prev, response.data.society]);
      } else {
        const response = await axiosInstance.patch(`/society/${selectedSocietyId}`, formData);
        // Update updated item in local state list
        setSocieties((prev) =>
          prev.map((soc) => (soc._id === selectedSocietyId ? response.data.society : soc))
        );
      }
      setIsFormModalOpen(false);
    } catch (err) {
      console.error(err);
      setFormSubmitError(err.response?.data?.message || 'Failed to save society details. Please try again.');
    } finally {
      setFormSubmitLoading(false);
    }
  };

  // Open Delete Confirmation modal
  const handleOpenDeleteModal = (society) => {
    setSocietyToDelete(society);
    setIsDeleteModalOpen(true);
  };

  // Execute Delete
  const handleDeleteConfirm = async () => {
    if (!societyToDelete) return;
    setDeleteLoading(true);
    try {
      await axiosInstance.delete(`/society/${societyToDelete._id}`);
      // Remove from local state list
      setSocieties((prev) => prev.filter((soc) => soc._id !== societyToDelete._id));
      setIsDeleteModalOpen(false);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to delete society. Please try again.');
    } finally {
      setDeleteLoading(false);
      setSocietyToDelete(null);
    }
  };

  return (
    <>
      {/* Main Content */}
      <div className="space-y-6">
        
        {/* Page Title & Add New button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-charcoal tracking-tight">Society Management</h1>
            <p className="text-sm text-slate mt-1">Add, update, or remove housing societies from the platform.</p>
          </div>
          <div>
            <button
              onClick={handleOpenAddModal}
              className="w-full sm:w-auto h-11 bg-primary hover:bg-primary-light text-white font-medium px-6 py-2.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span>Add New Society</span>
            </button>
          </div>
        </div>

        {/* Dashboard Widgets section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-border p-6 flex items-center space-x-4">
            <div className="p-3.5 rounded-lg bg-primary-subtle text-primary">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-slate">Total Registered Societies</p>
              <h3 className="text-2xl font-bold text-charcoal">{loading ? '...' : societies.length}</h3>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-border p-6 flex items-center space-x-4">
            <div className="p-3.5 rounded-lg bg-emerald-50 text-success">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-slate">System Security</p>
              <h3 className="text-2xl font-bold text-charcoal">RBAC Active</h3>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-border p-6 flex items-center space-x-4">
            <div className="p-3.5 rounded-lg bg-blue-50 text-info">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-slate">Last Refresh</p>
              <p className="text-base font-semibold text-charcoal">Just now</p>
            </div>
          </div>
        </div>

        {/* Errors / Main List Table */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-error/20 text-error rounded-lg flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="text-sm font-medium">{error}</span>
            </div>
            <button
              onClick={fetchSocieties}
              className="text-sm text-error underline hover:text-red-700 font-semibold cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Societies Grid or Table list */}
        {loading ? (
          /* Loading Skeleton States */
          <div className="bg-white rounded-xl border border-border p-6 space-y-4">
            <div className="h-6 bg-slate-100 rounded w-1/4 animate-pulse"></div>
            <div className="space-y-3 pt-4">
              <div className="grid grid-cols-4 gap-4">
                <div className="h-4 bg-slate-100 rounded col-span-1 animate-pulse"></div>
                <div className="h-4 bg-slate-100 rounded col-span-1 animate-pulse"></div>
                <div className="h-4 bg-slate-100 rounded col-span-1 animate-pulse"></div>
                <div className="h-4 bg-slate-100 rounded col-span-1 animate-pulse"></div>
              </div>
              <div className="h-px bg-border"></div>
              {[1, 2, 3].map((n) => (
                <div key={n} className="grid grid-cols-4 gap-4 py-2">
                  <div className="h-4 bg-slate-50 rounded col-span-1 animate-pulse"></div>
                  <div className="h-4 bg-slate-50 rounded col-span-1 animate-pulse"></div>
                  <div className="h-4 bg-slate-50 rounded col-span-1 animate-pulse"></div>
                  <div className="h-4 bg-slate-50 rounded col-span-1 animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>
        ) : societies.length === 0 ? (
          <div className="bg-white rounded-xl border border-border p-12 text-center">
            <svg className="w-12 h-12 text-slate/30 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <h3 className="text-lg font-bold text-charcoal">No Societies Found</h3>
            <p className="text-sm text-slate mt-1 max-w-sm mx-auto">Get started by adding your first residential society to register it on the platform.</p>
            <button
              onClick={handleOpenAddModal}
              className="mt-4 bg-primary hover:bg-primary-light text-white font-medium px-4 py-2 rounded-lg transition-colors cursor-pointer inline-flex items-center space-x-1"
            >
              <span>Create Society</span>
            </button>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block bg-white rounded-xl shadow-sm border border-border overflow-hidden">
              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-border sticky top-0 z-1">
                      <th className="py-4 px-6 text-sm font-semibold text-charcoal">Society Name</th>
                      <th className="py-4 px-6 text-sm font-semibold text-charcoal">Address</th>
                      <th className="py-4 px-6 text-sm font-semibold text-charcoal">City</th>
                      <th className="py-4 px-6 text-sm font-semibold text-charcoal">Registration No.</th>
                      <th className="py-4 px-6 text-sm font-semibold text-charcoal text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {societies.map((society, index) => (
                      <tr
                        key={society._id}
                        className={index % 2 === 1 ? 'bg-surface/30' : 'bg-white'}
                      >
                        <td className="py-4 px-6 text-base font-semibold text-charcoal">{society.name}</td>
                        <td className="py-4 px-6 text-sm text-slate">{society.address}</td>
                        <td className="py-4 px-6 text-sm text-slate">{society.city}</td>
                        <td className="py-4 px-6 text-sm font-mono text-slate">
                          {society.registrationNumber || <span className="italic text-slate/40">N/A</span>}
                        </td>
                        <td className="py-4 px-6 text-sm text-right space-x-3">
                          <button
                            onClick={() => handleOpenEditModal(society)}
                            className="text-primary hover:text-primary-light font-medium cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleOpenDeleteModal(society)}
                            className="text-error hover:text-red-700 font-medium cursor-pointer"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Card List View (<768px) */}
            <div className="block md:hidden space-y-4">
              {societies.map((society) => (
                <div key={society._id} className="bg-white rounded-xl shadow-sm border border-border p-5 space-y-3">
                  <div className="flex justify-between items-start">
                    <h4 className="text-lg font-bold text-charcoal">{society.name}</h4>
                    <span className="text-xs font-mono bg-slate-100 text-slate px-2 py-0.5 rounded">
                      Reg: {society.registrationNumber || 'N/A'}
                    </span>
                  </div>
                  <div className="text-sm text-slate space-y-1">
                    <p><strong>Address:</strong> {society.address}</p>
                    <p><strong>City:</strong> {society.city}</p>
                  </div>
                  <div className="h-px bg-border pt-1"></div>
                  <div className="flex justify-end space-x-4 pt-1">
                    <button
                      onClick={() => handleOpenEditModal(society)}
                      className="text-primary hover:text-primary-light font-medium text-sm cursor-pointer"
                    >
                      Edit Details
                    </button>
                    <button
                      onClick={() => handleOpenDeleteModal(society)}
                      className="text-error hover:text-red-700 font-medium text-sm cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Add / Edit Dialog Modal Overlay */}
      {isFormModalOpen && (
        <div className="fixed inset-0 bg-charcoal/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg border border-border w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="text-xl font-bold text-charcoal">
                {formMode === 'add' ? 'Add New Society' : 'Edit Society'}
              </h3>
              <button
                onClick={() => setIsFormModalOpen(false)}
                className="text-slate hover:text-charcoal cursor-pointer"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleFormSubmit}>
              <div className="p-6 space-y-4">
                {formSubmitError && (
                  <div className="p-3 bg-red-50 border border-error/20 text-error rounded-lg text-sm font-medium">
                    {formSubmitError}
                  </div>
                )}

                <div>
                  <label htmlFor="modal-name" className="block text-sm font-medium text-charcoal mb-1">
                    Society Name <span className="text-error">*</span>
                  </label>
                  <input
                    id="modal-name"
                    type="text"
                    placeholder="e.g. Dream Heights Cooperative Society"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({ ...formData, name: e.target.value });
                      if (formErrors.name) setFormErrors({ ...formErrors, name: '' });
                    }}
                    className={`w-full h-11 px-3.5 py-2.5 bg-white border rounded-lg text-charcoal placeholder-slate/40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors ${
                      formErrors.name ? 'border-error' : 'border-border'
                    }`}
                    disabled={formSubmitLoading}
                  />
                  {formErrors.name && (
                    <p className="mt-1 text-xs text-error font-medium">{formErrors.name}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="modal-address" className="block text-sm font-medium text-charcoal mb-1">
                    Address <span className="text-error">*</span>
                  </label>
                  <textarea
                    id="modal-address"
                    rows="3"
                    placeholder="Enter complete society street address"
                    value={formData.address}
                    onChange={(e) => {
                      setFormData({ ...formData, address: e.target.value });
                      if (formErrors.address) setFormErrors({ ...formErrors, address: '' });
                    }}
                    className={`w-full px-3.5 py-2.5 bg-white border rounded-lg text-charcoal placeholder-slate/40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors ${
                      formErrors.address ? 'border-error' : 'border-border'
                    }`}
                    disabled={formSubmitLoading}
                  />
                  {formErrors.address && (
                    <p className="mt-1 text-xs text-error font-medium">{formErrors.address}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="modal-city" className="block text-sm font-medium text-charcoal mb-1">
                      City <span className="text-error">*</span>
                    </label>
                    <input
                      id="modal-city"
                      type="text"
                      placeholder="e.g. Mumbai"
                      value={formData.city}
                      onChange={(e) => {
                        setFormData({ ...formData, city: e.target.value });
                        if (formErrors.city) setFormErrors({ ...formErrors, city: '' });
                      }}
                      className={`w-full h-11 px-3.5 py-2.5 bg-white border rounded-lg text-charcoal placeholder-slate/40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors ${
                        formErrors.city ? 'border-error' : 'border-border'
                      }`}
                      disabled={formSubmitLoading}
                    />
                    {formErrors.city && (
                      <p className="mt-1 text-xs text-error font-medium">{formErrors.city}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="modal-reg" className="block text-sm font-medium text-charcoal mb-1">
                      Registration Number
                    </label>
                    <input
                      id="modal-reg"
                      type="text"
                      placeholder="e.g. REG-109283-A"
                      value={formData.registrationNumber}
                      onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                      className="w-full h-11 px-3.5 py-2.5 bg-white border border-border rounded-lg text-charcoal placeholder-slate/40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                      disabled={formSubmitLoading}
                    />
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-50 border-t border-border flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="bg-white border border-border text-charcoal hover:bg-slate-100 font-medium px-4 py-2.5 text-sm rounded-lg transition-colors cursor-pointer h-11"
                  disabled={formSubmitLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-primary hover:bg-primary-light text-white font-medium px-5 py-2.5 text-sm rounded-lg transition-colors cursor-pointer h-11 flex items-center space-x-2"
                  disabled={formSubmitLoading}
                >
                  {formSubmitLoading ? (
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

      {/* Delete Confirmation Overlay Dialog */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-charcoal/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-lg border border-border w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-6">
              <div className="flex items-center space-x-3 text-error mb-4">
                <div className="p-2 bg-red-50 rounded-full">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-charcoal">Delete Society</h3>
              </div>
              
              <p className="text-slate text-sm leading-relaxed">
                Are you sure you want to delete <strong className="text-charcoal">"{societyToDelete?.name}"</strong>? This action cannot be undone. All data associated with this society will be permanently removed.
              </p>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-border flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="bg-white border border-border text-charcoal hover:bg-slate-100 font-medium px-4 py-2.5 text-sm rounded-lg transition-colors cursor-pointer h-11"
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="bg-error hover:bg-red-700 text-white font-medium px-5 py-2.5 text-sm rounded-lg transition-colors cursor-pointer h-11 flex items-center space-x-2"
                disabled={deleteLoading}
              >
                {deleteLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Yes, Delete</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SocietyManagement;
