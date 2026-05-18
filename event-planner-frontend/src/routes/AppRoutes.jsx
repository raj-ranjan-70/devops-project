import { Routes, Route, Navigate } from 'react-router-dom';
import PublicLayout from '../layouts/PublicLayout';
import DashboardLayout from '../layouts/DashboardLayout';
import ProtectedRoute from '../components/ProtectedRoute';

// Pages
import LandingPage from '../pages/LandingPage';
import LoginPage from '../pages/LoginPage';
import SignupPage from '../pages/SignupPage';
import DashboardPage from '../pages/DashboardPage';
import PlannersPage from '../pages/PlannersPage';
import AdminVendorsPage from '../pages/AdminVendorsPage';
import AdminEventsPage from '../pages/AdminEventsPage';
import EventsPage from '../pages/EventsPage';
import CreateEventPage from '../pages/CreateEventPage';
import GuestsPage from '../pages/GuestsPage';
import VendorsPage from '../pages/VendorsPage';
import BudgetPage from '../pages/BudgetPage';
import EventDetailsPage from '../pages/EventDetailsPage';
import VendorServicesPage from '../pages/VendorServicesPage';
import VendorBookingsPage from '../pages/VendorBookingsPage';
import ChatPage from '../pages/ChatPage';

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
      </Route>

      {/* Protected Routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/planners" element={<PlannersPage />} />
          <Route path="/admin/vendors" element={<AdminVendorsPage />} />
          <Route path="/admin/events" element={<AdminEventsPage />} />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/events/create" element={<CreateEventPage />} />
          <Route path="/events/:id" element={<EventDetailsPage />} />
          <Route path="/guests" element={<GuestsPage />} />
          <Route path="/vendors" element={<VendorsPage />} />
          <Route path="/budget" element={<BudgetPage />} />
          <Route path="/services" element={<VendorServicesPage />} />
          <Route path="/bookings" element={<VendorBookingsPage />} />
          <Route path="/chat" element={<ChatPage />} />
        </Route>
      </Route>

      {/* 404 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
