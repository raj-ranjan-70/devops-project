import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, 
  Search, 
  Filter,
  MoreVertical,
  Calendar,
  MapPin,
  ArrowUpRight
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

const EventsPage = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await api.get('/events');
        const sorted = [...response.data].sort(
          (a, b) => new Date(b.event_date) - new Date(a.event_date)
        );
        setEvents(sorted);
      } catch (error) {
        console.error('Failed to fetch events', error);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-display font-bold">Your Masterpieces</h1>
          <p className="text-gray-500 mt-1">A collection of your beautifully orchestrated events</p>
        </div>
        <Link to="/events/create" className="elegant-button-primary inline-flex items-center">
          <Plus className="mr-2" /> New Event
        </Link>
      </div>

      <div className="flex items-center space-x-4 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Search events..." 
            className="w-full pl-12 pr-4 py-3 bg-transparent border-none focus:ring-0"
          />
        </div>
        <button className="flex items-center space-x-2 px-6 py-3 border-l border-gray-100 text-gray-600 font-medium">
          <Filter size={18} />
          <span>Filters</span>
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20 font-display text-primary animate-pulse">Loading events...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {events.map((event, i) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => navigate(`/events/${event.id}`)}
              className="glass-card group overflow-hidden rounded-3xl cursor-pointer hover:shadow-xl transition-all duration-300"
            >
              <div className="relative h-48 bg-gray-100">
                {event.cover_image ? (
                  <img src={`http://localhost:8000/storage/${event.cover_image}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <Calendar size={48} />
                  </div>
                )}
                {(() => {
                  const s = event.status?.toLowerCase();
                  if (s === 'live/happening' || s === 'live') {
                    return (
                      <div className="absolute top-4 right-4 bg-emerald-500 text-white px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-lg flex items-center space-x-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                        <span>Live Now</span>
                      </div>
                    );
                  }
                  if (s === 'completed') {
                    return (
                      <div className="absolute top-4 right-4 bg-gray-600 text-white px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-lg">
                        Completed
                      </div>
                    );
                  }
                  if (s === 'cancelled') {
                    return (
                      <div className="absolute top-4 right-4 bg-rose-500 text-white px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-lg">
                        Cancelled
                      </div>
                    );
                  }
                  return (
                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-4 py-1.5 rounded-full text-[10px] font-bold text-primary uppercase tracking-widest shadow-lg border border-primary/10">
                      Upcoming
                    </div>
                  );
                })()}
              </div>
              
              <div className="p-8">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-2xl font-display font-bold group-hover:text-primary transition-colors">{event.title}</h3>
                  <button className="text-gray-400 hover:text-gray-600"><MoreVertical size={20} /></button>
                </div>
                
                <div className="space-y-3 mb-8">
                  <div className="flex items-center text-gray-500 text-sm">
                    <Calendar size={16} className="mr-3 text-primary/60" />
                    {new Date(event.event_date).toLocaleDateString(undefined, { dateStyle: 'long' })}
                  </div>
                  <div className="flex items-center text-gray-500 text-sm">
                    <MapPin size={16} className="mr-3 text-primary/60" />
                    {event.venue || 'TBD'}
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Budget</p>
                    <p className="font-bold text-gray-800">&#8377;{Number(event.budget_amount ?? event.budget?.total_budget ?? 0).toLocaleString('en-IN')}</p>
                  </div>
                  <Link to={`/events/${event.id}`} className="w-10 h-10 bg-primary/5 text-primary rounded-full flex items-center justify-center hover:bg-primary hover:text-white transition-all">
                    <ArrowUpRight size={20} />
                  </Link>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EventsPage;
