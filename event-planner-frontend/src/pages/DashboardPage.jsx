import useAuthStore from '../store/useAuthStore';
import AdminDashboard from './dashboards/AdminDashboard';
import VendorDashboard from './dashboards/VendorDashboard';
import PlannerDashboard from './dashboards/PlannerDashboard';

const DashboardPage = () => {
  const { user } = useAuthStore();

  if (!user) return null;

  switch (user.role) {
    case 'admin':
      return <AdminDashboard />;
    case 'vendor':
      return <VendorDashboard />;
    case 'planner':
    default:
      return <PlannerDashboard />;
  }
};

export default DashboardPage;
