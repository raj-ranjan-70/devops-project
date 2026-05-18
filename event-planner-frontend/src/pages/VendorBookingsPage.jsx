import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, CheckCircle2, Clock, AlertTriangle, Info, 
  MapPin, Users, MessageSquare, Loader2, Filter, Sparkles, XCircle
} from 'lucide-react';
import api from '../services/api';

const VendorBookingsPage = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'pending', 'accepted', 'rejected'
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const response = await api.get('/vendor/bookings');
      setBookings(response.data);
    } catch (error) {
      console.error('Failed to fetch vendor bookings', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleBookingAction = async (id, action) => {
    setActionLoadingId(id);
    try {
      await api.post(`/vendor/bookings/${id}/${action}`);
      // Refresh list
      const response = await api.get('/vendor/bookings');
      setBookings(response.data);
    } catch (error) {
      console.error(`Failed to ${action} booking`, error);
      alert(`Failed to ${action} booking. Please try again.`);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Filter bookings based on active status tab
  const filteredBookings = bookings.filter(b => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'pending') return b.status === 'pending';
    if (filterStatus === 'accepted') return b.status === 'accepted';
    if (filterStatus === 'rejected') return b.status === 'rejected';
    return true;
  });

  return (
    <div className="space-y-8 relative">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-display font-bold">Client Bookings</h1>
          <p className="text-gray-500 mt-1">Review event hire proposals, confirm booking requests, and track planned timelines</p>
        </div>

        {/* Tab Filter buttons */}
        <div className="flex bg-gray-100/80 p-1 rounded-2xl border border-gray-200/50 backdrop-blur-md shrink-0">
          {['all', 'pending', 'accepted', 'rejected'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-xl font-bold text-xs capitalize transition-all duration-300 ${
                filterStatus === status
                  ? 'bg-white text-primary shadow-md shadow-gray-200/80'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 font-display text-primary animate-pulse">
          Retrieving booked timelines...
        </div>
      ) : filteredBookings.length > 0 ? (
        <div className="space-y-6">
          <AnimatePresence mode="popLayout">
            {filteredBookings.map((booking, index) => (
              <motion.div
                key={booking.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.04 }}
                className="glass-card p-6 rounded-3xl border border-gray-100 hover:shadow-lg transition-all duration-300"
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                  {/* Left content: Event, service, message info */}
                  <div className="space-y-4 flex-grow">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-bold text-primary bg-primary/5 px-2.5 py-1 rounded-full uppercase tracking-wider">
                        {booking.vendor_service?.business_name}
                      </span>
                      <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-full capitalize">
                        {booking.vendor_service?.category}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-xl font-display font-bold text-gray-800">
                        {booking.event?.title || 'Private Event'}
                      </h3>
                      
                      {/* Event details */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 text-xs text-gray-400">
                        <span className="flex items-center">
                          <Calendar size={12} className="mr-1 text-gray-300" />
                          {booking.event?.event_date 
                            ? new Date(booking.event.event_date).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
                            : 'TBD'}
                        </span>
                        <span className="flex items-center">
                          <MapPin size={12} className="mr-1 text-gray-300" />
                          {booking.event?.venue || 'Venue TBD'}
                        </span>
                        <span className="flex items-center">
                          <Users size={12} className="mr-1 text-gray-300" />
                          {booking.event?.guest_count ?? 0} Guests
                        </span>
                      </div>
                    </div>

                    {booking.message && (
                      <div className="bg-gray-50/50 p-4 rounded-2xl flex items-start space-x-2 text-xs text-gray-500 border border-gray-100">
                        <MessageSquare size={16} className="text-gray-300 mt-0.5 shrink-0" />
                        <div className="leading-relaxed">
                          <p className="font-bold text-gray-600 mb-0.5">Planner message:</p>
                          <p className="italic">"{booking.message}"</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right content: Badges, request status, timeline status, and actions */}
                  <div className="flex flex-col sm:flex-row lg:flex-col justify-between lg:items-end gap-4 shrink-0 border-t lg:border-t-0 border-gray-100 pt-4 lg:pt-0">
                    <div className="space-y-2 text-left lg:text-right">
                      {/* Timeline Status Tag */}
                      <div className="flex items-center lg:justify-end space-x-1.5">
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Event Status:</span>
                        {(() => {
                          const evStatus = booking.event?.status?.toLowerCase();
                          if (evStatus === 'live/happening' || evStatus === 'live') {
                            return (
                              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full flex items-center space-x-1 border border-emerald-100">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping shrink-0"></span>
                                <span className="font-extrabold">Live/Happening</span>
                              </span>
                            );
                          }
                          if (evStatus === 'completed') {
                            return (
                              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-200">
                                Completed
                              </span>
                            );
                          }
                          return (
                            <span className="text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/5 px-2.5 py-1 rounded-full border border-primary/10">
                              Upcoming
                            </span>
                          );
                        })()}
                      </div>

                      {/* Request status tag */}
                      <div className="flex items-center lg:justify-end space-x-1.5">
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Request:</span>
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center w-fit space-x-1
                          ${booking.status === 'accepted' 
                            ? 'bg-green-50 text-green-600 border border-green-100' 
                            : booking.status === 'rejected' 
                            ? 'bg-red-50 text-red-600 border border-red-100' 
                            : 'bg-yellow-50 text-yellow-600 border border-yellow-100'}`}
                        >
                          {booking.status === 'pending' && <Clock size={12} className="mr-1" />}
                          {booking.status === 'accepted' && <CheckCircle2 size={12} className="mr-1" />}
                          {booking.status === 'rejected' && <XCircle size={12} className="mr-1" />}
                          <span>{booking.status === 'rejected' ? 'Declined' : booking.status}</span>
                        </span>
                      </div>
                    </div>

                    {/* Pending Action Buttons */}
                    {booking.status === 'pending' && (
                      <div className="flex items-center space-x-2 lg:mt-2">
                        <button
                          disabled={actionLoadingId === booking.id}
                          onClick={() => handleBookingAction(booking.id, 'decline')}
                          className="px-4 py-2 bg-rose-50 text-rose-600 font-bold rounded-xl text-xs hover:bg-rose-100 transition-colors disabled:opacity-50"
                        >
                          Decline Request
                        </button>
                        <button
                          disabled={actionLoadingId === booking.id}
                          onClick={() => handleBookingAction(booking.id, 'accept')}
                          className="px-4 py-2 bg-primary text-white font-bold rounded-xl text-xs hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center"
                        >
                          {actionLoadingId === booking.id ? (
                            <Loader2 className="animate-spin mr-1.5" size={12} />
                          ) : null}
                          Accept Proposal
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="py-20 text-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center space-y-3 max-w-lg mx-auto">
          <Calendar size={48} className="text-gray-300" />
          <div>
            <h3 className="text-lg font-bold text-gray-700">No Bookings Found</h3>
            <p className="text-sm text-gray-400 mt-1">There are no {filterStatus !== 'all' ? `${filterStatus} ` : ''}bookings listed under your service catalog.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorBookingsPage;
