import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, CheckCircle, AlertTriangle, Activity } from 'lucide-react';
import useAuthStore from '../../store/useAuthStore';
import api from '../../services/api';

const AdminDashboard = () => {
  const { user } = useAuthStore();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await api.get('/dashboard');
        setData(response.data);
      } catch (error) {
        console.error('Failed to fetch admin dashboard data', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64 font-display text-primary animate-pulse">Loading platform statistics...</div>;
  }

  const stats = [
    { label: 'Total Users', value: data?.stats.total_users || 0, icon: Users, color: 'bg-blue-100 text-blue-600' },
    { label: 'Verified Vendors', value: data?.stats.verified_vendors || 0, icon: CheckCircle, color: 'bg-green-100 text-green-600' },
    { label: 'Pending Approvals', value: data?.stats.pending_approvals || 0, icon: AlertTriangle, color: 'bg-yellow-100 text-yellow-600' },
    { label: 'Platform Revenue', value: `$${Number(data?.stats.platform_revenue || 0).toLocaleString()}`, icon: Activity, color: 'bg-purple-100 text-purple-600' },
  ];

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-4xl font-display font-bold">System Administration</h1>
        <p className="text-gray-500 mt-2">Welcome back, {user?.name}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card p-6 rounded-3xl flex items-center space-x-4"
          >
            <div className={`${stat.color} p-4 rounded-2xl`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-gray-500 font-medium text-sm">{stat.label}</p>
              <h3 className="text-2xl font-display font-bold">{stat.value}</h3>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass-card p-8 rounded-3xl">
          <h3 className="text-2xl font-display font-bold mb-6">Recent User Registrations</h3>
          <div className="space-y-4">
            {data?.recent_users?.length > 0 ? (
              data.recent_users.map(u => (
                <div key={u.id} className="p-4 bg-gray-50 rounded-2xl flex justify-between items-center">
                  <div>
                    <p className="font-bold">{u.name}</p>
                    <p className="text-sm text-gray-500">{u.email}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${u.role === 'admin' ? 'bg-purple-100 text-purple-600' : u.role === 'vendor' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                    {u.role}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-gray-400 italic">No recent registrations.</p>
            )}
          </div>
        </div>
        
        <div className="glass-card p-8 rounded-3xl">
          <h3 className="text-2xl font-display font-bold mb-6">Vendor Verification Queue</h3>
          <div className="space-y-4">
            {data?.pending_vendors?.length > 0 ? (
              data.pending_vendors.map(v => (
                <div key={v.id} className="p-4 bg-yellow-50/50 border border-yellow-100 rounded-2xl flex justify-between items-center">
                  <div>
                    <p className="font-bold">{v.name}</p>
                    <p className="text-sm text-gray-500">Applied recently</p>
                  </div>
                  <button className="text-primary font-bold text-sm hover:underline">Review Profile</button>
                </div>
              ))
            ) : (
              <p className="text-gray-400 italic">No pending vendor verifications.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
