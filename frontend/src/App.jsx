import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import SocietyManagement from './pages/SocietyManagement';
import Payments from './pages/Payments';
import ResidentManagement from './pages/ResidentManagement';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Login Route */}
          <Route path="/login" element={<Login />} />
          {/* Public Register Route */}
          <Route path="/register" element={<Register />} />

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

          {/* Protected Resident Management Route (SocietyAdmin only) */}
          <Route
            path="/residents"
            element={
              <ProtectedRoute allowedRoles={['SocietyAdmin']}>
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

          {/* Redirect all other routes to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;