import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import { Link } from 'react-router-dom';
import {
  Building,
  Users,
  Home,
  Bell,
  PlusCircle,
  ArrowRight,
  Shield,
  DollarSign,
  Activity,
  FileText,
  AlertCircle,
  Clock,
  CheckCircle,
  MessageSquare,
  Megaphone,
  Wallet,
  Calendar,
  Sparkles,
  RefreshCw,
  UserCheck,
  CreditCard
} from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSocieties: 0,
    totalResidents: 0,
    pendingDuesInRupees: 0,
    pendingBillsCount: 0,
    openComplaintsCount: 0,
    pendingApprovalsCount: 0,
    myPendingDuesInRupees: 0,
    myPaidDuesInRupees: 0,
    myEarliestDueDate: null,
    myPendingBillsCount: 0,
    myOpenComplaintsCount: 0,
    myTotalComplaintsCount: 0,
    latestNotice: null,
    recentNoticesCount: 0,
    recentComplaints: [],
  });

  const fetchStats = async () => {
    setLoading(true);

    const isSuperAdmin = user?.role === 'SuperAdmin';
    const isOwnerOrCommittee =
      user?.role === 'SocietyOwner' ||
      user?.role === 'Committee' ||
      user?.role === 'SocietyAdmin';
    const canManageResidents =
      user?.role === 'SocietyOwner' ||
      (user?.role === 'Committee' && user?.permissions?.includes('manageResidents'));

    try {
      const promises = [];

      if (isSuperAdmin) {
        promises.push(
          axiosInstance
            .get('/society')
            .then((res) => ({ type: 'societies', data: res.data }))
            .catch((err) => ({ type: 'societies', error: err }))
        );
      }

      // 1. Payments / Bills
      promises.push(
        axiosInstance
          .get('/payments')
          .then((res) => ({ type: 'payments', data: res.data }))
          .catch((err) => ({ type: 'payments', error: err }))
      );

      // 2. Complaints
      promises.push(
        axiosInstance
          .get('/complaints')
          .then((res) => ({ type: 'complaints', data: res.data }))
          .catch((err) => ({ type: 'complaints', error: err }))
      );

      // 3. Notices
      promises.push(
        axiosInstance
          .get('/notices')
          .then((res) => ({ type: 'notices', data: res.data }))
          .catch((err) => ({ type: 'notices', error: err }))
      );

      // 4. Users list (for Admin / Committee)
      if (isOwnerOrCommittee) {
        promises.push(
          axiosInstance
            .get('/users')
            .then((res) => ({ type: 'users', data: res.data }))
            .catch((err) => ({ type: 'users', error: err }))
        );

        // 5. Pending residents for approvals
        if (canManageResidents) {
          promises.push(
            axiosInstance
              .get('/users/residents/pending')
              .then((res) => ({ type: 'pendingResidents', data: res.data }))
              .catch((err) => ({ type: 'pendingResidents', error: err }))
          );
        }
      }

      const results = await Promise.allSettled(promises);

      const newStats = {
        totalSocieties: 0,
        totalResidents: 0,
        pendingDuesInRupees: 0,
        pendingBillsCount: 0,
        openComplaintsCount: 0,
        pendingApprovalsCount: 0,
        myPendingDuesInRupees: 0,
        myPaidDuesInRupees: 0,
        myEarliestDueDate: null,
        myPendingBillsCount: 0,
        myOpenComplaintsCount: 0,
        myTotalComplaintsCount: 0,
        latestNotice: null,
        recentNoticesCount: 0,
        recentComplaints: [],
      };

      results.forEach((result) => {
        if (result.status === 'fulfilled' && result.value) {
          const { type, data } = result.value;
          if (!data) return;

          if (type === 'societies') {
            newStats.totalSocieties = data.societies?.length || 0;
          } else if (type === 'payments') {
            const bills = data.bills || [];
            const pendingBills = bills.filter((b) => b.status !== 'captured');
            const paidBills = bills.filter((b) => b.status === 'captured');

            const pendingSum =
              pendingBills.reduce(
                (sum, b) => sum + (b.totalAmount || b.amount + (b.lateFee || 0)),
                0
              ) / 100;
            const paidSum =
              paidBills.reduce((sum, b) => sum + (b.amount + (b.lateFee || 0)), 0) / 100;

            newStats.pendingDuesInRupees = pendingSum;
            newStats.pendingBillsCount = pendingBills.length;
            newStats.myPendingDuesInRupees = pendingSum;
            newStats.myPaidDuesInRupees = paidSum;
            newStats.myPendingBillsCount = pendingBills.length;

            if (pendingBills.length > 0) {
              const sortedDueDates = pendingBills
                .filter((b) => b.dueDate)
                .map((b) => new Date(b.dueDate))
                .sort((a, b) => a - b);
              if (sortedDueDates.length > 0) {
                newStats.myEarliestDueDate = sortedDueDates[0].toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                });
              }
            }
          } else if (type === 'complaints') {
            const complaints = data.complaints || [];
            const openList = complaints.filter(
              (c) => c.status === 'open' || c.status === 'in_progress'
            );
            newStats.openComplaintsCount = openList.length;
            newStats.myOpenComplaintsCount = openList.length;
            newStats.myTotalComplaintsCount = complaints.length;
            newStats.recentComplaints = complaints.slice(0, 3);
          } else if (type === 'notices') {
            const notices = data.notices || [];
            newStats.recentNoticesCount = notices.length;
            if (notices.length > 0) {
              newStats.latestNotice = notices[0];
            }
          } else if (type === 'users') {
            const usersList = data.users || [];
            newStats.totalResidents = usersList.filter((u) => u.role === 'Resident').length;
          } else if (type === 'pendingResidents') {
            newStats.pendingApprovalsCount = data.pendingResidents?.length || 0;
          }
        }
      });

      setStats(newStats);
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Render SuperAdmin view
  const renderSuperAdminDashboard = () => {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-primary to-primary-light rounded-2xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
          <div className="relative z-10 max-w-xl text-left">
            <h1 className="text-3xl font-bold tracking-tight">Welcome Back, {user?.name || 'SuperAdmin'}!</h1>
            <p className="text-primary-subtle text-sm sm:text-base mt-2 font-medium">
              You are logged in as a System Administrator. From here, you can manage housing societies, register new portals, and monitor system performance.
            </p>
          </div>
          <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-15 pointer-events-none hidden md:block">
            <Shield className="w-full h-full text-white transform translate-x-12 translate-y-6" />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Societies Card */}
          <div className="bg-white rounded-xl shadow-xs border border-border p-6 flex items-center justify-between hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center space-x-4 text-left">
              <div className="p-3.5 rounded-lg bg-primary-subtle text-primary">
                <Building className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate">Registered Societies</p>
                <h3 className="text-2xl font-bold text-charcoal">
                  {loading ? (
                    <span className="inline-block w-12 h-6 bg-slate-100 rounded animate-pulse" />
                  ) : (
                    stats.totalSocieties
                  )}
                </h3>
              </div>
            </div>
            <Link
              to="/societies"
              className="p-1.5 rounded-full text-slate hover:bg-slate-100 hover:text-primary transition-all duration-200"
              title="Manage Societies"
            >
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>

          {/* Active Users Card */}
          <div className="bg-white rounded-xl shadow-xs border border-border p-6 flex items-center space-x-4 hover:shadow-md transition-shadow duration-200 text-left">
            <div className="p-3.5 rounded-lg bg-blue-50 text-info">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate">Portal Users</p>
              <h3 className="text-2xl font-bold text-charcoal">Active</h3>
            </div>
          </div>

          {/* System Security Status */}
          <div className="bg-white rounded-xl shadow-xs border border-border p-6 flex items-center space-x-4 hover:shadow-md transition-shadow duration-200 text-left">
            <div className="p-3.5 rounded-lg bg-emerald-50 text-success">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate">RBAC Security</p>
              <h3 className="text-2xl font-bold text-charcoal">Enabled</h3>
            </div>
          </div>
        </div>

        {/* Quick Actions & Recent Activity layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-left">
          {/* Quick Actions */}
          <div className="bg-white rounded-xl border border-border p-6 shadow-xs lg:col-span-1">
            <h2 className="text-lg font-bold text-charcoal mb-4 border-b border-border pb-3">Quick Actions</h2>
            <div className="space-y-3">
              <Link
                to="/societies"
                className="w-full h-11 bg-primary hover:bg-primary-light text-white font-medium px-4 py-2.5 rounded-lg transition-colors flex items-center justify-center space-x-2 shadow-sm text-sm"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Register New Society</span>
              </Link>
            </div>
          </div>

          {/* Activity Feed */}
          <div className="bg-white rounded-xl border border-border p-6 shadow-xs lg:col-span-2">
            <h2 className="text-lg font-bold text-charcoal mb-4 border-b border-border pb-3 flex items-center space-x-2">
              <Activity className="w-5 h-5 text-primary" />
              <span>System Activity Audit Log</span>
            </h2>
            <div className="space-y-4">
              <div className="flex items-start space-x-3 text-sm border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                <span className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                <div>
                  <p className="text-charcoal font-medium">Logged in successfully as SuperAdmin</p>
                  <p className="text-xs text-slate mt-0.5">Session active on portal</p>
                </div>
              </div>
              <div className="flex items-start space-x-3 text-sm border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                <span className="w-2 h-2 rounded-full bg-slate-300 mt-1.5 shrink-0" />
                <div>
                  <p className="text-charcoal font-medium">Multi-tenant database connected, {stats.totalSocieties} societies loaded</p>
                  <p className="text-xs text-slate mt-0.5">Automated synchronization</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render Society Owner / Committee View
  const renderSocietyAdminDashboard = () => {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-teal-700 to-primary-light rounded-2xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
          <div className="relative z-10 max-w-xl text-left">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight">Welcome, {user?.name || 'Admin'}</h1>
              <button
                onClick={fetchStats}
                disabled={loading}
                className="p-1 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Refresh Dashboard"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <p className="text-primary-subtle text-sm sm:text-base mt-2 font-medium">
              Manage your society residents, track maintenance collections, monitor grievance resolution, and review community circulars.
            </p>
          </div>
          <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-15 pointer-events-none hidden md:block">
            <Building className="w-full h-full text-white transform translate-x-12 translate-y-6" />
          </div>
        </div>

        {/* Pending Approvals Alert Banner (if any pending residents) */}
        {stats.pendingApprovalsCount > 0 && (
          <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl flex items-center justify-between text-left shadow-xs animate-in slide-in-from-top duration-300">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-amber-100 rounded-lg text-amber-800">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-amber-900">
                  {stats.pendingApprovalsCount} Resident Registration{stats.pendingApprovalsCount > 1 ? 's' : ''} Awaiting Approval
                </h4>
                <p className="text-xs text-amber-800/80">
                  New residents have registered with your society code and are pending committee moderation.
                </p>
              </div>
            </div>
            <Link
              to="/residents"
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold text-xs rounded-lg transition-colors shadow-xs shrink-0 ml-3"
            >
              Review Now
            </Link>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Residents Card */}
          <Link
            to="/residents"
            className="bg-white rounded-xl shadow-xs border border-border p-6 flex items-center justify-between hover:shadow-md hover:border-slate-300 transition-all duration-200 text-left group cursor-pointer"
          >
            <div className="flex items-center space-x-4">
              <div className="p-3.5 rounded-lg bg-emerald-50 text-success border border-success/20">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate">Registered Residents</p>
                <h3 className="text-2xl font-bold text-charcoal">
                  {loading ? (
                    <span className="inline-block w-16 h-7 bg-slate-100 rounded animate-pulse" />
                  ) : (
                    `${stats.totalResidents} Residents`
                  )}
                </h3>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-primary group-hover:translate-x-1 transition-all" />
          </Link>

          {/* Pending Maintenance Card */}
          <Link
            to="/payments"
            className="bg-white rounded-xl shadow-xs border border-border p-6 flex items-center justify-between hover:shadow-md hover:border-slate-300 transition-all duration-200 text-left group cursor-pointer"
          >
            <div className="flex items-center space-x-4">
              <div className="p-3.5 rounded-lg bg-amber-50 text-warning border border-warning/20">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate">Pending Maintenance Dues</p>
                <h3 className="text-2xl font-bold text-charcoal">
                  {loading ? (
                    <span className="inline-block w-24 h-7 bg-slate-100 rounded animate-pulse" />
                  ) : (
                    `₹${stats.pendingDuesInRupees.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
                  )}
                </h3>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-primary group-hover:translate-x-1 transition-all" />
          </Link>

          {/* Open Complaints Card */}
          <Link
            to="/complaints"
            className="bg-white rounded-xl shadow-xs border border-border p-6 flex items-center justify-between hover:shadow-md hover:border-slate-300 transition-all duration-200 text-left group cursor-pointer"
          >
            <div className="flex items-center space-x-4">
              <div className="p-3.5 rounded-lg bg-blue-50 text-info border border-info/20">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate">Open Grievances</p>
                <h3 className="text-2xl font-bold text-charcoal">
                  {loading ? (
                    <span className="inline-block w-16 h-7 bg-slate-100 rounded animate-pulse" />
                  ) : (
                    `${stats.openComplaintsCount} Active`
                  )}
                </h3>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-primary group-hover:translate-x-1 transition-all" />
          </Link>
        </div>

        {/* Extra info cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
          {/* Quick Actions */}
          <div className="bg-white rounded-xl border border-border p-6 shadow-xs">
            <h2 className="text-lg font-bold text-charcoal mb-4 border-b border-border pb-3">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link
                to="/residents"
                className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-border rounded-xl text-slate hover:bg-primary-subtle hover:text-primary hover:border-primary-light/30 transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-xs text-center"
              >
                <Users className="w-6 h-6 mb-2 text-primary" />
                <span className="text-sm font-semibold text-charcoal">Manage Residents</span>
                <span className="text-[11px] text-slate mt-0.5">Roster & Approvals</span>
              </Link>

              <Link
                to="/notices"
                className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-border rounded-xl text-slate hover:bg-primary-subtle hover:text-primary hover:border-primary-light/30 transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-xs text-center"
              >
                <Megaphone className="w-6 h-6 mb-2 text-primary" />
                <span className="text-sm font-semibold text-charcoal">Broadcast Notice</span>
                <span className="text-[11px] text-slate mt-0.5">Circulars & Alerts</span>
              </Link>

              <Link
                to="/payments"
                className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-border rounded-xl text-slate hover:bg-primary-subtle hover:text-primary hover:border-primary-light/30 transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-xs text-center"
              >
                <DollarSign className="w-6 h-6 mb-2 text-primary" />
                <span className="text-sm font-semibold text-charcoal">Generate Invoices</span>
                <span className="text-[11px] text-slate mt-0.5">Maintenance Billing</span>
              </Link>

              <Link
                to="/ledger"
                className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-border rounded-xl text-slate hover:bg-primary-subtle hover:text-primary hover:border-primary-light/30 transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-xs text-center"
              >
                <Wallet className="w-6 h-6 mb-2 text-primary" />
                <span className="text-sm font-semibold text-charcoal">Treasury Ledger</span>
                <span className="text-[11px] text-slate mt-0.5">Society Accounts</span>
              </Link>
            </div>
          </div>

          {/* Latest Announcement */}
          <div className="bg-white rounded-xl border border-border p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
                <h2 className="text-lg font-bold text-charcoal flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-primary" />
                  <span>Latest Announcement</span>
                </h2>
                <Link to="/notices" className="text-xs font-semibold text-primary hover:underline">
                  View Board
                </Link>
              </div>

              {loading ? (
                <div className="p-4 bg-slate-50 rounded-xl animate-pulse space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-2/3" />
                  <div className="h-3 bg-slate-200 rounded w-full" />
                </div>
              ) : stats.latestNotice ? (
                <div className="p-4 rounded-xl bg-slate-50 border border-border space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <h4 className="font-bold text-sm text-charcoal">{stats.latestNotice.title}</h4>
                    {stats.latestNotice.isPriority && (
                      <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0 border border-amber-300">
                        Priority
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed line-clamp-3">
                    {stats.latestNotice.body}
                  </p>
                  <p className="text-[11px] text-slate-400 pt-1">
                    Published on {new Date(stats.latestNotice.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              ) : (
                <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-border">
                  <Bell className="w-6 h-6 text-slate/40 mx-auto mb-1.5" />
                  <p className="text-xs text-slate font-medium">No notices published yet.</p>
                </div>
              )}
            </div>

            <Link
              to="/notices"
              className="w-full text-center text-xs font-semibold text-primary hover:text-primary-light mt-4 flex items-center justify-center space-x-1"
            >
              <span>Explore All Community Notices</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    );
  };

  // Render Resident View
  const renderResidentDashboard = () => {
    const hasDues = stats.myPendingDuesInRupees > 0;

    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-600 rounded-2xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
          <div className="relative z-10 max-w-xl text-left">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight">Hello, {user?.name || 'Resident'}</h1>
              <button
                onClick={fetchStats}
                disabled={loading}
                className="p-1 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Refresh Dashboard"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <p className="text-primary-subtle text-sm sm:text-base mt-2 font-medium">
              View your pending society dues, settle maintenance statements securely via Razorpay, or report community complaints.
            </p>
          </div>
          <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-15 pointer-events-none hidden md:block">
            <Home className="w-full h-full text-white transform translate-x-12 translate-y-6" />
          </div>
        </div>

        {/* Maintenance Dues Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          {/* Outstanding Dues Card */}
          <div className="bg-white rounded-xl border border-border p-6 shadow-xs md:col-span-2 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center space-x-2 text-slate">
                  <CreditCard className="w-5 h-5 text-primary" />
                  <span className="text-sm font-medium">Outstanding Maintenance Dues</span>
                </div>
                {hasDues ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-50 text-warning border border-warning/20">
                    Payment Pending ({stats.myPendingBillsCount})
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-success border border-success/20 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    <span>All Settled</span>
                  </span>
                )}
              </div>

              <h2 className={`text-3xl font-extrabold ${hasDues ? 'text-charcoal' : 'text-emerald-700'}`}>
                {loading ? (
                  <span className="inline-block w-28 h-9 bg-slate-100 rounded animate-pulse" />
                ) : (
                  `₹${stats.myPendingDuesInRupees.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
                )}
              </h2>

              <p className="text-xs text-slate mt-1">
                {loading ? (
                  'Checking payment status...'
                ) : stats.myEarliestDueDate ? (
                  `Earliest Due Date: ${stats.myEarliestDueDate}`
                ) : (
                  'No outstanding bills pending payment.'
                )}
              </p>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Link
                to="/payments"
                className="h-11 bg-[#0F172A] hover:bg-[#1E293B] text-[#D4AF37] border border-[#D4AF37]/30 font-semibold px-6 py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm text-sm active:scale-98"
              >
                <CreditCard className="w-4 h-4" />
                <span>Pay Maintenance Online</span>
              </Link>
              <Link
                to="/payments"
                className="h-11 bg-white border border-border text-charcoal hover:bg-slate-50 font-medium px-6 py-2.5 rounded-lg transition-colors flex items-center justify-center cursor-pointer text-sm"
              >
                View Payment History
              </Link>
            </div>
          </div>

          {/* Notice Board Card */}
          <div className="bg-white rounded-xl border border-border p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate uppercase tracking-wider flex items-center gap-1.5">
                  <Megaphone className="w-4 h-4 text-primary" />
                  <span>Notice Board</span>
                </h3>
                <Link to="/notices" className="text-xs text-primary font-semibold hover:underline">
                  View All
                </Link>
              </div>

              <div className="space-y-3">
                {loading ? (
                  <div className="p-3.5 bg-slate-50 rounded-lg animate-pulse space-y-1.5">
                    <div className="h-3.5 bg-slate-200 rounded w-3/4" />
                    <div className="h-2.5 bg-slate-200 rounded w-full" />
                  </div>
                ) : stats.latestNotice ? (
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-border space-y-1">
                    <p className="text-xs font-bold text-charcoal line-clamp-1">{stats.latestNotice.title}</p>
                    <p className="text-[11px] text-slate-700 line-clamp-2">{stats.latestNotice.body}</p>
                    <p className="text-[10px] text-slate-400 pt-1">
                      {new Date(stats.latestNotice.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                ) : (
                  <div className="p-4 text-center bg-slate-50 rounded-lg border border-dashed border-border">
                    <p className="text-xs text-slate">No circulars posted yet.</p>
                  </div>
                )}
              </div>
            </div>

            <Link
              to="/notices"
              className="w-full text-center text-xs font-semibold text-primary hover:text-primary-light mt-4 flex items-center justify-center space-x-1"
            >
              <span>Open Notice Board</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Helpdesk complaints */}
        <div className="bg-white rounded-xl border border-border p-6 shadow-xs text-left">
          <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
            <h3 className="font-bold text-charcoal flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              <span>Grievance Redressal</span>
            </h3>
            <Link
              to="/complaints"
              className="text-xs font-semibold text-primary hover:text-primary-light flex items-center space-x-1"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>File New Complaint</span>
            </Link>
          </div>

          {loading ? (
            <div className="p-6 bg-slate-50 rounded-lg animate-pulse flex items-center justify-center">
              <div className="h-4 bg-slate-200 rounded w-48" />
            </div>
          ) : stats.myOpenComplaintsCount > 0 ? (
            <div className="space-y-2.5">
              <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  <span className="text-xs font-semibold text-rose-900">
                    You have {stats.myOpenComplaintsCount} active complaint{stats.myOpenComplaintsCount > 1 ? 's' : ''} in progress
                  </span>
                </div>
                <Link
                  to="/complaints"
                  className="text-xs font-bold text-rose-700 hover:underline"
                >
                  Track Status
                </Link>
              </div>
            </div>
          ) : (
            <div className="text-center p-6 bg-slate-50 rounded-lg border border-dashed border-border">
              <CheckCircle className="w-8 h-8 text-emerald-500/70 mx-auto mb-2" />
              <p className="text-xs text-slate font-medium">No open complaints found. Everything looks good!</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Dispatch based on user role
  if (user?.role === 'SuperAdmin') {
    return renderSuperAdminDashboard();
  } else if (
    user?.role === 'SocietyOwner' ||
    user?.role === 'Committee' ||
    user?.role === 'SocietyAdmin'
  ) {
    return renderSocietyAdminDashboard();
  } else {
    return renderResidentDashboard();
  }
};

export default Dashboard;
