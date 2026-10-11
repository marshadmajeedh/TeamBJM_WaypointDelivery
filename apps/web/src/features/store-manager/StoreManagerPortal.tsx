import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { UserRole } from '@waypoint/shared';
import { useAuth } from '../auth/AuthContext';
import { ProtectedRoute } from '../../routes/ProtectedRoute';
import { StoreProvider } from './StoreContext';
import { StoreShell } from './components/StoreShell';
import { Dashboard } from './pages/Dashboard';
import { CreateOrder } from './pages/CreateOrder';
import { ReviewOrder } from './pages/ReviewOrder';
import { Confirmation } from './pages/Confirmation';
import { MyOrders } from './pages/MyOrders';
import { Tracking } from './pages/Tracking';
import { DeferredNotice } from './pages/DeferredNotice';
import { Receipt } from './pages/Receipt';
import { OrderDetails } from './pages/OrderDetails';
import './store.css';
export function StoreManagerPortal() {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) return <Navigate to="/store/login" state={{ from: location }} replace />;
  return (
    <ProtectedRoute allowedRoles={[UserRole.STORE_MANAGER]}>
      <StoreProvider key={user?.id}>
        <StoreShell>
          <Routes>
            <Route index element={<Dashboard />} />
            <Route path="orders" element={<MyOrders />} />
            <Route path="orders/new" element={<CreateOrder />} />
            <Route path="orders/review" element={<ReviewOrder />} />
            <Route path="orders/:id" element={<OrderDetails />} />
            <Route path="orders/:id/confirmation" element={<Confirmation />} />
            <Route path="orders/:id/track" element={<Tracking />} />
            <Route path="orders/:id/deferred" element={<DeferredNotice />} />
            <Route path="orders/:id/receipt" element={<Receipt />} />
            <Route path="*" element={<Navigate to="/store" replace />} />
          </Routes>
        </StoreShell>
      </StoreProvider>
    </ProtectedRoute>
  );
}
