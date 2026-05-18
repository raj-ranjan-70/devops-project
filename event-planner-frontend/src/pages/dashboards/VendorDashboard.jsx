import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarCheck, DollarSign, Star, Briefcase, ChevronRight, Loader2, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import useAuthStore from '../../store/useAuthStore';
import api from '../../services/api';

const VendorDashboard = () => {
  const { user } = useAuthStore();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const fetchDashboardData = async () => {
    try {
      const response = await api.get('/dashboard');
      setData(response.data);
    } catch (error) {
      console.error('Failed to fetch vendor dashboard data', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleBookingAction = async (id, action) => {
    setActionLoadingId(id);
    try {
      await api.post(`/vendor/bookings/${id}/${action}`);
      await fetchDashboardData();
    } catch (error) {
      console.error(`Failed to ${action} booking`, error);
      alert(`Failed to ${action} booking. Please try again.`);
    } finally {
      setActionLoadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 font-display text-primary animate-pulse">
        Loading premium vendor workspace...
      </div>
    );
  }

  const stats = [
    { label: 'Active Bookings', value: data?.stats?.active_bookings ?? 0, icon: CalendarCheck, color: 'bg-green-100 text-green-600' },
    { label: 'Pending Requests', value: data?.stats?.pending_requests ?? 0, icon: Briefcase, color: 'bg-yellow-100 text-yellow-600' },
    { label: 'Total Earnings', value: `$${(data?.stats?.total_earnings ?? 0).toLocaleString()}`, icon: DollarSign, color: 'bg-blue-100 text-blue-600' },
    { label: 'Average Rating', value: Number(data?.stats?.average_rating ?? 5.0).toFixed(1), icon: Star, color: 'bg-gold/10 text-gold' },
  ];

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-display font-bold">Vendor Portal</h1>
          <p className="text-gray-500 mt-2">Manage your services, availability, and bookings</p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-500 bg-gray-50 px-4 py-2 rounded-2xl border border-gray-100 w-fit">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-ping"></span>
          <span className="font-bold">Live Synced with Database</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card p-6 rounded-3xl flex items-center space-x-4 border border-gray-100 hover:shadow-lg transition-shadow duration-300"
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
        {/* Booking Requests */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-display font-bold">Recent Booking Requests</h3>
            <Link to="/bookings" className="text-primary font-bold text-sm hover:underline flex items-center">
              View All <ChevronRight size={16} />
            </Link>
          </div>
          
          <div className="space-y-4">
            {data?.recent_bookings?.length > 0 ? (
              <AnimatePresence>
                {data.recent_bookings.map((booking, idx) => (
                  <motion.div
                    key={booking.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="glass-card p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-gray-100/50"
                  >
                    <div>
                      <span className="text-[10px] font-bold text-primary bg-primary/5 px-2.5 py-1 rounded-full uppercase tracking-wider">
                        {booking.vendor_service?.business_name}
                      </span>
                      <h4 className="font-display font-bold text-lg mt-2">{booking.event?.title || 'Private Event'}</h4>
                      <p className="text-sm text-gray-500 mt-1">
                        {booking.event?.event_date 
                          ? new Date(booking.event.event_date).toLocaleDateString(undefined, { dateStyle: 'long' }) 
                          : 'TBD'} • {booking.event?.guest_count ?? 0} Guests
                      </p>
                      {booking.message && (
                        <p className="text-xs text-gray-400 bg-gray-50/50 p-2.5 rounded-xl mt-2 italic border-l-2 border-gray-200">
                          "{booking.message}"
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-3 shrink-0">
                      {booking.status === 'pending' ? (
                        <>
                          <button
                            disabled={actionLoadingId === booking.id}
                            onClick={() => handleBookingAction(booking.id, 'decline')}
                            className="px-4 py-2.5 bg-rose-50 text-rose-600 font-bold rounded-xl text-xs hover:bg-rose-100 transition-colors disabled:opacity-50"
                          >
                            Decline
                          </button>
                          <button
                            disabled={actionLoadingId === booking.id}
                            onClick={() => handleBookingAction(booking.id, 'accept')}
                            className="px-4 py-2.5 bg-primary text-white font-bold rounded-xl text-xs hover:bg-primary/95 transition-colors disabled:opacity-50 flex items-center"
                          >
                            {actionLoadingId === booking.id ? (
                              <Loader2 className="animate-spin mr-1.5" size={14} />
                            ) : null}
                            Accept
                          </button>
                        </>
                      ) : (
                        <span className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider
                          ${booking.status === 'accepted' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}
                        >
                          {booking.status === 'accepted' ? 'Accepted' : 'Declined'}
                        </span>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            ) : (
              <div className="py-12 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400">
                <Info size={32} className="mb-2 text-gray-300" />
                <p className="text-sm font-medium">No recent booking requests found.</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Profiles */}
        <div className="space-y-8">
          <div className="glass-card p-8 rounded-3xl border border-gray-100/60 shadow-lg shadow-gray-100/10">
            <h3 className="text-xl font-display font-bold mb-2">Your Service Profiles</h3>
            <p className="text-xs text-gray-500 mb-6 leading-relaxed">
              Create multiple profiles to showcase different specialties and categories to planners.
            </p>
            
            <div className="space-y-4 mb-6 max-h-[300px] overflow-y-auto pr-1">
              {data?.services?.length > 0 ? (
                data.services.map((svc) => (
                  <div key={svc.id} className="p-3 bg-gray-50 rounded-2xl flex justify-between items-center border border-gray-100 hover:bg-white hover:shadow-md transition-all duration-300">
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="font-bold text-gray-800 text-sm truncate">{svc.business_name}</p>
                      <p className="text-[10px] text-gray-400 font-medium truncate mt-0.5">
                        {svc.category} • ${(svc.starting_price ?? 0).toLocaleString()}
                      </p>
                    </div>
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${svc.is_available ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-xs text-gray-400 italic">
                  No service profiles created yet.
                </div>
              )}
            </div>

            <Link 
              to="/services" 
              className="w-full elegant-button-primary py-3 text-xs flex justify-center items-center shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-shadow duration-300 font-bold"
            >
              + Create & Manage Profiles
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorDashboard;
