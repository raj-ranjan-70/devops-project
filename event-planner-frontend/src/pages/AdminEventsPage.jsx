import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, MapPin, IndianRupee, Calendar as CalendarIcon, Trash2, Eye, ShieldAlert } from 'lucide-react';
import api from '../services/api';

const AdminEventsPage = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await api.get('/admin/events');
      setEvents(response.data);
    } catch (error) {
      console.error('Failed to fetch events', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (eventId, newStatus) => {
    try {
      await api.put(`/admin/events/${eventId}`, { status: newStatus });
      fetchEvents();
    } catch (error) {
      console.error('Failed to update event status', error);
    }
  };

  const handleDelete = async (eventId) => {
    if (!window.confirm('Are you sure you want to permanently delete this event? This action cannot be undone.')) return;
    try {
      await api.delete(`/admin/events/${eventId}`);
      fetchEvents();
    } catch (error) {
      console.error('Failed to delete event', error);
    }
  };

  const filteredEvents = events.filter(event => 
    (event.title || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (event.user?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-display font-bold">Event Moderation</h1>
          <p className="text-gray-500 mt-2">Monitor all platform events and manage fraudulent activity</p>
        </div>
      </div>

      <div className="glass-card p-6 rounded-3xl">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by event title or planner..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64 text-primary animate-pulse">Loading events...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="py-4 px-4 font-display font-bold text-gray-600">Event Details</th>
                  <th className="py-4 px-4 font-display font-bold text-gray-600">Planner</th>
                  <th className="py-4 px-4 font-display font-bold text-gray-600">Status</th>
                  <th className="py-4 px-4 font-display font-bold text-gray-600">Metrics</th>
                  <th className="py-4 px-4 font-display font-bold text-gray-600 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map((event, index) => (
                  <motion.tr 
                    key={event.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="py-4 px-4">
                      <p className="font-bold text-gray-800">{event.title}</p>
                      <p className="text-sm text-gray-500 flex items-center mt-1">
                        <MapPin size={14} className="mr-1" /> {event.venue || 'No venue'}
                      </p>
                    </td>
                    <td className="py-4 px-4">
                      <p className="font-medium text-gray-800">{event.user?.name || 'Unknown'}</p>
                      <p className="text-xs text-gray-500">{event.user?.email || ''}</p>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider
                        ${event.status === 'completed' ? 'bg-green-100 text-green-600' : 
                          event.status === 'cancelled' ? 'bg-red-100 text-red-600' : 
                          'bg-blue-100 text-blue-600'}`}
                      >
                        {event.status || 'upcoming'}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-sm text-gray-600 space-y-1">
                        <p className="flex items-center"><IndianRupee size={14} className="mr-1"/> {Number(event.budget || 0).toLocaleString('en-IN')}</p>
                        <p className="flex items-center"><CalendarIcon size={14} className="mr-1"/> {event.event_date ? new Date(event.event_date).toLocaleDateString() : 'TBD'}</p>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex justify-end space-x-2">
                        {event.status !== 'cancelled' && (
                          <button 
                            onClick={() => handleUpdateStatus(event.id, 'cancelled')}
                            className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                            title="Cancel Event (Fraud/Spam)"
                          >
                            <ShieldAlert size={18} />
                          </button>
                        )}
                        <button className="p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-800 rounded-lg transition-colors" title="View Full Details">
                          <Eye size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(event.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Event"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
                
                {filteredEvents.length === 0 && (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-gray-500">
                      No events found matching your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminEventsPage;
