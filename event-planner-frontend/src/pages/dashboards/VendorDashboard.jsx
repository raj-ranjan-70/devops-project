import { motion } from 'framer-motion';
import { CalendarCheck, DollarSign, Star, Briefcase } from 'lucide-react';
import useAuthStore from '../../store/useAuthStore';

const VendorDashboard = () => {
  const { user } = useAuthStore();

  const stats = [
    { label: 'Active Bookings', value: 8, icon: CalendarCheck, color: 'bg-green-100 text-green-600' },
    { label: 'Pending Requests', value: 3, icon: Briefcase, color: 'bg-yellow-100 text-yellow-600' },
    { label: 'Total Earnings', value: '$12,450', icon: DollarSign, color: 'bg-blue-100 text-blue-600' },
    { label: 'Average Rating', value: '4.9', icon: Star, color: 'bg-gold/10 text-gold' },
  ];

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-4xl font-display font-bold">Vendor Portal</h1>
        <p className="text-gray-500 mt-2">Manage your services, availability, and bookings</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-display font-bold">Recent Booking Requests</h3>
            <button className="text-primary font-bold text-sm hover:underline">View All</button>
          </div>
          
          <div className="space-y-4">
            <div className="glass-card p-6 rounded-2xl flex items-center justify-between">
              <div>
                <h4 className="font-display font-bold text-lg">Smith-Johnson Wedding</h4>
                <p className="text-sm text-gray-500 mt-1">October 15, 2026 • 200 Guests</p>
              </div>
              <div className="flex space-x-3">
                <button className="px-4 py-2 bg-red-50 text-red-600 font-bold rounded-xl text-sm hover:bg-red-100 transition-colors">Decline</button>
                <button className="px-4 py-2 bg-primary text-white font-bold rounded-xl text-sm hover:bg-primary/90 transition-colors">Accept</button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="glass-card p-8 rounded-3xl">
            <h3 className="text-xl font-display font-bold mb-4">Your Service Profiles</h3>
            <p className="text-sm text-gray-500 mb-6">You can create multiple profiles to offer different types of services.</p>
            <button className="w-full elegant-button-primary py-3 text-sm flex justify-center items-center">
              + Create New Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorDashboard;
