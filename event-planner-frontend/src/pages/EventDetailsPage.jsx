import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Calendar, 
  MapPin, 
  DollarSign, 
  Clock, 
  Users, 
  Plus, 
  Mail, 
  Check, 
  X, 
  Search, 
  Filter, 
  Trash2, 
  Info, 
  Send, 
  Loader2, 
  Sparkles,
  Award,
  ShieldAlert
} from 'lucide-react';
import api from '../services/api';

const EventDetailsPage = () => {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [guests, setGuests] = useState([]);
  const [vendorServices, setVendorServices] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // overview, guests, hire
  
  // Custom Toast State
  const [toastMessage, setToastMessage] = useState(null);
  const [toastType, setToastType] = useState('success'); // success, error

  // Guest Form Hook
  const { register: registerGuest, handleSubmit: handleGuestSubmit, reset: resetGuestForm, formState: { errors: guestErrors } } = useForm();
  const [submittingGuest, setSubmittingGuest] = useState(false);

  // Vendor Filtering States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [selectedService, setSelectedService] = useState(null);
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const { register: registerBooking, handleSubmit: handleBookingSubmit, reset: resetBookingForm, formState: { isSubmitting: bookingSubmitting } } = useForm();

  const showToast = (msg, type = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const fetchEventDetails = async () => {
    try {
      // 1. Fetch Event
      const eventRes = await api.get(`/events/${id}`);
      setEvent(eventRes.data);

      // 2. Fetch Guests for this event
      const guestsRes = await api.get('/guests');
      const filteredGuests = guestsRes.data.filter(g => Number(g.event_id) === Number(id));
      setGuests(filteredGuests);

      // 3. Fetch Booking status for this event
      const bookingsRes = await api.get('/marketplace/bookings');
      const filteredBookings = bookingsRes.data.filter(b => Number(b.event_id) === Number(id));
      setBookings(filteredBookings);

    } catch (err) {
      console.error('Failed to load event details', err);
      showToast('Failed to load event details. Please try again.', 'error');
    }
  };

  const fetchVendorServices = async () => {
    try {
      const res = await api.get('/marketplace');
      setVendorServices(res.data);
    } catch (err) {
      console.error('Failed to fetch marketplace services', err);
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchEventDetails(), fetchVendorServices()]).finally(() => {
      setLoading(false);
    });
  }, [id]);

  // Guest Action Handlers
  const onAddGuest = async (data) => {
    setSubmittingGuest(true);
    try {
      const response = await api.post('/guests', {
        ...data,
        event_id: id,
        rsvp_status: 'pending'
      });
      setGuests([...guests, response.data]);
      showToast(`Successfully added guest ${data.name}!`);
      resetGuestForm();
    } catch (err) {
      console.error(err);
      showToast('Failed to add guest. Please check validation.', 'error');
    } finally {
      setSubmittingGuest(false);
    }
  };

  const onDeleteGuest = async (guestId) => {
    if (!window.confirm('Are you sure you want to remove this guest?')) return;
    try {
      await api.delete(`/guests/${guestId}`);
      setGuests(guests.filter(g => g.id !== guestId));
      showToast('Guest successfully removed.');
    } catch (err) {
      console.error(err);
      showToast('Failed to delete guest.', 'error');
    }
  };

  const onSendRSVPEmail = async (guest) => {
    try {
      const res = await api.post(`/guests/${guest.id}/rsvp-email`);
      showToast(res.data.message || `RSVP Invitation sent successfully to ${guest.email}!`);
      
      // Update status to pending (simulated on frontend too)
      setGuests(guests.map(g => g.id === guest.id ? { ...g, rsvp_status: 'pending' } : g));
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.error || 'Failed to send RSVP email.';
      showToast(errMsg, 'error');
    }
  };

  // Direct Booking Handler
  const handleDirectBook = async (formData) => {
    try {
      const payload = {
        event_id: id,
        vendor_service_id: selectedService.id,
        message: formData.message
      };
      const res = await api.post('/marketplace/book', payload);
      showToast(res.data.message || `Booking request sent to ${selectedService.business_name}!`);
      
      // Close modal and reset
      setIsBookModalOpen(false);
      resetBookingForm();

      // Refresh event details to show newly booked curator
      fetchEventDetails();
    } catch (err) {
      console.error(err);
      showToast('Failed to book curator service.', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 space-y-4">
        <Loader2 className="animate-spin text-primary" size={48} />
        <p className="font-display text-primary animate-pulse text-lg">Orchestrating your event details...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="text-center py-20 space-y-4">
        <h2 className="text-2xl font-display font-bold">Event Not Found</h2>
        <Link to="/events" className="elegant-button-primary inline-flex items-center">
          <ArrowLeft size={16} className="mr-2" /> Back to Masterpieces
        </Link>
      </div>
    );
  }

  // Filtered Vendor services
  const filteredServices = vendorServices.filter(service => {
    const matchesSearch = service.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          service.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === '' || service.category === selectedCategory;
    const matchesLocation = locationQuery === '' || service.location.toLowerCase().includes(locationQuery.toLowerCase());
    const matchesPrice = maxPrice === '' || parseFloat(service.starting_price) <= parseFloat(maxPrice);
    return matchesSearch && matchesCategory && matchesLocation && matchesPrice;
  });

  return (
    <div className="space-y-8">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.9 }}
            className={`fixed top-6 right-6 z-50 p-5 rounded-2xl shadow-xl flex items-center space-x-3 text-sm font-bold border max-w-md ${
              toastType === 'success' 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-100' 
                : 'bg-rose-50 text-rose-800 border-rose-100'
            }`}
          >
            {toastType === 'success' ? <Check className="text-emerald-500 shrink-0" size={20} /> : <ShieldAlert className="text-rose-500 shrink-0" size={20} />}
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <Link to="/events" className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm hover:shadow-md transition-all">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-4xl font-display font-bold">{event.title}</h1>
            <p className="text-gray-500 mt-1 capitalize">{event.event_type} Management Suite</p>
          </div>
        </div>

        {/* Dynamic Status Tag */}
        <div>
          {(() => {
            const s = event.status?.toLowerCase();
            if (s === 'live/happening' || s === 'live') {
              return (
                <div className="bg-emerald-500 text-white px-6 py-2.5 rounded-full font-bold uppercase tracking-wider text-xs shadow-lg flex items-center space-x-2 animate-pulse">
                  <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping"></span>
                  <span>Live & Happening Now</span>
                </div>
              );
            }
            if (s === 'completed') {
              return (
                <div className="bg-gray-600 text-white px-6 py-2.5 rounded-full font-bold uppercase tracking-wider text-xs shadow-lg">
                  Completed
                </div>
              );
            }
            if (s === 'cancelled') {
              return (
                <div className="bg-rose-500 text-white px-6 py-2.5 rounded-full font-bold uppercase tracking-wider text-xs shadow-lg">
                  Cancelled
                </div>
              );
            }
            return (
              <div className="bg-primary/5 text-primary border border-primary/20 px-6 py-2.5 rounded-full font-bold uppercase tracking-wider text-xs shadow-lg">
                Upcoming Blueprint
              </div>
            );
          })()}
        </div>
      </div>

      {/* Nav Tabs */}
      <div className="flex space-x-4 p-1.5 bg-gray-100/50 backdrop-blur-sm rounded-2xl w-fit">
        <button 
          onClick={() => setActiveTab('overview')} 
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'overview' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
        >
          Workspace
        </button>
        <button 
          onClick={() => setActiveTab('guests')} 
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'guests' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
        >
          Guests ({guests.length})
        </button>
        <button 
          onClick={() => setActiveTab('hire')} 
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'hire' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
        >
          Direct Curator Booking
        </button>
      </div>

      {/* Tab Contents */}
      <div className="space-y-8">
        
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Event Specs Card */}
            <div className="lg:col-span-2 glass-card p-8 rounded-3xl space-y-6">
              <h3 className="text-xl font-display font-bold text-gray-800 border-b border-gray-100 pb-4">Event Specifications</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                    <Calendar size={20} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Date & Time</p>
                    <p className="font-bold text-gray-800">
                      {event.event_date ? new Date(event.event_date).toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' }) : 'TBD'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                    <Clock size={20} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Plan Duration</p>
                    <p className="font-bold text-gray-800">{event.duration || 3} Hours</p>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                    <MapPin size={20} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Venue</p>
                    <p className="font-bold text-gray-800">{event.venue || 'No venue configured yet'}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                    <DollarSign size={20} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Budget limit</p>
                    <p className="font-bold text-gray-800">${parseFloat(event.budget || 0).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {event.description && (
                <div className="pt-6 border-t border-gray-100">
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">Aesthetic Vision</p>
                  <p className="text-gray-600 text-sm leading-relaxed">{event.description}</p>
                </div>
              )}
            </div>

            {/* Booked Creators Checklist */}
            <div className="glass-card p-8 rounded-3xl space-y-6">
              <h3 className="text-xl font-display font-bold text-gray-800 border-b border-gray-100 pb-4">Hired Curators</h3>
              
              {bookings.length > 0 ? (
                <div className="space-y-4">
                  {bookings.map((booking) => (
                    <div key={booking.id} className="p-4 bg-gray-50/50 rounded-2xl border border-gray-100 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-primary text-sm">{booking.vendor_service?.business_name}</p>
                        <p className="text-[10px] text-gray-400 capitalize font-bold">{booking.vendor_service?.category}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                        booking.status === 'accepted' ? 'bg-emerald-50 text-emerald-700' :
                        booking.status === 'rejected' ? 'bg-rose-50 text-rose-700' :
                        'bg-amber-50 text-amber-700 animate-pulse'
                      }`}>
                        {booking.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  <p className="text-xs text-gray-400 mb-4">No services booked for this masterpiece yet.</p>
                  <button 
                    onClick={() => setActiveTab('hire')} 
                    className="elegant-button-primary py-2 px-4 text-xs font-bold inline-flex items-center"
                  >
                    Browse Creators
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* GUESTS TAB */}
        {activeTab === 'guests' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Guest list management */}
            <div className="lg:col-span-2 glass-card p-8 rounded-3xl space-y-6">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <h3 className="text-xl font-display font-bold text-gray-800">Confirmed Attendees</h3>
                <span className="bg-primary/5 text-primary text-xs font-bold px-3 py-1 rounded-full">
                  Total Guests: {guests.length}
                </span>
              </div>

              {guests.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-gray-400 text-xs font-bold uppercase tracking-wider">
                        <th className="py-3 px-4">Attendee Name</th>
                        <th className="py-3 px-4">Side/Group</th>
                        <th className="py-3 px-4">RSVP Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {guests.map((guest) => (
                        <tr key={guest.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-all">
                          <td className="py-4 px-4 font-bold text-gray-800">
                            <div>
                              <p>{guest.name}</p>
                              {guest.email && <p className="text-xs text-gray-400 font-normal">{guest.email}</p>}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2.5 py-0.5 rounded-full capitalize">
                              {guest.side || 'General'}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              guest.rsvp_status === 'confirmed' ? 'bg-emerald-50 text-emerald-700' :
                              guest.rsvp_status === 'declined' ? 'bg-rose-50 text-rose-700' :
                              'bg-amber-50 text-amber-700'
                            }`}>
                              {guest.rsvp_status}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-right space-x-2">
                            {guest.email && (
                              <button 
                                onClick={() => onSendRSVPEmail(guest)}
                                title="Send RSVP Email invitation link"
                                className="w-8 h-8 rounded-full bg-primary/5 hover:bg-primary hover:text-white transition-all text-primary inline-flex items-center justify-center"
                              >
                                <Mail size={14} />
                              </button>
                            )}
                            <button 
                              onClick={() => onDeleteGuest(guest.id)}
                              title="Remove Guest"
                              className="w-8 h-8 rounded-full bg-rose-50 hover:bg-rose-500 hover:text-white transition-all text-rose-600 inline-flex items-center justify-center"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-20 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                  <Users className="mx-auto text-gray-300 mb-4" size={48} />
                  <p className="text-gray-400 font-medium">Your guest catalog is currently pristine.</p>
                  <p className="text-xs text-gray-400 mt-1">Add attendees using the curator dashboard on the right.</p>
                </div>
              )}
            </div>

            {/* Add Guest Curator Card */}
            <div className="glass-card p-8 rounded-3xl space-y-6 self-start">
              <h3 className="text-xl font-display font-bold text-gray-800 border-b border-gray-100 pb-4">Add Guest</h3>
              
              <form onSubmit={handleGuestSubmit(onAddGuest)} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Guest Name</label>
                  <input
                    {...registerGuest('name', { required: 'Name is required' })}
                    type="text"
                    placeholder="e.g. Eleanor Vance"
                    className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-primary transition-all text-sm"
                  />
                  {guestErrors.name && <p className="mt-1 text-xs text-red-500">{guestErrors.name.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Email Address</label>
                  <input
                    {...registerGuest('email')}
                    type="email"
                    placeholder="name@example.com"
                    className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-primary transition-all text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Group Side</label>
                  <select
                    {...registerGuest('side')}
                    className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-primary transition-all text-sm text-gray-700"
                  >
                    <option value="bride">Bride's Side</option>
                    <option value="groom">Groom's Side</option>
                    <option value="general">General Invitee</option>
                    <option value="vip">VIP / VIP Guest</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Notes</label>
                  <textarea
                    {...registerGuest('notes')}
                    rows={3}
                    placeholder="Allergies, accommodations, preferences..."
                    className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-primary transition-all text-sm resize-none"
                  ></textarea>
                </div>

                <button 
                  disabled={submittingGuest}
                  type="submit" 
                  className="w-full elegant-button-primary py-3 px-4 text-sm flex items-center justify-center font-bold"
                >
                  {submittingGuest ? <Loader2 className="animate-spin mr-2" size={16} /> : <Plus className="mr-2" size={16} />}
                  Add Attendee
                </button>
              </form>
            </div>
          </div>
        )}

        {/* HIRE TAB */}
        {activeTab === 'hire' && (
          <div className="space-y-8">
            {/* Filter Bar */}
            <div className="glass-card p-6 rounded-3xl space-y-4">
              <div className="flex items-center space-x-2 text-primary font-display font-bold">
                <Sparkles size={20} />
                <span>Search Curators Marketplace</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Search query */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder="Search keywords..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                  />
                </div>

                {/* Category select */}
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-primary/20 transition-all text-sm text-gray-700"
                  >
                    <option value="">All Categories</option>
                    <option value="catering">Catering & Bites</option>
                    <option value="photography">Cinematic Photography</option>
                    <option value="dj">DJ & Live Music</option>
                    <option value="venue">Luxury Venues</option>
                    <option value="florist">Bespoke Floristry</option>
                  </select>
                </div>

                {/* Location select */}
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

                {/* Price ceiling input */}
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="number"
                    placeholder="Max price limit..."
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Curator Marketplace Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredServices.length > 0 ? (
                filteredServices.map((service, i) => (
                  <motion.div
                    key={service.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="glass-card group overflow-hidden rounded-3xl flex flex-col justify-between"
                  >
                    <div>
                      {/* Image header */}
                      <div className="relative h-48 bg-gray-100 overflow-hidden">
                        {service.image_url ? (
                          <img 
                            src={service.image_url} 
                            alt={service.business_name} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300">
                            <Sparkles size={48} />
                          </div>
                        )}
                        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-bold text-primary uppercase tracking-widest shadow-md">
                          {service.category}
                        </div>
                      </div>

                      {/* Info body */}
                      <div className="p-6 space-y-4">
                        <div className="flex justify-between items-start">
                          <h4 className="font-display font-bold text-xl group-hover:text-primary transition-all leading-tight">{service.business_name}</h4>
                        </div>
                        
                        <p className="text-gray-500 text-xs leading-relaxed line-clamp-3">{service.description}</p>
                        
                        <div className="flex flex-wrap gap-2 text-xs pt-2">
                          <span className="flex items-center text-gray-500 bg-gray-50 px-2.5 py-1 rounded-full font-medium">
                            <MapPin size={12} className="mr-1 text-primary/60" />
                            {service.location}
                          </span>
                          <span className="flex items-center text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full font-medium">
                            <Award size={12} className="mr-1 text-amber-500" />
                            ★ {service.rating || 'New'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Booking trigger footer */}
                    <div className="p-6 pt-0 border-t border-gray-50 mt-4 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Starting rate</p>
                        <p className="text-lg font-bold text-gray-800">${parseFloat(service.starting_price).toLocaleString()}</p>
                      </div>
                      <button 
                        onClick={() => {
                          setSelectedService(service);
                          setIsBookModalOpen(true);
                        }}
                        className="elegant-button-primary py-2.5 px-4 text-xs font-bold flex items-center shadow-md hover:shadow-lg"
                      >
                        Book Curator
                      </button>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="col-span-full py-20 text-center font-display text-primary/60">
                  No registered curators match your search specifications.
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Booking Modal */}
      <AnimatePresence>
        {isBookModalOpen && selectedService && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Overlay */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsBookModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            ></motion.div>

            {/* Modal Box */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100"
            >
              {/* Header */}
              <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div>
                  <h2 className="text-2xl font-display font-bold">Book {selectedService.business_name}</h2>
                  <p className="text-xs text-gray-400 mt-1">Propose a secure partnership for "{event.title}"</p>
                </div>
                <button type="button" onClick={() => setIsBookModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-all">
                  <X size={24} />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleBookingSubmit(handleDirectBook)} className="p-8 space-y-6">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Event Scope</label>
                  <div className="px-4 py-3 bg-gray-100/50 rounded-2xl text-sm text-gray-600 border border-gray-200/50">
                    <span className="font-bold text-primary">{event.title}</span> • scheduled for {event.event_date ? new Date(event.event_date).toLocaleDateString() : 'TBD'}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Custom Message / Requirements</label>
                  <textarea
                    {...registerBooking('message')}
                    rows={4}
                    placeholder="Provide specific notes about your venue layout, timing parameters, and direct contact details..."
                    className="w-full px-4 py-3 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary transition-all text-sm text-gray-700 resize-none"
                  ></textarea>
                </div>

                <div className="bg-primary/5 p-4 rounded-2xl flex items-start space-x-3 text-xs text-primary/90 leading-relaxed border border-primary/10">
                  <Info size={16} className="shrink-0 mt-0.5 text-primary" />
                  <span>The curator starting rate of ${parseFloat(selectedService.starting_price).toLocaleString()} will be automatically factored into your event budget layout pending the vendor's secure acceptance.</span>
                </div>

                {/* Footer buttons */}
                <div className="flex justify-end space-x-3 border-t border-gray-100 pt-6">
                  <button 
                    type="button" 
                    onClick={() => setIsBookModalOpen(false)} 
                    className="px-6 py-3 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    disabled={bookingSubmitting}
                    type="submit" 
                    className="elegant-button-primary py-3 px-6 text-sm flex items-center font-bold shadow-md hover:shadow-lg"
                  >
                    {bookingSubmitting ? <Loader2 className="animate-spin mr-2" size={16} /> : <Send className="mr-2" size={16} />}
                    Submit Booking Request
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EventDetailsPage;
