import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import SocietyManagement from './pages/SocietyManagement';
import CommitteeManagement from './pages/CommitteeManagement';
import Payments from './pages/Payments';
import Complaints from './pages/Complaints';
import Notices from './pages/Notices';
import Ledger from './pages/Ledger';
import ResidentManagement from './pages/ResidentManagement';
import PendingApproval from './pages/PendingApproval';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Login Route */}
          <Route path="/login" element={<Login />} />
          {/* Public Register Route */}
          <Route path="/register" element={<Register />} />
          {/* Standalone Pending Approval Route */}
          <Route path="/pending-approval" element={<PendingApproval />} />

          {/* Protected Dashboard Route (All authenticated roles) */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Protected Society Profile Route (SocietyOwner and Committee) */}
          <Route
            path="/societies"
            element={
              <ProtectedRoute allowedRoles={['SocietyOwner', 'Committee']}>
                <Layout>
                  <SocietyManagement />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Protected Committee Management Route (SocietyOwner only) */}
          <Route
            path="/committee"
            element={
              <ProtectedRoute allowedRoles={['SocietyOwner']}>
                <Layout>
                  <CommitteeManagement />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Protected Resident Management Route (SocietyOwner and Committee) */}
          <Route
            path="/residents"
            element={
              <ProtectedRoute allowedRoles={['SocietyOwner', 'Committee']}>
                <Layout>
                  <ResidentManagement />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Protected Payments Route */}
          <Route
            path="/payments"
            element={
              <ProtectedRoute>
                <Layout>
                  <Payments />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Protected Complaints Route (All authenticated active roles) */}
          <Route
            path="/complaints"
            element={
              <ProtectedRoute>
                <Layout>
                  <Complaints />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Protected Notices Route (All authenticated active roles) */}
          <Route
            path="/notices"
            element={
              <ProtectedRoute>
                <Layout>
                  <Notices />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Protected Treasury Ledger Route (All authenticated active roles) */}
          <Route
            path="/ledger"
            element={
              <ProtectedRoute>
                <Layout>
                  <Ledger />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Redirect all other routes to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;