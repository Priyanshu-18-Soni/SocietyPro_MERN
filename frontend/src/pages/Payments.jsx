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
  AlertTriangle
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

        <button
          onClick={fetchBills}
          disabled={loading}
          className="h-10 px-4 bg-white border border-border hover:bg-slate-50 text-slate font-medium text-xs rounded-lg transition-colors flex items-center gap-2 shadow-xs cursor-pointer active:scale-98 self-start sm:self-auto"
          title="Refresh Bills"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
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
    </div>
  );
};

export default Payments;
