import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Truck, Plus, Star, MapPin, Phone, X, Loader2, Search, 
  SlidersHorizontal, Calendar, Info, CheckCircle2, MessageSquare, DollarSign, Clock, AlertTriangle 
} from 'lucide-react';
import api from '../services/api';
import { useForm } from 'react-hook-form';

const VendorsPage = () => {
  const [activeTab, setActiveTab] = useState('discover'); // 'discover' or 'bookings'
  const [services, setServices] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Discover filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [locationQuery, setLocationQuery] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  
  // Booking modal
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [eventsRes, bookingsRes] = await Promise.all([
        api.get('/events'),
        api.get('/marketplace/bookings')
      ]);
      setEvents(eventsRes.data);
      setBookings(bookingsRes.data);
    } catch (error) {
      console.error('Failed to fetch user events/bookings', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchServices = async () => {
    try {
      const params = {};
      if (selectedCategory && selectedCategory !== 'All') params.category = selectedCategory;
      if (maxPrice) params.max_price = maxPrice;
      if (locationQuery) params.location = locationQuery;

      const response = await api.get('/marketplace', { params });
      setServices(response.data);
    } catch (error) {
      console.error('Failed to fetch marketplace services', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Fetch services when filters change
  useEffect(() => {
    if (activeTab === 'discover') {
      fetchServices();
    }
  }, [selectedCategory, maxPrice, locationQuery, activeTab]);

  const handleBookSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      await api.post('/marketplace/book', {
        event_id: data.event_id,
        vendor_service_id: selectedService.id,
        message: data.message
      });
      setIsBookModalOpen(false);
      reset();
      // Switch to bookings tab and refresh
      setActiveTab('bookings');
      fetchData();
    } catch (error) {
      console.error('Failed to submit booking', error);
      alert('Failed to send booking request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter services by search input locally for business name in addition to API filters
  const filteredServices = services.filter(service => 
    service.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    service.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 relative">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-display font-bold">Partner Curators</h1>
          <p className="text-gray-500 mt-1">Discover, filter, and book world-class vendors for your events</p>
        </div>
        
        {/* Modern Glassmorphic Tab Switcher */}
        <div className="flex bg-gray-100/80 p-1 rounded-2xl border border-gray-200/50 backdrop-blur-md">
          <button
            onClick={() => setActiveTab('discover')}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 ${
              activeTab === 'discover' 
                ? 'bg-white text-primary shadow-md shadow-gray-200/80' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Discover Vendors
          </button>
          <button
            onClick={() => setActiveTab('bookings')}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 relative ${
              activeTab === 'bookings' 
                ? 'bg-white text-primary shadow-md shadow-gray-200/80' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            My Bookings
            {bookings.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white text-[10px] flex items-center justify-center rounded-full font-bold border-2 border-white animate-bounce">
                {bookings.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {activeTab === 'discover' ? (
        <div className="space-y-8">
          {/* Filters Panel */}
          <div className="glass-card p-6 rounded-3xl space-y-6">
            <div className="flex items-center space-x-2 text-primary">
              <SlidersHorizontal size={20} />
              <h2 className="font-display font-bold text-lg">Filters</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search service name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                />
              </div>

              {/* Category Dropdown */}
              <div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-primary/20 transition-all text-sm text-gray-700"
                >
                  <option value="All">All Categories</option>
                  <option value="Photography">Photography</option>
                  <option value="Catering">Catering</option>
                  <option value="Music/DJ">Music/DJ</option>
                  <option value="Venue">Venue</option>
                  <option value="Florist">Florist</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Location Search */}
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Location (e.g., New York)..."
                  value={locationQuery}
                  onChange={(e) => setLocationQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                />
              </div>

              {/* Budget Limit */}
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="number"
                  placeholder="Max starting price..."
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                />
              </div>
            </div>
          </div>

          {/* Discover Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {loading ? (
              <div className="col-span-full py-20 text-center font-display text-primary animate-pulse">Loading amazing creators...</div>
            ) : filteredServices.length > 0 ? (
              filteredServices.map((service, i) => (
                <motion.div
                  key={service.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="glass-card overflow-hidden rounded-3xl flex flex-col group hover:shadow-xl hover:shadow-primary/5 transition-all duration-500 border border-gray-100"
                >
                  {/* Image Header */}
                  <div className="h-56 relative overflow-hidden bg-gray-100">
                    <img 
                      src={service.image_url || 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?q=80&w=600&auto=format&fit=crop'} 
                      alt={service.business_name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                    />
                    <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-md px-3 py-1 rounded-full flex items-center shadow-lg">
                      <Star size={14} className="fill-gold text-gold mr-1" />
                      <span className="text-xs font-bold text-gray-800">{service.rating}</span>
                    </div>
                    <div className="absolute bottom-4 left-4 bg-primary/95 text-white backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">
                      {service.category}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-6 flex-grow flex flex-col justify-between space-y-4">
                    <div>
                      <h3 className="text-xl font-display font-bold group-hover:text-primary transition-colors">{service.business_name}</h3>
                      
                      <div className="flex items-center text-xs text-gray-400 mt-1 mb-3">
                        <MapPin size={12} className="mr-1" />
                        <span>{service.location || 'Nationwide'}</span>
                      </div>

                      <p className="text-gray-500 text-sm line-clamp-3 leading-relaxed">
                        {service.description}
                      </p>
                    </div>

                    {/* Price and Action */}
                    <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Starting Price</p>
                        <p className="text-lg font-bold text-primary">${parseFloat(service.starting_price).toLocaleString()}</p>
                      </div>
                      
                      <button
                        onClick={() => {
                          setSelectedService(service);
                          setIsBookModalOpen(true);
                        }}
                        className="elegant-button-primary px-5 py-2.5 text-xs rounded-xl shadow-md flex items-center"
                      >
                        Book Curator
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="col-span-full py-20 text-center text-gray-400 italic">No partners match your criteria. Try adjusting filters!</div>
            )}
          </div>
        </div>
      ) : (
        /* Bookings Tab */
        <div className="glass-card p-8 rounded-3xl">
          <div className="flex items-center space-x-2 text-primary mb-6">
            <Calendar size={22} />
            <h2 className="font-display font-bold text-xl">My Sent Requests</h2>
          </div>

          {loading ? (
            <div className="py-20 text-center font-display text-primary animate-pulse">Loading requests...</div>
          ) : bookings.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 text-xs font-bold uppercase tracking-wider">
                    <th className="py-4 px-4">Event Details</th>
                    <th className="py-4 px-4">Booked Partner</th>
                    <th className="py-4 px-4">Message</th>
                    <th className="py-4 px-4">Status</th>
                    <th className="py-4 px-4">Date Sent</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((booking, index) => (
                    <motion.tr 
                      key={booking.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors text-sm"
                    >
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-bold text-gray-800">{booking.event?.title}</p>
                          <p className="text-xs text-gray-400">
                            {booking.event?.event_date 
                              ? new Date(booking.event.event_date).toLocaleDateString(undefined, { dateStyle: 'medium' }) 
                              : 'TBD'}
                          </p>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-bold text-primary">{booking.vendor_service?.business_name}</p>
                          <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full capitalize">
                            {booking.vendor_service?.category}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-gray-500 max-w-xs truncate">
                        {booking.message || <span className="italic text-gray-300">No message provided</span>}
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center w-fit space-x-1
                          ${booking.status === 'accepted' || booking.status === 'confirmed' || booking.status === 'completed'
                            ? 'bg-green-100 text-green-600' 
                            : booking.status === 'rejected' 
                            ? 'bg-red-100 text-red-600' 
                            : 'bg-yellow-100 text-yellow-600'}`}
                        >
                          {booking.status === 'pending' && <Clock size={12} className="mr-1" />}
                          {booking.status === 'accepted' && <CheckCircle2 size={12} className="mr-1" />}
                          {booking.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-xs text-gray-400">
                        {new Date(booking.created_at).toLocaleDateString()}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-20 text-center text-gray-400 italic flex flex-col items-center justify-center space-y-2">
              <Info size={36} className="text-gray-300" />
              <span>You have not sent any booking requests yet. Discover some amazing curators and book your first vendor today!</span>
            </div>
          )}
        </div>
      )}

      {/* Booking Modal */}
      <AnimatePresence>
        {isBookModalOpen && selectedService && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              {/* Modal Header */}
              <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 sticky top-0 z-10">
                <div>
                  <h2 className="text-2xl font-display font-bold">Book {selectedService.business_name}</h2>
                  <p className="text-xs text-gray-400 mt-1">Send a booking proposal to lock in starting price: ${parseFloat(selectedService.starting_price).toLocaleString()}</p>
                </div>
                <button type="button" onClick={() => setIsBookModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <X size={24} />
                </button>
              </div>

              {/* Modal Form */}
              <form onSubmit={handleSubmit(handleBookSubmit)} className="p-8 space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Select Your Event</label>
                  <select
                    {...register('event_id', { required: 'Event is required' })}
                    className="w-full px-4 py-3 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary transition-all text-sm text-gray-700"
                  >
                    <option value="">-- Select Event --</option>
                    {events.map(event => (
                      <option key={event.id} value={event.id}>
                        {event.title} ({event.event_date ? new Date(event.event_date).toLocaleDateString(undefined, { dateStyle: 'short' }) : 'TBD'})
                      </option>
                    ))}
                  </select>
                  {errors.event_id && <p className="mt-1 text-xs text-red-500">{errors.event_id.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Custom Message / Requirements</label>
                  <textarea
                    {...register('message')}
                    rows={4}
                    placeholder="Provide details about your venue, timeline, special requests, and direct contact details..."
                    className="w-full px-4 py-3 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary transition-all text-sm text-gray-700"
                  ></textarea>
                </div>

                <div className="bg-primary/5 p-4 rounded-2xl flex items-start space-x-3 text-xs text-primary/90 leading-relaxed border border-primary/10">
                  <Info size={16} className="shrink-0 mt-0.5 text-primary" />
                  <span>By submitting, a booking invitation will be sent to the vendor. The starting rate of this service will be factored into your budget planning, pending the partner's confirmation and dynamic rate finalization.</span>
                </div>

                {/* Actions */}
                <div className="pt-6 flex justify-end space-x-3 border-t border-gray-50">
                  <button type="button" onClick={() => setIsBookModalOpen(false)} className="px-6 py-3 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                    Cancel
                  </button>
                  <button disabled={isSubmitting || events.length === 0} type="submit" className="elegant-button-primary py-3 px-6 text-sm flex items-center">
                    {isSubmitting ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
                    Send Booking Request
                  </button>
                </div>
                
                {events.length === 0 && (
                  <div className="flex items-center space-x-2 text-red-500 mt-2">
                    <AlertTriangle size={16} />
                    <p className="text-xs">You must create at least one event under "Events" to send a booking request.</p>
                  </div>
                )}
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VendorsPage;
