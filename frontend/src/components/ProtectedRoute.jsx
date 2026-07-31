import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface p-4">
        <div className="bg-white p-8 rounded-xl shadow-sm border border-border text-center max-w-md">
          <h2 className="text-2xl font-bold text-error mb-2">Access Denied</h2>
          <p className="text-slate mb-6">
            You do not have the required permissions to access this page. This page is restricted to authorized roles.
          </p>
          <a
            href="/login"
            className="inline-block bg-primary hover:bg-primary-light text-white font-medium px-6 py-2.5 rounded-lg transition-colors duration-200"
          >
            Back to Login
          </a>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
