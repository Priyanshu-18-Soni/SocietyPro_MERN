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
  AlertCircle
} from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const [societyCount, setSocietyCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (user?.role === 'SuperAdmin') {
        try {
          const response = await axiosInstance.get('/society');
          setSocietyCount(response.data.societies?.length || 0);
        } catch (err) {
          console.error('Error fetching society count for dashboard:', err);
        }
      }
      setLoading(false);
    };

    fetchStats();
  }, [user]);

  // Render role-specific dashboard views
  const renderSuperAdminDashboard = () => {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-primary to-primary-light rounded-2xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
          <div className="relative z-10 max-w-xl">
            <h1 className="text-3xl font-bold tracking-tight">Welcome Back, {user?.name || 'SuperAdmin'}!</h1>
            <p className="text-primary-subtle text-sm sm:text-base mt-2 font-medium">
              You are logged in as a System Administrator. From here, you can manage housing societies, register new portals, and monitor system performance.
            </p>
          </div>
          {/* Decorative background shape */}
          <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-15 pointer-events-none hidden md:block">
            <Shield className="w-full h-full text-white transform translate-x-12 translate-y-6" />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Societies Card */}
          <div className="bg-white rounded-xl shadow-xs border border-border p-6 flex items-center justify-between hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center space-x-4">
              <div className="p-3.5 rounded-lg bg-primary-subtle text-primary">
                <Building className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate">Registered Societies</p>
                <h3 className="text-2xl font-bold text-charcoal">{loading ? '...' : societyCount}</h3>
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
          <div className="bg-white rounded-xl shadow-xs border border-border p-6 flex items-center space-x-4 hover:shadow-md transition-shadow duration-200">
            <div className="p-3.5 rounded-lg bg-blue-50 text-info">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate">Portal Users</p>
              <h3 className="text-2xl font-bold text-charcoal">Active</h3>
            </div>
          </div>

          {/* System Security Status */}
          <div className="bg-white rounded-xl shadow-xs border border-border p-6 flex items-center space-x-4 hover:shadow-md transition-shadow duration-200">
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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
              <div className="text-center p-4 bg-slate-50 rounded-lg border border-dashed border-border">
                <p className="text-xs text-slate font-medium">More management tools coming in Phase 2</p>
              </div>
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
                  <p className="text-charcoal font-medium">Logged in successfully</p>
                  <p className="text-xs text-slate mt-0.5">Today at {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
              <div className="flex items-start space-x-3 text-sm border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                <span className="w-2 h-2 rounded-full bg-slate-300 mt-1.5 shrink-0" />
                <div>
                  <p className="text-charcoal font-medium">Connected to database, loaded {loading ? '...' : societyCount} societies</p>
                  <p className="text-xs text-slate mt-0.5">Recently on portal load</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSocietyAdminDashboard = () => {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-teal-700 to-primary-light rounded-2xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
          <div className="relative z-10 max-w-xl">
            <h1 className="text-3xl font-bold tracking-tight">Welcome, {user?.name || 'Admin'}</h1>
            <p className="text-primary-subtle text-sm sm:text-base mt-2 font-medium">
              Manage your society residents, track maintenance fee records, and broadcast alerts on the notice board.
            </p>
          </div>
          <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-15 pointer-events-none hidden md:block">
            <Building className="w-full h-full text-white transform translate-x-12 translate-y-6" />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-xs border border-border p-6 flex items-center space-x-4">
            <div className="p-3.5 rounded-lg bg-emerald-50 text-success">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate">Residents</p>
              <h3 className="text-2xl font-bold text-charcoal">45 Registered</h3>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-xs border border-border p-6 flex items-center space-x-4">
            <div className="p-3.5 rounded-lg bg-amber-50 text-warning">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate">Pending Maintenance</p>
              <h3 className="text-2xl font-bold text-charcoal">₹12,500 Dues</h3>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-xs border border-border p-6 flex items-center space-x-4">
            <div className="p-3.5 rounded-lg bg-blue-50 text-info">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate">Open Complaints</p>
              <h3 className="text-2xl font-bold text-charcoal">3 Pending</h3>
            </div>
          </div>
        </div>

        {/* Extra info cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white rounded-xl border border-border p-6 shadow-xs">
            <h2 className="text-lg font-bold text-charcoal mb-4 border-b border-border pb-3">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-border rounded-lg text-slate hover:bg-primary-subtle hover:text-primary hover:border-primary-light/30 transition-all duration-200 cursor-pointer">
                <Users className="w-6 h-6 mb-2" />
                <span className="text-sm font-semibold">Add Resident</span>
                <span className="text-[10px] text-slate/50 mt-1 uppercase tracking-wider">Coming Soon</span>
              </button>
              <button className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-border rounded-lg text-slate hover:bg-primary-subtle hover:text-primary hover:border-primary-light/30 transition-all duration-200 cursor-pointer">
                <Bell className="w-6 h-6 mb-2" />
                <span className="text-sm font-semibold">Post Notice</span>
                <span className="text-[10px] text-slate/50 mt-1 uppercase tracking-wider">Coming Soon</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-border p-6 shadow-xs">
            <h2 className="text-lg font-bold text-charcoal mb-4 border-b border-border pb-3">Latest Announcements</h2>
            <div className="space-y-4">
              <div className="p-3.5 rounded-lg bg-slate-50 border border-border">
                <div className="flex justify-between items-start">
                  <h4 className="font-semibold text-sm text-charcoal">Water Tank Cleaning Schedule</h4>
                  <span className="text-[10px] bg-slate-200 text-slate px-2 py-0.5 rounded-md font-semibold">Important</span>
                </div>
                <p className="text-xs text-slate mt-1">Water supply will be suspended on Sunday from 9:00 AM to 1:00 PM for tank maintenance.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderResidentDashboard = () => {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-600 rounded-2xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
          <div className="relative z-10 max-w-xl">
            <h1 className="text-3xl font-bold tracking-tight">Hello, {user?.name || 'Resident'}</h1>
            <p className="text-primary-subtle text-sm sm:text-base mt-2 font-medium">
              View your pending society dues, pay maintenance invoices, or file support complaints with your management committee.
            </p>
          </div>
          <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-15 pointer-events-none hidden md:block">
            <Home className="w-full h-full text-white transform translate-x-12 translate-y-6" />
          </div>
        </div>

        {/* Maintenance Dues Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl border border-border p-6 shadow-xs md:col-span-2 flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-2 text-slate mb-1">
                <DollarSign className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium">Outstanding Maintenance Dues</span>
              </div>
              <h2 className="text-3xl font-extrabold text-charcoal">₹2,800</h2>
              <p className="text-xs text-slate mt-1">Due Date: 10th August 2026</p>
            </div>
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button className="h-11 bg-primary hover:bg-primary-light text-white font-semibold px-6 py-2.5 rounded-lg transition-colors cursor-pointer shadow-sm text-sm">
                Pay Maintenance Online
              </button>
              <button className="h-11 bg-white border border-border text-charcoal hover:bg-slate-50 font-medium px-6 py-2.5 rounded-lg transition-colors cursor-pointer text-sm">
                View Past Receipts
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-border p-6 shadow-xs flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate uppercase tracking-wider mb-3">Notice Board</h3>
              <div className="space-y-3">
                <div className="p-3 bg-slate-50 rounded-lg border border-border">
                  <p className="text-xs font-semibold text-charcoal">Annual General Meeting (AGM)</p>
                  <p className="text-[10px] text-slate mt-0.5">Scheduled for 15th August at 4 PM in the clubhouse.</p>
                </div>
              </div>
            </div>
            <button className="w-full text-center text-xs font-semibold text-primary hover:text-primary-light mt-4 flex items-center justify-center space-x-1">
              <span>View All Notices</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Helpdesk complaints */}
        <div className="bg-white rounded-xl border border-border p-6 shadow-xs">
          <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
            <h3 className="font-bold text-charcoal">My Maintenance Complaints</h3>
            <button className="text-xs font-semibold text-primary hover:text-primary-light flex items-center space-x-1">
              <PlusCircle className="w-3.5 h-3.5" />
              <span>File New Complaint</span>
            </button>
          </div>
          <div className="text-center p-6 bg-slate-50 rounded-lg border border-dashed border-border">
            <FileText className="w-8 h-8 text-slate/40 mx-auto mb-2" />
            <p className="text-xs text-slate font-medium">No open complaints found. Everything looks good!</p>
          </div>
        </div>
      </div>
    );
  };

  // Dispatch based on user role
  if (user?.role === 'SuperAdmin') {
    return renderSuperAdminDashboard();
  } else if (user?.role === 'SocietyOwner' || user?.role === 'Committee' || user?.role === 'SocietyAdmin') {
    return renderSocietyAdminDashboard();
  } else if (user?.role === 'Resident') {
    return renderResidentDashboard();
  } else {
    return renderResidentDashboard();
  }
};

export default Dashboard;
