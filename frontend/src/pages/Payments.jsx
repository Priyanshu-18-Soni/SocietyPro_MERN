import { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  MoreVertical, 
  CreditCard, 
  Calendar, 
  Check
} from 'lucide-react';
import axiosInstance from '../api/axiosInstance';

// TODO: connect to real bills API when Pushkar builds it
const DUMMY_BILLS = [
  { id: '1', flatNumber: 'Flat A-101', month: 'August 2026', dueDate: '15-Aug-2026', amount: 2500, status: 'Pending' },
  { id: '2', flatNumber: 'Flat B-204', month: 'August 2026', dueDate: '15-Aug-2026', amount: 1800, status: 'Pending' },
  { id: '3', flatNumber: 'Flat A-302', month: 'July 2026', dueDate: '15-Jul-2026', amount: 2500, status: 'Paid' },
  { id: '4', flatNumber: 'Flat C-105', month: 'July 2026', dueDate: '15-Jul-2026', amount: 2200, status: 'Paid' },
  { id: '5', flatNumber: 'Flat B-401', month: 'June 2026', dueDate: '15-Jun-2026', amount: 1800, status: 'Paid' },
  { id: '6', flatNumber: 'Flat A-102', month: 'June 2026', dueDate: '15-Jun-2026', amount: 2500, status: 'Voided' }
];

