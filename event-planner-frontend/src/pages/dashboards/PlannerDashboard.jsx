import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Calendar, 
  Users, 
  Truck, 
  Plus,
  ArrowUpRight,
  Clock
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

const PlannerDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await api.get('/dashboard');
        setData(response.data);
      } catch (error) {
        console.error('Failed to fetch dashboard data', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64 font-display text-primary animate-pulse">Loading cinematic dashboard...</div>;
  }

  const stats = [
    { label: 'Active Events', value: data?.stats.total_events || 0, icon: Calendar, color: 'bg-purple-100 text-purple-600' },
    { label: 'Upcoming RSVPs', value: data?.stats.total_guests || 0, icon: Users, color: 'bg-blue-100 text-blue-600' },
    { label: 'Partner Vendors', value: data?.stats.total_vendors || 0, icon: Truck, color: 'bg-gold/10 text-gold' },
  ];

  return (
    <div className="space-y-10">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card p-8 rounded-3xl"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-500 font-medium mb-1">{stat.label}</p>
                <h3 className="text-4xl font-display font-bold">{stat.value}</h3>
              </div>
              <div className={`${stat.color} p-4 rounded-2xl`}>
                <stat.icon size={24} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Events */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-display font-bold">Recent Extraordinaries</h3>
            <Link to="/events" className="text-primary font-bold flex items-center hover:underline">
              View All <ArrowUpRight className="ml-1" size={16} />
            </Link>
          </div>

          <div className="space-y-4">
            {data?.recent_events?.length > 0 ? (
              data.recent_events.map((event) => (
                <Link to={`/events/${event.id}`} key={event.id} className="glass-card p-6 rounded-2xl flex items-center justify-between group cursor-pointer hover:bg-white transition-colors block">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-gray-100 rounded-xl overflow-hidden">
                      {event.cover_image ? (
                        <img src={`http://localhost:8000/storage/${event.cover_image}`} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <Calendar size={24} />
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="font-display font-bold text-lg group-hover:text-primary transition-colors">{event.title}</h4>
                      <p className="text-sm text-gray-500 flex items-center mt-1">
                        <Clock size={14} className="mr-1" /> {new Date(event.event_date).toLocaleDateString()} • {event.venue || 'No venue set'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    {(() => {
                      const s = event.status?.toLowerCase();
                      if (s === 'live/happening' || s === 'live') {
                        return (
                          <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full flex items-center space-x-1.5 w-fit">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                            <span>Live</span>
                          </span>
                        );
                      }
                      if (s === 'completed') {
                        return (
                          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 bg-gray-50 px-3 py-1 rounded-full">
                            Completed
                          </span>
                        );
                      }
                      if (s === 'cancelled') {
                        return (
                          <span className="text-[10px] font-bold uppercase tracking-widest text-rose-500 bg-rose-50 px-3 py-1 rounded-full">
                            Cancelled
                          </span>
                        );
                      }
                      return (
                        <span className="text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/5 px-3 py-1 rounded-full border border-primary/10">
                          Upcoming
                        </span>
                      );
                    })()}
                    <p className="text-sm font-bold text-gray-800 mt-2">${Number(event.budget).toLocaleString()}</p>
                  </div>
                </Link>
              ))
            ) : (
              <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                <p className="text-gray-400 mb-6">No events found. Start your first masterpiece.</p>
                <Link to="/events/create" className="elegant-button-primary inline-flex items-center">
                  <Plus className="mr-2" /> Create New Event
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Widgets */}
        <div className="space-y-8">
          <div className="glass-card p-8 rounded-3xl bg-primary text-white">
            <h3 className="text-xl font-display font-bold mb-4">Concierge Support</h3>
            <p className="text-primary-container text-sm leading-relaxed mb-6">
              Our specialists are ready to assist with your most ambitious visions.
            </p>
            <button className="w-full py-3 bg-white text-primary rounded-full font-bold shadow-lg">
              Contact Specialist
            </button>
          </div>
          
          <div className="glass-card p-8 rounded-3xl">
            <h3 className="text-xl font-display font-bold mb-6">RSVP Insights</h3>
            {/* Simple Progress Bar Placeholder */}
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-500">Confirmed Guests</span>
                  <span className="font-bold text-primary">0%</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="bg-primary h-full w-0"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlannerDashboard;
