import { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  MoreVertical, 
  CreditCard, 
  Calendar, 
  Check,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  Plus,
  X,
  FileText,
  Users
} from 'lucide-react';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';

const Payments = () => {
  const { user } = useAuth();
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [loadingBillId, setLoadingBillId] = useState(null);
  const [notification, setNotification] = useState(null);
  const [activeMenuId, setActiveMenuId] = useState(null);

  // Bill Generation Permissions & Modal States
  const canGenerateBill =
    user?.role === 'SocietyOwner' ||
    (user?.role === 'Committee' && user?.permissions?.includes('manageBills'));

  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [residents, setResidents] = useState([]);
  const [residentsLoading, setResidentsLoading] = useState(false);
  const [billMode, setBillMode] = useState('individual'); // 'individual' | 'bulk'
  const [generateFormData, setGenerateFormData] = useState({
    residentId: '',
    unitNumber: '',
    amount: '',
    month: '',
    dueDate: '',
    description: '',
  });
  const [generateFormErrors, setGenerateFormErrors] = useState({});
  const [generateSubmitLoading, setGenerateSubmitLoading] = useState(false);
  const [generateSubmitError, setGenerateSubmitError] = useState('');

  // Fetch real bills from API
  const fetchBills = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axiosInstance.get('/payments');
      setBills(response.data.bills || []);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to load payments and bills.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch residents for bill generation dropdown
  const fetchResidents = async () => {
    setResidentsLoading(true);
    try {
      const response = await axiosInstance.get('/users');
      const userList = response.data.users || [];
      const residentList = userList.filter((u) => u.role === 'Resident');
      setResidents(residentList);
    } catch (err) {
      console.error('Failed to load residents for bill generation:', err);
    } finally {
      setResidentsLoading(false);
    }
  };

  // Active residents count for bulk banner
  const activeResidentsCount = residents.filter((r) => r.status === 'active').length;

  // Open Generate Modal with auto-filled default month and due date
  const handleOpenGenerateModal = () => {
    const now = new Date();
    const defaultMonth = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const nextDueDate = new Date();
    nextDueDate.setDate(nextDueDate.getDate() + 15);
    const defaultDueDate = nextDueDate.toISOString().split('T')[0];

    setGenerateFormData({
      residentId: '',
      unitNumber: '',
      amount: '',
      month: defaultMonth,
      dueDate: defaultDueDate,
      description: '',
    });
    setGenerateFormErrors({});
    setGenerateSubmitError('');
    setBillMode('individual');
    setIsGenerateModalOpen(true);

    if (residents.length === 0) {
      fetchResidents();
    }
  };

  const handleResidentChange = (e) => {
    const selectedId = e.target.value;
    const selected = residents.find((r) => r._id === selectedId);
    setGenerateFormData((prev) => ({
      ...prev,
      residentId: selectedId,
      unitNumber: selected?.unitNumber || '',
    }));
    if (generateFormErrors.residentId || generateFormErrors.unitNumber) {
      setGenerateFormErrors((prev) => ({
        ...prev,
        residentId: '',
        unitNumber: '',
      }));
    }
  };

  const validateGenerateForm = () => {
    const errors = {};

    if (billMode === 'individual') {
      if (!generateFormData.residentId) {
        errors.residentId = 'Please select a resident';
      }
      if (!generateFormData.unitNumber.trim()) {
        errors.unitNumber = 'Unit number is required';
      }
    }

    const numAmount = Number(generateFormData.amount);
    if (!generateFormData.amount || isNaN(numAmount) || numAmount <= 0) {
      errors.amount = 'Please enter a valid amount in Rupees (greater than ₹0)';
    }
    if (!generateFormData.month.trim()) {
      errors.month = 'Billing month is required';
    }
    if (!generateFormData.dueDate) {
      errors.dueDate = 'Due date is required';
    }
    setGenerateFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleGenerateBillSubmit = async (e) => {
    e.preventDefault();
    setGenerateSubmitError('');
    if (!validateGenerateForm()) return;

    setGenerateSubmitLoading(true);
    try {
      if (billMode === 'bulk') {
        // Bulk bill generation for all active residents
        const payload = {
          title: `Maintenance - ${generateFormData.month.trim()}`,
          month: generateFormData.month.trim(),
          amount: Number(generateFormData.amount),
          dueDate: generateFormData.dueDate,
          description: generateFormData.description.trim() || undefined,
        };

        const response = await axiosInstance.post('/payments/generate-bulk-bills', payload);
        const { totalCreated, skippedDuplicates } = response.data;

        setIsGenerateModalOpen(false);
        let successMsg = `${totalCreated} maintenance bill(s) generated successfully for ${generateFormData.month.trim()}!`;
        if (skippedDuplicates > 0) {
          successMsg += ` (${skippedDuplicates} duplicate(s) skipped)`;
        }
        setNotification({ type: 'success', message: successMsg });
        fetchBills();
      } else {
        // Individual bill generation (existing flow)
        const payload = {
          residentId: generateFormData.residentId,
          amount: Number(generateFormData.amount),
          unitNumber: generateFormData.unitNumber.trim(),
          month: generateFormData.month.trim(),
          dueDate: generateFormData.dueDate,
        };

        await axiosInstance.post('/payments/generate-bill', payload);

        setIsGenerateModalOpen(false);
        setNotification({
          type: 'success',
          message: `Maintenance bill generated successfully for Unit ${payload.unitNumber} (${payload.month})!`,
        });
        fetchBills();
      }
    } catch (err) {
      console.error(err);
      setGenerateSubmitError(
        err.response?.data?.message || 'Failed to generate bill. Please check inputs and try again.'
      );
    } finally {
      setGenerateSubmitLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchBills();
  }, []);

  // Summary Metrics (Amounts are stored in Paise, convert to INR for display)
  const collectedPaise = bills
    .filter((b) => b.status === 'captured')
    .reduce((sum, b) => sum + (b.amount + (b.lateFee || 0)), 0);
  const collectedCount = bills.filter((b) => b.status === 'captured').length;

  const pendingPaise = bills
    .filter((b) => b.status !== 'captured')
    .reduce((sum, b) => sum + (b.totalAmount || (b.amount + (b.lateFee || 0))), 0);
  const pendingCount = bills.filter((b) => b.status !== 'captured').length;

  const overdueCount = bills.filter(
    (b) => b.status !== 'captured' && b.dueDate && new Date() > new Date(b.dueDate)
  ).length;

  // Filter bills by activeTab
  const filteredBills = bills.filter((bill) => {
    if (activeTab === 'All') return true;
    if (activeTab === 'Paid') return bill.status === 'captured';
    if (activeTab === 'Pending') return bill.status === 'created' || bill.status === 'authorized';
    if (activeTab === 'Overdue') {
      return bill.status !== 'captured' && bill.dueDate && new Date() > new Date(bill.dueDate);
    }
    if (activeTab === 'Failed') return bill.status === 'failed';
    return true;
  });

  // Dynamic script loader for Razorpay Checkout SDK
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Payment Handler
  const handlePayment = async (bill) => {
    if (bill.status === 'captured') return;

    setLoadingBillId(bill._id);
    setNotification(null);
    setActiveMenuId(null);

    try {
      // 1. Create Razorpay order linked directly to this existing bill record
      const response = await axiosInstance.post('/payments/create-order', {
        billId: bill._id,
      });

      const { orderId, amount, currency, key } = response.data;

      // 2. Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Razorpay SDK failed to load. Please verify your internet connection.');
      }

      // 3. Configure Razorpay checkout options
      const options = {
        key: key,
        amount: amount, // in Paise
        currency: currency || 'INR',
        name: 'SocietyPro',
        description: `Maintenance for ${bill.month} - Unit ${bill.unitNumber}`,
        order_id: orderId,
        theme: {
          color: '#0F172A',
        },
        handler: async (paymentResponse) => {
          setLoadingBillId(bill._id);
          try {
            // Verify HMAC signature on backend
            await axiosInstance.post('/payments/verify', {
              razorpay_order_id: paymentResponse.razorpay_order_id,
              razorpay_payment_id: paymentResponse.razorpay_payment_id,
              razorpay_signature: paymentResponse.razorpay_signature,
            });

            // Mark bill as captured in local state
            setBills((prevBills) =>
              prevBills.map((b) =>
                b._id === bill._id
                  ? {
                      ...b,
                      status: 'captured',
                      razorpayPaymentId: paymentResponse.razorpay_payment_id,
                    }
                  : b
              )
            );

            setNotification({
              type: 'success',
              message: `Payment successful for Unit ${bill.unitNumber} (${bill.month})!`,
            });
          } catch (err) {
            console.error(err);
            setNotification({
              type: 'error',
              message: err.response?.data?.message || 'Payment verification failed.',
            });
          } finally {
            setLoadingBillId(null);
          }
        },
        modal: {
          ondismiss: () => {
            setLoadingBillId(null);
          },
        },
      };

      const razorpayInstance = new window.Razorpay(options);
      razorpayInstance.open();
    } catch (err) {
      console.error(err);
      setNotification({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Failed to initiate payment.',
      });
      setLoadingBillId(null);
    }
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleOutsideClick = () => setActiveMenuId(null);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-6">
        <div className="text-left">
          <div className="flex items-center space-x-2.5">
            <h1 className="text-3xl font-bold text-charcoal tracking-tight">Payments & Billing</h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-subtle text-primary border border-primary/20">
              <CreditCard className="w-3.5 h-3.5" />
              <span>{user?.role === 'Resident' ? 'My Bills' : 'Society Ledger'}</span>
            </span>
          </div>
          <p className="text-sm text-slate mt-1">
            {user?.role === 'Resident' 
              ? 'View monthly maintenance statements, dynamic late fee accruals, and settle dues securely via Razorpay.' 
              : 'Monitor resident payments, overdue penalties, and society collection status.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {canGenerateBill && (
            <button
              onClick={handleOpenGenerateModal}
              className="h-10 px-4 bg-[#0F172A] hover:bg-[#1E293B] active:scale-98 text-[#D4AF37] font-semibold text-xs sm:text-sm rounded-lg transition-all flex items-center gap-2 shadow-sm border border-[#D4AF37]/30 cursor-pointer"
              title="Generate New Bill"
            >
              <Plus className="w-4 h-4" />
              <span>Generate Bill</span>
            </button>
          )}

          <button
            onClick={fetchBills}
            disabled={loading}
            className="h-10 px-4 bg-white border border-border hover:bg-slate-50 text-slate font-medium text-xs rounded-lg transition-colors flex items-center gap-2 shadow-xs cursor-pointer active:scale-98"
            title="Refresh Bills"
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
            onClick={fetchBills}
            className="text-sm text-error underline hover:text-red-700 font-semibold cursor-pointer ml-3"
          >
            Retry
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Collected */}
        <div className="bg-white border border-border rounded-2xl p-5 sm:p-6 flex items-center justify-between shadow-xs hover:shadow-md transition-all duration-200">
          <div className="space-y-1 text-left">
            <span className="text-xs font-semibold text-slate uppercase tracking-wider block">
              Total Collected
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-charcoal">
              ₹{(collectedPaise / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </h2>
            <p className="text-emerald-700 text-xs font-semibold flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{collectedCount} bills paid</span>
            </p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-emerald-50 text-success flex items-center justify-center border border-success/15 shadow-2xs">
            <CheckCircle className="h-6 w-6" />
          </div>
        </div>

        {/* Pending */}
        <div className="bg-white border border-border rounded-2xl p-5 sm:p-6 flex items-center justify-between shadow-xs hover:shadow-md transition-all duration-200">
          <div className="space-y-1 text-left">
            <span className="text-xs font-semibold text-slate uppercase tracking-wider block">
              Pending Dues
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-charcoal">
              ₹{(pendingPaise / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </h2>
            <p className="text-amber-700 text-xs font-semibold flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{pendingCount} bills pending</span>
            </p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-amber-50 text-warning flex items-center justify-center border border-warning/20 shadow-2xs">
            <Clock className="h-6 w-6" />
          </div>
        </div>

        {/* Overdue Notice */}
        <div className="bg-white border border-border rounded-2xl p-5 sm:p-6 flex items-center justify-between shadow-xs hover:shadow-md transition-all duration-200">
          <div className="space-y-1 text-left">
            <span className="text-xs font-semibold text-slate uppercase tracking-wider block">
              Overdue Accounts
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-charcoal">
              {overdueCount}
            </h2>
            <p className="text-red-700 text-xs font-semibold flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Accruing late penalties</span>
            </p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-red-50 text-error flex items-center justify-center border border-error/20 shadow-2xs">
            <AlertTriangle className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex border-b border-border pb-1">
        <div className="flex space-x-1.5 p-1 bg-slate-100/70 rounded-xl border border-border/40">
          {['All', 'Pending', 'Overdue', 'Paid'].map((tab) => {
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

      {/* Loading Skeleton */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="p-5 bg-white border border-border rounded-2xl shadow-xs animate-pulse flex items-center justify-between"
            >
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-slate-100 rounded-xl"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-slate-100 rounded w-32"></div>
                  <div className="h-3 bg-slate-100 rounded w-48"></div>
                </div>
              </div>
              <div className="h-8 bg-slate-100 rounded w-24"></div>
            </div>
          ))}
        </div>
      ) : filteredBills.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-border shadow-xs">
          <CreditCard className="h-12 w-12 text-slate/30 mx-auto mb-3" />
          <h3 className="text-charcoal font-bold text-base">No bills found</h3>
          <p className="text-slate text-xs mt-1 max-w-sm mx-auto">
            There are no billing records under the '{activeTab}' category.
          </p>
        </div>
      ) : (
        /* Bills List */
        <div className="space-y-3">
          {filteredBills.map((bill) => {
            const isPaid = bill.status === 'captured';
            const isProcessing = loadingBillId === bill._id;
            const isOverdue = !isPaid && bill.dueDate && new Date() > new Date(bill.dueDate);
            const baseINR = (bill.amount / 100);
            const lateFeeINR = ((bill.lateFee || 0) / 100);
            const totalINR = ((bill.totalAmount || (bill.amount + (bill.lateFee || 0))) / 100);

            const formattedDueDate = bill.dueDate
              ? new Date(bill.dueDate).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })
              : 'N/A';

            return (
              <div 
                key={bill._id}
                className={`group flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 bg-white border border-border hover:border-slate-300 rounded-2xl shadow-xs hover:shadow-md transition-all duration-200 relative ${
                  !isPaid ? 'border-l-4 border-l-amber-500' : 'border-l-4 border-l-emerald-500'
                }`}
              >
                <div className="flex items-start sm:items-center space-x-4">
                  {/* Status Indicator Icon */}
                  <div className={`h-11 w-11 shrink-0 rounded-xl flex items-center justify-center border shadow-2xs ${
                    isPaid 
                      ? 'bg-emerald-50 text-success border-success/20' 
                      : isOverdue 
                        ? 'bg-red-50 text-error border-error/20' 
                        : 'bg-amber-50 text-warning border-warning/20'
                  }`}>
                    {isPaid ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : isOverdue ? (
                      <AlertTriangle className="h-5 w-5 animate-pulse" />
                    ) : (
                      <Clock className="h-5 w-5" />
                    )}
                  </div>

                  <div className="text-left min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-base font-bold text-charcoal">Unit {bill.unitNumber}</h4>
                      
                      {/* Status Badges */}
                      {isPaid ? (
                        <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-md uppercase bg-emerald-50 text-success border border-success/20">
                          Paid
                        </span>
                      ) : isOverdue ? (
                        <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-md uppercase bg-red-50 text-error border border-error/20 flex items-center gap-1">
                          <span>Overdue ({bill.daysOverdue || 1}d)</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-md uppercase bg-amber-50 text-warning border border-warning/20">
                          Pending
                        </span>
                      )}

                      {bill.lateFee > 0 && (
                        <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                          Late Fee Accrued
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate text-xs mt-1">
                      <span className="flex items-center gap-1 font-semibold text-charcoal">
                        <Calendar className="h-3.5 w-3.5 text-primary" />
                        {bill.month}
                      </span>
                      <span>•</span>
                      <span className={isOverdue ? 'text-error font-semibold' : ''}>
                        Due: {formattedDueDate}
                      </span>
                      {bill.razorpayPaymentId && (
                        <>
                          <span>•</span>
                          <span className="font-mono text-[11px] text-slate/80">Ref: {bill.razorpayPaymentId}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-5 mt-4 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  {/* Amount Breakdown */}
                  <div className="text-left sm:text-right">
                    <div className="text-xl font-extrabold text-charcoal">
                      ₹{totalINR.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </div>
                    {bill.lateFee > 0 && (
                      <p className="text-[11px] text-slate mt-0.5">
                        Base: ₹{baseINR.toLocaleString('en-IN')} + Fee: ₹{lateFeeINR.toLocaleString('en-IN')}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    {!isPaid && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePayment(bill);
                        }}
                        disabled={isProcessing}
                        className="h-10 px-4 bg-[#0F172A] hover:bg-[#1E293B] active:scale-95 text-[#D4AF37] text-xs font-bold rounded-lg transition-all border border-[#D4AF37]/30 flex items-center gap-2 shadow-sm shrink-0 cursor-pointer"
                      >
                        {isProcessing ? (
                          <>
                            <span className="animate-spin h-3.5 w-3.5 border-2 border-[#D4AF37] border-t-transparent rounded-full" />
                            <span>Processing...</span>
                          </>
                        ) : (
                          <>
                            <CreditCard className="h-4 w-4" />
                            <span>Pay Now</span>
                          </>
                        )}
                      </button>
                    )}

                    {isPaid && (
                      <span className="h-10 px-4 bg-emerald-50 text-success text-xs font-bold rounded-lg border border-success/20 flex items-center gap-1.5 shadow-2xs shrink-0 select-none">
                        <Check className="h-4 w-4" />
                        <span>Settled</span>
                      </span>
                    )}

                    {/* Options Menu */}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(activeMenuId === bill._id ? null : bill._id);
                        }}
                        className="p-2 hover:bg-slate-100 text-slate hover:text-charcoal rounded-lg focus:outline-none transition-colors cursor-pointer"
                        title="Options"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>

                      {activeMenuId === bill._id && (
                        <div className="absolute right-0 mt-2 w-44 bg-white border border-border rounded-xl shadow-lg z-20 py-1.5 text-left animate-in fade-in zoom-in-95 duration-150">
                          {!isPaid && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePayment(bill);
                              }}
                              className="w-full px-4 py-2.5 text-xs font-semibold text-charcoal hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                            >
                              <CreditCard className="w-3.5 h-3.5 text-[#D4AF37]" />
                              <span>Settle Bill</span>
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard?.writeText(
                                `SocietyPro Bill - Unit ${bill.unitNumber}, Month: ${bill.month}, Total: ₹${totalINR}`
                              );
                              setNotification({
                                type: 'success',
                                message: `Statement details for Unit ${bill.unitNumber} copied to clipboard!`,
                              });
                              setActiveMenuId(null);
                            }}
                            className="w-full px-4 py-2.5 text-xs font-semibold text-charcoal hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                          >
                            <Calendar className="w-3.5 h-3.5 text-primary" />
                            <span>Copy Details</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Generate Bill Modal */}
      {isGenerateModalOpen && (
        <div className="fixed inset-0 bg-charcoal/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-lg border border-border w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150 text-left">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-primary-subtle text-primary rounded-lg">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-charcoal">Generate Maintenance Bill</h3>
                  <p className="text-xs text-slate">
                    {billMode === 'bulk'
                      ? 'Issue monthly bills for all active society residents at once.'
                      : 'Issue a monthly maintenance bill to a society resident.'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsGenerateModalOpen(false)}
                className="text-slate hover:text-charcoal cursor-pointer p-1 rounded-lg hover:bg-slate-100 transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleGenerateBillSubmit}>
              <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                {generateSubmitError && (
                  <div className="p-3 bg-red-50 border border-error/20 text-error rounded-lg text-sm font-medium flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{generateSubmitError}</span>
                  </div>
                )}

                {/* Bill Mode Toggle */}
                <div>
                  <label className="block text-sm font-medium text-charcoal mb-2">Bill Type</label>
                  <div className="flex p-1 bg-slate-100 rounded-lg border border-border/50">
                    <button
                      type="button"
                      onClick={() => setBillMode('individual')}
                      className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                        billMode === 'individual'
                          ? 'bg-[#0F172A] text-[#D4AF37] shadow-sm'
                          : 'text-slate hover:text-charcoal hover:bg-white/60'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Individual Resident</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setBillMode('bulk')}
                      className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                        billMode === 'bulk'
                          ? 'bg-[#0F172A] text-[#D4AF37] shadow-sm'
                          : 'text-slate hover:text-charcoal hover:bg-white/60'
                      }`}
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>All Active Residents</span>
                    </button>
                  </div>
                </div>

                {/* Bulk Mode Info Banner */}
                {billMode === 'bulk' && (
                  <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2.5">
                    <Users className="w-4.5 h-4.5 text-blue-600 shrink-0 mt-0.5" />
                    <div className="text-xs text-blue-800">
                      <p className="font-semibold mb-0.5">Bulk Bill Generation</p>
                      <p>
                        This will generate a bill of{' '}
                        <span className="font-bold">
                          ₹{generateFormData.amount ? Number(generateFormData.amount).toLocaleString('en-IN') : '—'}
                        </span>{' '}
                        for{' '}
                        <span className="font-bold">
                          {residentsLoading ? '...' : activeResidentsCount}
                        </span>{' '}
                        active resident(s) for{' '}
                        <span className="font-bold">{generateFormData.month || '—'}</span>.
                        Residents who already have a bill for this month will be automatically skipped.
                      </p>
                    </div>
                  </div>
                )}

                {/* Resident Dropdown — only for individual mode */}
                {billMode === 'individual' && (
                  <div>
                    <label htmlFor="bill-resident" className="block text-sm font-medium text-charcoal mb-1">
                      Select Resident <span className="text-error">*</span>
                    </label>
                    <select
                      id="bill-resident"
                      value={generateFormData.residentId}
                      onChange={handleResidentChange}
                      disabled={generateSubmitLoading || residentsLoading}
                      className={`w-full h-11 px-3.5 py-2.5 bg-white border rounded-lg text-charcoal focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 focus:border-[#0F172A] transition-colors cursor-pointer ${
                        generateFormErrors.residentId ? 'border-error' : 'border-border'
                      }`}
                    >
                      <option value="">
                        {residentsLoading ? 'Loading residents list...' : '-- Choose a resident --'}
                      </option>
                      {residents.map((r) => (
                        <option key={r._id} value={r._id}>
                          {r.name} {r.unitNumber ? `(Unit: ${r.unitNumber})` : '(No Unit Assigned)'} — {r.email}
                        </option>
                      ))}
                    </select>
                    {generateFormErrors.residentId && (
                      <p className="mt-1 text-xs text-error font-medium">{generateFormErrors.residentId}</p>
                    )}
                  </div>
                )}

                {/* Unit Number & Amount in 2 columns */}
                <div className={`grid gap-4 ${billMode === 'individual' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
                  {billMode === 'individual' && (
                    <div>
                      <label htmlFor="bill-unit" className="block text-sm font-medium text-charcoal mb-1">
                        Unit Number <span className="text-error">*</span>
                      </label>
                      <input
                        id="bill-unit"
                        type="text"
                        placeholder="e.g. A-101"
                        value={generateFormData.unitNumber}
                        onChange={(e) => {
                          setGenerateFormData({ ...generateFormData, unitNumber: e.target.value });
                          if (generateFormErrors.unitNumber) {
                            setGenerateFormErrors({ ...generateFormErrors, unitNumber: '' });
                          }
                        }}
                        disabled={generateSubmitLoading}
                        className={`w-full h-11 px-3.5 py-2.5 bg-white border rounded-lg text-charcoal placeholder-slate/40 focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 focus:border-[#0F172A] transition-colors ${
                          generateFormErrors.unitNumber ? 'border-error' : 'border-border'
                        }`}
                      />
                      {generateFormErrors.unitNumber && (
                        <p className="mt-1 text-xs text-error font-medium">{generateFormErrors.unitNumber}</p>
                      )}
                    </div>
                  )}

                  <div>
                    <label htmlFor="bill-amount" className="block text-sm font-medium text-charcoal mb-1">
                      Amount (₹) <span className="text-error">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate font-semibold text-sm">
                        ₹
                      </span>
                      <input
                        id="bill-amount"
                        type="number"
                        min="1"
                        step="any"
                        placeholder="e.g. 1500"
                        value={generateFormData.amount}
                        onChange={(e) => {
                          setGenerateFormData({ ...generateFormData, amount: e.target.value });
                          if (generateFormErrors.amount) {
                            setGenerateFormErrors({ ...generateFormErrors, amount: '' });
                          }
                        }}
                        disabled={generateSubmitLoading}
                        className={`w-full h-11 pl-8 pr-3.5 py-2.5 bg-white border rounded-lg text-charcoal placeholder-slate/40 focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 focus:border-[#0F172A] transition-colors ${
                          generateFormErrors.amount ? 'border-error' : 'border-border'
                        }`}
                      />
                    </div>
                    {generateFormErrors.amount && (
                      <p className="mt-1 text-xs text-error font-medium">{generateFormErrors.amount}</p>
                    )}
                  </div>
                </div>

                {/* Month & Due Date in 2 columns */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="bill-month" className="block text-sm font-medium text-charcoal mb-1">
                      Billing Month <span className="text-error">*</span>
                    </label>
                    <input
                      id="bill-month"
                      type="text"
                      placeholder="e.g. August 2026"
                      value={generateFormData.month}
                      onChange={(e) => {
                        setGenerateFormData({ ...generateFormData, month: e.target.value });
                        if (generateFormErrors.month) {
                          setGenerateFormErrors({ ...generateFormErrors, month: '' });
                        }
                      }}
                      disabled={generateSubmitLoading}
                      className={`w-full h-11 px-3.5 py-2.5 bg-white border rounded-lg text-charcoal placeholder-slate/40 focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 focus:border-[#0F172A] transition-colors ${
                        generateFormErrors.month ? 'border-error' : 'border-border'
                      }`}
                    />
                    {generateFormErrors.month && (
                      <p className="mt-1 text-xs text-error font-medium">{generateFormErrors.month}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="bill-due-date" className="block text-sm font-medium text-charcoal mb-1">
                      Due Date <span className="text-error">*</span>
                    </label>
                    <input
                      id="bill-due-date"
                      type="date"
                      value={generateFormData.dueDate}
                      onChange={(e) => {
                        setGenerateFormData({ ...generateFormData, dueDate: e.target.value });
                        if (generateFormErrors.dueDate) {
                          setGenerateFormErrors({ ...generateFormErrors, dueDate: '' });
                        }
                      }}
                      disabled={generateSubmitLoading}
                      className={`w-full h-11 px-3.5 py-2.5 bg-white border rounded-lg text-charcoal placeholder-slate/40 focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 focus:border-[#0F172A] transition-colors ${
                        generateFormErrors.dueDate ? 'border-error' : 'border-border'
                      }`}
                    />
                    {generateFormErrors.dueDate && (
                      <p className="mt-1 text-xs text-error font-medium">{generateFormErrors.dueDate}</p>
                    )}
                  </div>
                </div>

                {/* Optional Description (shown in bulk mode) */}
                {billMode === 'bulk' && (
                  <div>
                    <label htmlFor="bill-description" className="block text-sm font-medium text-charcoal mb-1">
                      Notes <span className="text-slate font-normal">(optional)</span>
                    </label>
                    <input
                      id="bill-description"
                      type="text"
                      placeholder="e.g. Monthly maintenance charges including water & security"
                      value={generateFormData.description}
                      onChange={(e) =>
                        setGenerateFormData({ ...generateFormData, description: e.target.value })
                      }
                      disabled={generateSubmitLoading}
                      className="w-full h-11 px-3.5 py-2.5 bg-white border border-border rounded-lg text-charcoal placeholder-slate/40 focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 focus:border-[#0F172A] transition-colors"
                    />
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 bg-slate-50 border-t border-border flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsGenerateModalOpen(false)}
                  disabled={generateSubmitLoading}
                  className="bg-white border border-border text-charcoal hover:bg-slate-100 font-medium px-4 py-2.5 text-sm rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={generateSubmitLoading}
                  className="bg-[#0F172A] hover:bg-[#1E293B] text-[#D4AF37] border border-[#D4AF37]/30 font-semibold px-5 py-2.5 text-sm rounded-lg transition-colors cursor-pointer flex items-center space-x-2 shadow-md active:scale-98 disabled:opacity-50"
                >
                  {generateSubmitLoading ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-[#D4AF37]" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      {billMode === 'bulk' ? <Users className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      <span>{billMode === 'bulk' ? 'Generate All Bills' : 'Generate Bill'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payments;
