import { useState, useEffect } from 'react';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Receipt, 
  Plus, 
  X, 
  AlertCircle, 
  CheckCircle, 
  Calendar, 
  RefreshCw, 
  ArrowUpRight, 
  ArrowDownLeft, 
  IndianRupee, 
  User, 
  Tag,
  CreditCard,
  Building
} from 'lucide-react';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';

const COMMON_CATEGORIES = [
  'Maintenance & Repairs',
  'Security Services',
  'Electricity & Utilities',
  'Housekeeping & Cleaning',
  'Water Supply & Tankers',
  'Lift & Elevator AMC',
  'Gardening & Landscaping',
  'Generator & Diesel',
  'Staff Salary & Wages',
  'Events & Festivals',
  'Administrative & Legal',
  'Other'
];

const Ledger = () => {
  const { user } = useAuth();

  const canRecordExpense =
    user?.role === 'SocietyOwner' ||
    (user?.role === 'Committee' && user?.permissions?.includes('manageBills'));

  const [metrics, setMetrics] = useState({
    totalIncome: 0,
    totalExpense: 0,
    netBalance: 0,
    totalTransactions: 0,
  });
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [notification, setNotification] = useState(null);

  // Record Expense Modal State
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseFormData, setExpenseFormData] = useState({
    category: 'Maintenance & Repairs',
    customCategory: '',
    amount: '',
    paymentMethod: 'bank_transfer',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [expenseFormErrors, setExpenseFormErrors] = useState({});
  const [expenseSubmitLoading, setExpenseSubmitLoading] = useState(false);
  const [expenseSubmitError, setExpenseSubmitError] = useState('');

  // Fetch Treasury Metrics & Ledger entries
  const fetchLedgerData = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axiosInstance.get('/finances/metrics');
      setMetrics(response.data.metrics || {
        totalIncome: 0,
        totalExpense: 0,
        netBalance: 0,
        totalTransactions: 0,
      });
      setEntries(response.data.entries || []);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to load treasury metrics and ledger data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedgerData();
  }, []);

  // Open Record Expense Modal
  const handleOpenExpenseModal = () => {
    setExpenseFormData({
      category: 'Maintenance & Repairs',
      customCategory: '',
      amount: '',
      paymentMethod: 'bank_transfer',
      description: '',
      date: new Date().toISOString().split('T')[0],
    });
    setExpenseFormErrors({});
    setExpenseSubmitError('');
    setIsExpenseModalOpen(true);
  };

  // Submit Manual Expense
  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    setExpenseSubmitError('');

    const errors = {};
    const finalCategory =
      expenseFormData.category === 'Other'
        ? expenseFormData.customCategory.trim()
        : expenseFormData.category;

    if (!finalCategory) {
      errors.category = 'Category is required';
    }

    const numAmount = Number(expenseFormData.amount);
    if (!expenseFormData.amount || isNaN(numAmount) || numAmount <= 0) {
      errors.amount = 'Please enter a valid expense amount in Rupees greater than ₹0';
    }

    if (!expenseFormData.description.trim()) {
      errors.description = 'Description is required';
    }

    if (!expenseFormData.date) {
      errors.date = 'Date is required';
    }

    setExpenseFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setExpenseSubmitLoading(true);
    try {
      const payload = {
        category: finalCategory,
        amount: numAmount,
        paymentMethod: expenseFormData.paymentMethod,
        description: expenseFormData.description.trim(),
        date: expenseFormData.date,
      };

      await axiosInstance.post('/finances/expenses', payload);

      setIsExpenseModalOpen(false);
      setNotification({
        type: 'success',
        message: `Expense of ₹${numAmount.toLocaleString('en-IN')} for "${finalCategory}" recorded successfully!`,
      });
      fetchLedgerData();
    } catch (err) {
      console.error(err);
      setExpenseSubmitError(err.response?.data?.message || 'Failed to record expense. Please try again.');
    } finally {
      setExpenseSubmitLoading(false);
    }
  };

  // Filter entries based on active tab
  const filteredEntries = entries.filter((entry) => {
    if (activeTab === 'All') return true;
    if (activeTab === 'Income') return entry.type === 'income';
    if (activeTab === 'Expense') return entry.type === 'expense';
    return true;
  });

  const getMethodBadge = (method) => {
    switch (method) {
      case 'razorpay':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <CreditCard className="w-3 h-3" />
            <span>Razorpay Gateway</span>
          </span>
        );
      case 'bank_transfer':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <Building className="w-3 h-3" />
            <span>Bank Transfer</span>
          </span>
        );
      case 'cash':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <IndianRupee className="w-3 h-3" />
            <span>Cash</span>
          </span>
        );
      case 'cheque':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Receipt className="w-3 h-3" />
            <span>Bank Cheque</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 uppercase">
            {method}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-6">
        <div className="text-left">
          <div className="flex items-center space-x-2.5">
            <h1 className="text-3xl font-bold text-charcoal tracking-tight">Treasury Ledger</h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-subtle text-primary border border-primary/20">
              <Wallet className="w-3.5 h-3.5" />
              <span>Accounts</span>
            </span>
          </div>
          <p className="text-sm text-slate mt-1">
            Real-time society financial accounts, automated maintenance collections, and operational expenses.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {canRecordExpense && (
            <button
              onClick={handleOpenExpenseModal}
              className="h-10 px-4 bg-[#0F172A] hover:bg-[#1E293B] active:scale-98 text-[#D4AF37] font-semibold text-xs sm:text-sm rounded-lg transition-all flex items-center gap-2 shadow-sm border border-[#D4AF37]/30 cursor-pointer"
              title="Record an Expense"
            >
              <Plus className="w-4 h-4" />
              <span>Record Expense</span>
            </button>
          )}

          <button
            onClick={fetchLedgerData}
            disabled={loading}
            className="h-10 px-4 bg-white border border-border hover:bg-slate-50 text-slate font-medium text-xs rounded-lg transition-colors flex items-center gap-2 shadow-xs cursor-pointer active:scale-98"
            title="Refresh Ledger"
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
            onClick={fetchLedgerData}
            className="text-sm text-error underline hover:text-red-700 font-semibold cursor-pointer ml-3"
          >
            Retry
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Total Inflow */}
        <div className="bg-white border border-border rounded-2xl p-5 sm:p-6 flex items-center justify-between shadow-xs hover:shadow-md transition-all duration-200">
          <div className="space-y-1 text-left">
            <span className="text-xs font-semibold text-slate uppercase tracking-wider block">
              Total Inflow
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-emerald-700">
              ₹{(metrics.totalIncome || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </h2>
            <p className="text-emerald-700 text-xs font-semibold flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Auto-credited collections</span>
            </p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200 shadow-2xs">
            <ArrowDownLeft className="h-6 w-6" />
          </div>
        </div>

        {/* Total Outflow */}
        <div className="bg-white border border-border rounded-2xl p-5 sm:p-6 flex items-center justify-between shadow-xs hover:shadow-md transition-all duration-200">
          <div className="space-y-1 text-left">
            <span className="text-xs font-semibold text-slate uppercase tracking-wider block">
              Total Outflow
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-rose-700">
              ₹{(metrics.totalExpense || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </h2>
            <p className="text-rose-700 text-xs font-semibold flex items-center gap-1">
              <TrendingDown className="w-3.5 h-3.5" />
              <span>Disbursed society expenses</span>
            </p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200 shadow-2xs">
            <ArrowUpRight className="h-6 w-6" />
          </div>
        </div>

        {/* Net Reserve Balance */}
        <div className="bg-white border border-border rounded-2xl p-5 sm:p-6 flex items-center justify-between shadow-xs hover:shadow-md transition-all duration-200">
          <div className="space-y-1 text-left">
            <span className="text-xs font-semibold text-slate uppercase tracking-wider block">
              Net Reserve
            </span>
            <h2 className={`text-2xl sm:text-3xl font-bold ${metrics.netBalance >= 0 ? 'text-charcoal' : 'text-rose-700'}`}>
              {metrics.netBalance < 0 ? '-' : ''}₹{Math.abs(metrics.netBalance || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </h2>
            <p className="text-slate text-xs font-semibold flex items-center gap-1">
              <Receipt className="w-3.5 h-3.5 text-primary" />
              <span>{metrics.totalTransactions || 0} recorded ledger entries</span>
            </p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-[#0F172A] text-[#D4AF37] flex items-center justify-center border border-[#D4AF37]/30 shadow-2xs">
            <Wallet className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex border-b border-border pb-1">
        <div className="flex space-x-1.5 p-1 bg-slate-100/70 rounded-xl border border-border/40">
          {['All', 'Income', 'Expense'].map((tab) => {
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
                {tab === 'All' ? 'All Transactions' : tab === 'Income' ? 'Income (Inflow)' : 'Expenses (Outflow)'}
              </button>
            );
          })}
        </div>
      </div>

      {/* Transactions Table / List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="p-5 bg-white border border-border rounded-2xl shadow-xs animate-pulse flex items-center justify-between"
            >
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-slate-100 rounded-xl"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-slate-100 rounded w-36"></div>
                  <div className="h-3 bg-slate-100 rounded w-48"></div>
                </div>
              </div>
              <div className="h-6 bg-slate-100 rounded w-24"></div>
            </div>
          ))}
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-border shadow-xs">
          <Receipt className="h-12 w-12 text-slate/30 mx-auto mb-3" />
          <h3 className="text-charcoal font-bold text-base">No transactions found</h3>
          <p className="text-slate text-xs mt-1 max-w-sm mx-auto">
            There are no financial records found under the '{activeTab}' category.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-border rounded-2xl shadow-xs overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-border text-[11px] font-bold text-slate uppercase tracking-wider">
                  <th className="py-3.5 px-6">Type</th>
                  <th className="py-3.5 px-6">Category & Description</th>
                  <th className="py-3.5 px-6">Payment Method</th>
                  <th className="py-3.5 px-6">Date</th>
                  <th className="py-3.5 px-6 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {filteredEntries.map((entry) => {
                  const isIncome = entry.type === 'income';
                  const amountInRupees = entry.amountInRupees !== undefined ? entry.amountInRupees : (entry.amountInPaise / 100);
                  const formattedDate = entry.date
                    ? new Date(entry.date).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : 'N/A';
                  const recordedName = entry.recordedBy?.name || (isIncome ? 'Razorpay Webhook' : 'Society Admin');

                  return (
                    <tr 
                      key={entry._id}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      {/* Type Badge */}
                      <td className="py-4 px-6 align-middle">
                        {isIncome ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <ArrowDownLeft className="w-3.5 h-3.5" />
                            <span>Income</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            <span>Expense</span>
                          </span>
                        )}
                      </td>

                      {/* Category & Description */}
                      <td className="py-4 px-6 align-middle">
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 font-semibold text-charcoal text-sm">
                            <Tag className="w-3 h-3 text-primary" />
                            <span>{entry.category}</span>
                          </span>
                          <p className="text-xs text-slate line-clamp-1">{entry.description}</p>
                        </div>
                      </td>

                      {/* Payment Method */}
                      <td className="py-4 px-6 align-middle">
                        {getMethodBadge(entry.paymentMethod)}
                      </td>

                      {/* Date & Author */}
                      <td className="py-4 px-6 align-middle">
                        <div className="space-y-0.5 text-xs text-slate">
                          <span className="flex items-center gap-1 text-charcoal font-medium">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>{formattedDate}</span>
                          </span>
                          <span className="text-[11px] text-slate-500 block">
                            By {recordedName}
                          </span>
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="py-4 px-6 align-middle text-right">
                        <span className={`text-base font-extrabold ${isIncome ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {isIncome ? '+' : '-'}₹{amountInRupees.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Stack */}
          <div className="md:hidden divide-y divide-border">
            {filteredEntries.map((entry) => {
              const isIncome = entry.type === 'income';
              const amountInRupees = entry.amountInRupees !== undefined ? entry.amountInRupees : (entry.amountInPaise / 100);
              const formattedDate = entry.date
                ? new Date(entry.date).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })
                : 'N/A';
              const recordedName = entry.recordedBy?.name || (isIncome ? 'Razorpay Webhook' : 'Society Admin');

              return (
                <div key={entry._id} className="p-4 space-y-3 text-left">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {isIncome ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <ArrowDownLeft className="w-3 h-3" />
                          <span>Income</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase bg-rose-50 text-rose-700 border border-rose-200">
                          <ArrowUpRight className="w-3 h-3" />
                          <span>Expense</span>
                        </span>
                      )}
                      <span className="text-xs font-semibold text-charcoal">{entry.category}</span>
                    </div>

                    <span className={`text-base font-extrabold ${isIncome ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {isIncome ? '+' : '-'}₹{amountInRupees.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed">{entry.description}</p>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                    <div className="flex items-center gap-1.5">
                      {getMethodBadge(entry.paymentMethod)}
                    </div>
                    <span>{formattedDate} • {recordedName}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Record Expense Modal */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 bg-charcoal/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-lg border border-border w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150 text-left">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-rose-50 text-rose-600 rounded-lg border border-rose-200/60">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-charcoal">Record Society Expense</h3>
                  <p className="text-xs text-slate">Log an operational disbursement in the society treasury ledger.</p>
                </div>
              </div>
              <button
                onClick={() => setIsExpenseModalOpen(false)}
                className="text-slate hover:text-charcoal cursor-pointer p-1 rounded-lg hover:bg-slate-100 transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleExpenseSubmit}>
              <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                {expenseSubmitError && (
                  <div className="p-3 bg-red-50 border border-error/20 text-error rounded-lg text-sm font-medium flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{expenseSubmitError}</span>
                  </div>
                )}

                {/* Category Dropdown */}
                <div>
                  <label htmlFor="expense-category" className="block text-sm font-medium text-charcoal mb-1">
                    Expense Category <span className="text-error">*</span>
                  </label>
                  <select
                    id="expense-category"
                    value={expenseFormData.category}
                    onChange={(e) => {
                      setExpenseFormData({ ...expenseFormData, category: e.target.value });
                      if (expenseFormErrors.category) {
                        setExpenseFormErrors({ ...expenseFormErrors, category: '' });
                      }
                    }}
                    disabled={expenseSubmitLoading}
                    className="w-full h-11 px-3.5 py-2.5 bg-white border border-border rounded-lg text-charcoal focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 focus:border-[#0F172A] transition-colors cursor-pointer"
                  >
                    {COMMON_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Custom Category Input (if 'Other' is selected) */}
                {expenseFormData.category === 'Other' && (
                  <div>
                    <label htmlFor="expense-custom-category" className="block text-sm font-medium text-charcoal mb-1">
                      Specify Custom Category <span className="text-error">*</span>
                    </label>
                    <input
                      id="expense-custom-category"
                      type="text"
                      placeholder="e.g. Diwali Lighting & Decoration"
                      value={expenseFormData.customCategory}
                      onChange={(e) => {
                        setExpenseFormData({ ...expenseFormData, customCategory: e.target.value });
                        if (expenseFormErrors.category) {
                          setExpenseFormErrors({ ...expenseFormErrors, category: '' });
                        }
                      }}
                      disabled={expenseSubmitLoading}
                      className={`w-full h-11 px-3.5 py-2.5 bg-white border rounded-lg text-charcoal placeholder-slate/40 focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 focus:border-[#0F172A] transition-colors ${
                        expenseFormErrors.category ? 'border-error' : 'border-border'
                      }`}
                    />
                    {expenseFormErrors.category && (
                      <p className="mt-1 text-xs text-error font-medium">{expenseFormErrors.category}</p>
                    )}
                  </div>
                )}

                {/* Amount (in Rupees) & Payment Method in 2 columns */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="expense-amount" className="block text-sm font-medium text-charcoal mb-1">
                      Amount (₹) <span className="text-error">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate font-semibold text-sm">
                        ₹
                      </span>
                      <input
                        id="expense-amount"
                        type="number"
                        min="1"
                        step="any"
                        placeholder="e.g. 3500"
                        value={expenseFormData.amount}
                        onChange={(e) => {
                          setExpenseFormData({ ...expenseFormData, amount: e.target.value });
                          if (expenseFormErrors.amount) {
                            setExpenseFormErrors({ ...expenseFormErrors, amount: '' });
                          }
                        }}
                        disabled={expenseSubmitLoading}
                        className={`w-full h-11 pl-8 pr-3.5 py-2.5 bg-white border rounded-lg text-charcoal placeholder-slate/40 focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 focus:border-[#0F172A] transition-colors ${
                          expenseFormErrors.amount ? 'border-error' : 'border-border'
                        }`}
                      />
                    </div>
                    {expenseFormErrors.amount && (
                      <p className="mt-1 text-xs text-error font-medium">{expenseFormErrors.amount}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="expense-method" className="block text-sm font-medium text-charcoal mb-1">
                      Payment Method <span className="text-error">*</span>
                    </label>
                    <select
                      id="expense-method"
                      value={expenseFormData.paymentMethod}
                      onChange={(e) => setExpenseFormData({ ...expenseFormData, paymentMethod: e.target.value })}
                      disabled={expenseSubmitLoading}
                      className="w-full h-11 px-3.5 py-2.5 bg-white border border-border rounded-lg text-charcoal focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 focus:border-[#0F172A] transition-colors cursor-pointer"
                    >
                      <option value="bank_transfer">Bank Transfer (NEFT/IMPS)</option>
                      <option value="cash">Cash Payment</option>
                      <option value="cheque">Bank Cheque</option>
                      <option value="razorpay">Razorpay / Online</option>
                    </select>
                  </div>
                </div>

                {/* Expense Date */}
                <div>
                  <label htmlFor="expense-date" className="block text-sm font-medium text-charcoal mb-1">
                    Expense Date <span className="text-error">*</span>
                  </label>
                  <input
                    id="expense-date"
                    type="date"
                    value={expenseFormData.date}
                    onChange={(e) => {
                      setExpenseFormData({ ...expenseFormData, date: e.target.value });
                      if (expenseFormErrors.date) {
                        setExpenseFormErrors({ ...expenseFormErrors, date: '' });
                      }
                    }}
                    disabled={expenseSubmitLoading}
                    className={`w-full h-11 px-3.5 py-2.5 bg-white border rounded-lg text-charcoal placeholder-slate/40 focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 focus:border-[#0F172A] transition-colors ${
                      expenseFormErrors.date ? 'border-error' : 'border-border'
                    }`}
                  />
                  {expenseFormErrors.date && (
                    <p className="mt-1 text-xs text-error font-medium">{expenseFormErrors.date}</p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label htmlFor="expense-description" className="block text-sm font-medium text-charcoal mb-1">
                    Description & Invoice Notes <span className="text-error">*</span>
                  </label>
                  <textarea
                    id="expense-description"
                    rows={3}
                    placeholder="Provide details: vendor name, invoice/bill number, exact nature of work or equipment..."
                    value={expenseFormData.description}
                    onChange={(e) => {
                      setExpenseFormData({ ...expenseFormData, description: e.target.value });
                      if (expenseFormErrors.description) {
                        setExpenseFormErrors({ ...expenseFormErrors, description: '' });
                      }
                    }}
                    disabled={expenseSubmitLoading}
                    className={`w-full p-3.5 bg-white border rounded-lg text-charcoal placeholder-slate/40 focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 focus:border-[#0F172A] transition-colors ${
                      expenseFormErrors.description ? 'border-error' : 'border-border'
                    }`}
                  />
                  {expenseFormErrors.description && (
                    <p className="mt-1 text-xs text-error font-medium">{expenseFormErrors.description}</p>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 bg-slate-50 border-t border-border flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  disabled={expenseSubmitLoading}
                  className="bg-white border border-border text-charcoal hover:bg-slate-100 font-medium px-4 py-2.5 text-sm rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={expenseSubmitLoading}
                  className="bg-[#0F172A] hover:bg-[#1E293B] text-[#D4AF37] border border-[#D4AF37]/30 font-semibold px-5 py-2.5 text-sm rounded-lg transition-colors cursor-pointer flex items-center space-x-2 shadow-md active:scale-98 disabled:opacity-50"
                >
                  {expenseSubmitLoading ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-[#D4AF37]" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <span>Recording...</span>
                    </>
                  ) : (
                    <>
                      <Receipt className="w-4 h-4" />
                      <span>Record Expense</span>
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

export default Ledger;
