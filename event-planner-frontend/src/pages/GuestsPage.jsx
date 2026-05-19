import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Plus, Mail, Phone, X, Loader2 } from 'lucide-react';
import api from '../services/api';
import { useForm } from 'react-hook-form';
import useAuthStore from '../store/useAuthStore';
import Toastify from 'toastify-js';
import "toastify-js/src/toastify.css";

const GuestsPage = () => {
  const { user } = useAuthStore();
  const isSuspended = user?.role === 'planner' && !user?.is_active;

  const [guests, setGuests] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const fetchData = async () => {
    try {
      const [guestsRes, eventsRes] = await Promise.all([
        api.get('/guests'),
        api.get('/events')
      ]);
      setGuests(guestsRes.data);
      setEvents(eventsRes.data);
    } catch (error) {
      console.error('Failed to fetch data', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      await api.post('/guests', data);
      setIsModalOpen(false);
      reset();
      fetchData(); // Refresh list
    } catch (error) {
      console.error('Failed to add guest', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 relative">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-display font-bold">Guest Relations</h1>
          <p className="text-gray-500 mt-1">Manage your sophisticated guest lists and RSVPs</p>
        </div>
        <button 
          onClick={() => {
            if (isSuspended) {
              Toastify({
                text: "Your account is currently suspended. You cannot add new guests. Please contact the administrator.",
                duration: 4500,
                gravity: "top",
                position: "center",
                style: {
                  background: "linear-gradient(135deg, #ef4444, #dc2626)",
                  borderRadius: "16px",
                  boxShadow: "0 10px 15px -3px rgba(239, 68, 68, 0.2)",
                  fontFamily: "Outfit, Inter, sans-serif",
                  fontSize: "14px",
                  fontWeight: "600",
                  padding: "12px 24px",
                }
              }).showToast();
              return;
            }
            setIsModalOpen(true);
          }} 
          className="elegant-button-primary flex items-center"
        >
          <Plus className="mr-2" /> Add Guest
        </button>
      </div>

      <div className="glass-card rounded-3xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-8 py-5 text-sm font-bold text-gray-700 uppercase tracking-wider">Name</th>
              <th className="px-8 py-5 text-sm font-bold text-gray-700 uppercase tracking-wider">Contact</th>
              <th className="px-8 py-5 text-sm font-bold text-gray-700 uppercase tracking-wider">Side</th>
              <th className="px-8 py-5 text-sm font-bold text-gray-700 uppercase tracking-wider">Status</th>
              <th className="px-8 py-5 text-sm font-bold text-gray-700 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-8 py-20 text-center font-display text-primary animate-pulse">Loading guests...</td>
              </tr>
            ) : guests.length > 0 ? (
              guests.map((guest) => (
                <tr key={guest.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-8 py-6 font-bold text-gray-800">{guest.name}</td>
                  <td className="px-8 py-6">
                    <div className="flex flex-col space-y-1">
                      <span className="flex items-center text-sm text-gray-500"><Mail size={14} className="mr-2" /> {guest.email || 'N/A'}</span>
                      <span className="flex items-center text-sm text-gray-500"><Phone size={14} className="mr-2" /> {guest.phone || 'N/A'}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="bg-primary/5 text-primary px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest">{guest.side || 'General'}</span>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${
                      guest.rsvp_status === 'confirmed' ? 'bg-green-100 text-green-700' : 
                      guest.rsvp_status === 'declined' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {guest.rsvp_status || 'Pending'}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-gray-400">...</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-8 py-20 text-center text-gray-400 italic">No guests added yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Guest Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h2 className="text-2xl font-display font-bold">Add New Guest</h2>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Select Event</label>
                  <select
                    {...register('event_id', { required: 'Event is required' })}
                    className="w-full px-4 py-3 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary transition-all text-sm"
                  >
                    <option value="">-- Choose Event --</option>
                    {events.map(event => (
                      <option key={event.id} value={event.id}>{event.title}</option>
                    ))}
                  </select>
                  {errors.event_id && <p className="mt-1 text-xs text-red-500">{errors.event_id.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Guest Name</label>
                  <input
                    {...register('name', { required: 'Name is required' })}
                    type="text"
                    placeholder="e.g. Eleanor Vance"
                    className="w-full px-4 py-3 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary transition-all text-sm"
                  />
                  {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Email</label>
                    <input
                      {...register('email')}
                      type="email"
                      placeholder="eleanor@example.com"
                      className="w-full px-4 py-3 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary transition-all text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Phone</label>
                    <input
                      {...register('phone')}
                      type="text"
                      placeholder="+1 (555) 000-0000"
                      className="w-full px-4 py-3 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary transition-all text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Side</label>
                    <select
                      {...register('side')}
                      className="w-full px-4 py-3 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary transition-all text-sm"
                    >
                      <option value="Bride">Bride</option>
                      <option value="Groom">Groom</option>
                      <option value="General">General</option>
                      <option value="VIP">VIP</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">RSVP Status</label>
                    <select
                      {...register('rsvp_status')}
                      className="w-full px-4 py-3 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary transition-all text-sm"
                    >
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="declined">Declined</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 flex justify-end space-x-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                    Cancel
                  </button>
                  <button disabled={isSubmitting || events.length === 0} type="submit" className="elegant-button-primary py-3 px-6 text-sm flex items-center">
                    {isSubmitting ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
                    Save Guest
                  </button>
                </div>
                {events.length === 0 && (
                  <p className="text-xs text-red-500 text-right mt-2">You must create an event first.</p>
                )}
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GuestsPage;