const Payments = () => {
  const [bills, setBills] = useState(DUMMY_BILLS);
  const [activeTab, setActiveTab] = useState('All');
  const [loadingBillId, setLoadingBillId] = useState(null);
  const [notification, setNotification] = useState(null);
  const [activeMenuId, setActiveMenuId] = useState(null);

  // Dynamic calculations based on state
  const collectedAmount = bills
    .filter(b => b.status === 'Paid')
    .reduce((sum, b) => sum + b.amount, 0);

  const collectedCount = bills.filter(b => b.status === 'Paid').length;

  const pendingAmount = bills
    .filter(b => b.status === 'Pending')
    .reduce((sum, b) => sum + b.amount, 0);

  const pendingCount = bills.filter(b => b.status === 'Pending').length;

  const filteredBills = bills.filter((bill) => {
    if (activeTab === 'All') return true;
    return bill.status === activeTab;
  });

  // Dynamic script loader for Razorpay
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

  const handlePayment = async (bill) => {
    if (bill.status !== 'Pending') return;
    
    setLoadingBillId(bill.id);
    setNotification(null);
    setActiveMenuId(null);

    try {
      // 1. Create Razorpay order
      const response = await axiosInstance.post('/payments/create-order', {
        amount: bill.amount
      });

      const { orderId, amount, currency, key } = response.data;

      // 2. Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Razorpay SDK failed to load. Please check your connection.');
      }

      // 3. Configure Razorpay options
      const options = {
        key: key,
        amount: amount, // in paise
        currency: currency,
        name: 'SocietyPro',
        description: `Maintenance for ${bill.month} - ${bill.flatNumber}`,
        order_id: orderId,
        theme: {
          color: '#0F172A' // Dark Navy matching theme
        },
        handler: async (paymentResponse) => {
          setLoadingBillId(bill.id);
          try {
            // Verify payment on backend
            await axiosInstance.post('/payments/verify', {
              razorpay_order_id: paymentResponse.razorpay_order_id,
              razorpay_payment_id: paymentResponse.razorpay_payment_id,
              razorpay_signature: paymentResponse.razorpay_signature
            });

            // Mark local bill as paid
            setBills(prevBills => 
              prevBills.map(b => b.id === bill.id ? { ...b, status: 'Paid' } : b)
            );

            setNotification({
              type: 'success',
              message: `Payment successful for ${bill.flatNumber} (${bill.month})!`
            });
          } catch (err) {
            console.error(err);
            setNotification({
              type: 'error',
              message: err.response?.data?.message || 'Payment verification failed.'
            });
          } finally {
            setLoadingBillId(null);
          }
        },
        modal: {
          ondismiss: () => {
            setLoadingBillId(null);
          }
        }
      };

      const razorpayInstance = new window.Razorpay(options);
      razorpayInstance.open();

    } catch (err) {
      console.error(err);
      setNotification({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Failed to initiate payment.'
      });
      setLoadingBillId(null);
    }
  };

  // Close menus on clicking outside
  useEffect(() => {
    const handleOutsideClick = () => setActiveMenuId(null);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-left">
          <h1 className="text-2xl font-bold text-slate-800">Payments & Bills</h1>
          <p className="text-slate-500 text-sm mt-1">Manage and settle society dues and utility payments.</p>
        </div>
      </div>

      {/* Notifications */}
      {notification && (
        <div 
          className={`p-4 rounded-xl border flex items-start space-x-3 transition-all duration-300 ${
            notification.type === 'success' 
              ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
              : 'bg-red-50 border-red-100 text-red-800'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 text-sm font-medium text-left">{notification.message}</div>
          <button 
            onClick={() => setNotification(null)}
            className="text-xs font-bold hover:underline shrink-0 opacity-80 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Collected */}
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
          <div className="space-y-1 text-left">
            <span className="text-emerald-700 text-sm font-semibold uppercase tracking-wider">Collected</span>
            <h2 className="text-3xl font-extrabold text-slate-800">₹{collectedAmount.toLocaleString('en-IN')}</h2>
            <p className="text-emerald-600/80 text-xs font-semibold">{collectedCount} bills paid</p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-sm">
            <CheckCircle className="h-6 w-6" />
          </div>
        </div>

        {/* Pending */}
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
          <div className="space-y-1 text-left">
            <span className="text-amber-700 text-sm font-semibold uppercase tracking-wider">Pending</span>
            <h2 className="text-3xl font-extrabold text-slate-800">₹{pendingAmount.toLocaleString('en-IN')}</h2>
            <p className="text-amber-600/80 text-xs font-semibold">{pendingCount} bills unpaid</p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shadow-sm">
            <Clock className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex border-b border-slate-200">
        <div className="flex space-x-1.5 p-1 bg-slate-100 rounded-xl">
          {['All', 'Pending', 'Paid', 'Voided'].map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#0F172A] text-[#D4AF37] shadow-sm'
                    : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200/50'
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bill List */}
      <div className="space-y-3">
        {filteredBills.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-100 shadow-sm">
            <CreditCard className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-slate-600 font-semibold text-sm">No bills found</h3>
            <p className="text-slate-400 text-xs mt-0.5">There are no bills under the '{activeTab}' filter.</p>
          </div>
        ) : (
          filteredBills.map((bill) => {
            const isPending = bill.status === 'Pending';
            const isPaid = bill.status === 'Paid';
            const isVoided = bill.status === 'Voided';
            const isProcessing = loadingBillId === bill.id;

            return (
              <div 
                key={bill.id}
                onClick={() => isPending && !isProcessing && handlePayment(bill)}
                className={`group flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white border border-slate-100 hover:border-slate-200/80 rounded-2xl shadow-sm transition-all duration-200 relative ${
                  isPending ? 'cursor-pointer hover:shadow-md' : 'cursor-default'
                }`}
              >
                <div className="flex items-center space-x-4">
                  {/* Status Indicator Icon */}
                  <div className={`h-10 w-10 shrink-0 rounded-xl flex items-center justify-center shadow-sm ${
                    isPaid 
                      ? 'bg-emerald-50 text-emerald-600' 
                      : isVoided 
                        ? 'bg-slate-100 text-slate-400' 
                        : 'bg-amber-50 text-amber-600'
                  }`}>
                    {isPaid ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : isVoided ? (
                      <AlertCircle className="h-5 w-5" />
                    ) : (
                      <Clock className="h-5 w-5 animate-pulse" />
                    )}
                  </div>

                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-800">{bill.flatNumber}</h4>
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md uppercase border ${
                        isPaid 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                          : isVoided 
                            ? 'bg-slate-100 text-slate-500 border-slate-200' 
                            : 'bg-amber-50 text-amber-700 border-amber-100'
                      }`}>
                        {bill.status}
                      </span>
                    </div>
                    <div className="flex items-center space-x-3 text-slate-400 text-xs mt-1">
                      <span className="flex items-center gap-1 font-semibold text-slate-500">
                        <Calendar className="h-3.5 w-3.5" />
                        {bill.month}
                      </span>
                      <span>•</span>
                      <span>Due: {bill.dueDate}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 mt-3 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-50">
                  <div className="text-left sm:text-right">
                    <span className="text-xs text-slate-400 font-semibold block sm:inline">Amount</span>
                    <span className="text-lg font-extrabold text-[#0F172A] ml-1 sm:ml-0">
                      ₹{bill.amount.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    {isPending && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePayment(bill);
                        }}
                        disabled={isProcessing}
                        className="px-3.5 py-1.5 bg-[#0F172A] hover:bg-[#1E293B] active:scale-95 text-[#D4AF37] text-xs font-bold rounded-lg transition-all border border-[#D4AF37]/20 flex items-center gap-1.5 shadow-sm shrink-0 cursor-pointer"
                      >
                        {isProcessing ? (
                          <>
                            <span className="animate-spin h-3.5 w-3.5 border-2 border-[#D4AF37] border-t-transparent rounded-full" />
                            <span>Paying...</span>
                          </>
                        ) : (
                          <>
                            <CreditCard className="h-3.5 w-3.5" />
                            <span>Pay Now</span>
                          </>
                        )}
                      </button>
                    )}

                    {isPaid && (
                      <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-100 flex items-center gap-1.5 shadow-xs shrink-0 select-none">
                        <Check className="h-3.5 w-3.5" />
                        <span>Settled</span>
                      </span>
                    )}

                    {/* Three Dot Options Menu */}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(activeMenuId === bill.id ? null : bill.id);
                        }}
                        className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg focus:outline-none transition-colors cursor-pointer"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>

                      {/* Dropdown Options */}
                      {activeMenuId === bill.id && (
                        <div className="absolute right-0 mt-2 w-40 bg-white border border-slate-100 rounded-xl shadow-lg z-10 py-1.5 text-left">
                          {isPending && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePayment(bill);
                              }}
                              className="w-full px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer border-none"
                            >
                              <CreditCard className="w-3.5 h-3.5 text-[#D4AF37]" />
                              Pay Bill
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setNotification({
                                type: 'success',
                                message: `Bill details for ${bill.flatNumber} (${bill.month}) copied to clipboard!`
                              });
                              setActiveMenuId(null);
                            }}
                            className="w-full px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer border-none"
                          >
                            <Calendar className="w-3.5 h-3.5 text-[#0F172A]" />
                            View Period
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Payments;
