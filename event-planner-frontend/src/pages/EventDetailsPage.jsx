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
  ShieldAlert,
  Pencil
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

  // Queued RSVP Email States
  const [sendingEmails, setSendingEmails] = useState({});
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [selectedGuestForEmail, setSelectedGuestForEmail] = useState(null);

  // Bulk RSVP Email States
  const [selectedGuestIds, setSelectedGuestIds] = useState([]);
  const [bulkEmailModalOpen, setBulkEmailModalOpen] = useState(false);
  const [isSendingBulk, setIsSendingBulk] = useState(false);

  // Vendor Filtering States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [selectedService, setSelectedService] = useState(null);
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const { register: registerBooking, handleSubmit: handleBookingSubmit, reset: resetBookingForm, formState: { isSubmitting: bookingSubmitting } } = useForm();

  // Edit Event Specifications States
  const [isEditSpecModalOpen, setIsEditSpecModalOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editDuration, setEditDuration] = useState('');
  const [editVenue, setEditVenue] = useState('');
  const [editBudget, setEditBudget] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [updatingSpec, setUpdatingSpec] = useState(false);

  const openEditSpecModal = () => {
    setEditTitle(event.title || '');
    if (event.event_date) {
      const dateObj = new Date(event.event_date);
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      const hours = String(dateObj.getHours()).padStart(2, '0');
      const minutes = String(dateObj.getMinutes()).padStart(2, '0');
      setEditDate(`${year}-${month}-${day}T${hours}:${minutes}`);
    } else {
      setEditDate('');
    }
    setEditDuration(event.duration || 3);
    setEditVenue(event.venue || '');
    setEditBudget(event.budget || 0);
    setEditDescription(event.description || '');
    setIsEditSpecModalOpen(true);
  };

  const handleSaveSpec = async (e) => {
    e.preventDefault();
    setUpdatingSpec(true);
    try {
      const payload = {
        title: editTitle,
        event_date: editDate,
        duration: Number(editDuration),
        venue: editVenue,
        budget: Number(editBudget),
        description: editDescription
      };
      const res = await api.put(`/events/${id}`, payload);
      setEvent(res.data);
      showToast('Event specifications updated successfully!');
      setIsEditSpecModalOpen(false);
    } catch (err) {
      console.error(err);
      const errorMsg = err.response?.data?.event_date?.[0] || err.response?.data?.message || 'Failed to update event specifications.';
      showToast(errorMsg, 'error');
    } finally {
      setUpdatingSpec(false);
    }
  };

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
    setSelectedGuestForEmail(guest);
    setEmailModalOpen(true);
  };

  const triggerRsvpEmail = async () => {
    if (!selectedGuestForEmail) return;
    const guest = selectedGuestForEmail;
    setEmailModalOpen(false);
    
    setSendingEmails(prev => ({ ...prev, [guest.id]: true }));
    try {
      const res = await api.post(`/guests/${guest.id}/rsvp-email`);
      showToast(res.data.message || `RSVP Invitation sent successfully to ${guest.email}!`);
      
      setGuests(guests.map(g => g.id === guest.id ? { ...g, rsvp_status: 'pending' } : g));
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.error || err.response?.data?.message || 'Failed to send RSVP email.';
      showToast(errMsg, 'error');
    } finally {
      setSendingEmails(prev => ({ ...prev, [guest.id]: false }));
      setSelectedGuestForEmail(null);
    }
  };

  // Helper functions for bulk guest selection and email queueing
  const eligibleGuests = guests.filter(g => g.email);
  const isAllEligibleSelected = eligibleGuests.length > 0 && eligibleGuests.every(g => selectedGuestIds.includes(g.id));

  const toggleSelectGuest = (guestId) => {
    setSelectedGuestIds(prev => 
      prev.includes(guestId) ? prev.filter(id => id !== guestId) : [...prev, guestId]
    );
  };

  const toggleSelectAllEligible = () => {
    if (isAllEligibleSelected) {
      setSelectedGuestIds([]);
    } else {
      setSelectedGuestIds(eligibleGuests.map(g => g.id));
    }
  };

  const triggerBulkRsvpEmails = async () => {
    if (selectedGuestIds.length === 0) return;
    setBulkEmailModalOpen(false);
    setIsSendingBulk(true);

    // Turn on visually trackable spinners for each selected guest
    const loadingMap = {};
    selectedGuestIds.forEach(id => {
      loadingMap[id] = true;
    });
    setSendingEmails(prev => ({ ...prev, ...loadingMap }));

    try {
      const res = await api.post('/guests/rsvp-bulk', { guest_ids: selectedGuestIds });
      showToast(res.data.message || `Successfully sent invitations to ${selectedGuestIds.length} guest(s)!`);

      // Update state dynamically to show pending response
      setGuests(guests.map(g => 
        selectedGuestIds.includes(g.id) ? { ...g, rsvp_status: 'pending' } : g
      ));
      setSelectedGuestIds([]);
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.error || err.response?.data?.message || 'Failed to dispatch bulk RSVP invitation emails.';
      showToast(errMsg, 'error');
    } finally {
      setIsSendingBulk(false);
      // Turn off visually trackable spinners
      const resettingMap = {};
      selectedGuestIds.forEach(id => {
        resettingMap[id] = false;
      });
      setSendingEmails(prev => ({ ...prev, ...resettingMap }));
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

  const isCompleted = event.status?.toLowerCase() === 'completed';

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
            className={`fixed top-6 right-6 z-[9999] p-5 rounded-2xl shadow-xl flex items-center space-x-3 text-sm font-bold border max-w-md ${
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
        {!isCompleted && (
          <button 
            onClick={() => setActiveTab('hire')} 
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'hire' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
          >
            Direct Curator Booking
          </button>
        )}
      </div>

      {/* Tab Contents */}
      <div className="space-y-8">
        
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Event Specs Card */}
            <div className="lg:col-span-2 glass-card p-8 rounded-3xl space-y-6">
              <div className="flex justify-between items-center border-b border-gray-100 pb-4">
                <h3 className="text-xl font-display font-bold text-gray-800">Event Specifications</h3>
                {!isCompleted && (
                  <button 
                    onClick={openEditSpecModal}
                    className="elegant-button-secondary py-1.5 px-4 text-xs font-bold flex items-center hover:bg-primary hover:text-white"
                  >
                    <Pencil size={12} className="mr-1.5" />
                    Edit Specifications
                  </button>
                )}
              </div>
              
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
              <div className="flex justify-between items-center border-b border-gray-100 pb-4">
                <h3 className="text-xl font-display font-bold text-gray-800">Hired Curators</h3>
                {!isCompleted && (
                  <button 
                    onClick={() => setActiveTab('hire')}
                    className="elegant-button-secondary py-1.5 px-3 text-xs font-bold flex items-center hover:bg-primary hover:text-white"
                  >
                    <Plus size={12} className="mr-1.5" />
                    Add Curators
                  </button>
                )}
              </div>
              
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
                  {!isCompleted && (
                    <button 
                      onClick={() => setActiveTab('hire')} 
                      className="elegant-button-primary py-2 px-4 text-xs font-bold inline-flex items-center"
                    >
                      Browse Creators
                    </button>
                  )}
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
                <h3 className="text-xl font-display font-bold text-gray-800">Confirmed Attendees</h3>
                <div className="flex items-center space-x-3">
                  {selectedGuestIds.length > 0 && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      onClick={() => setBulkEmailModalOpen(true)}
                      className="elegant-button-primary py-1.5 px-4 text-[10px] font-bold flex items-center shadow-md hover:shadow-lg transition-all"
                    >
                      <Mail className="mr-1.5 animate-bounce" size={12} />
                      Send Selected ({selectedGuestIds.length})
                    </motion.button>
                  )}
                  <span className="bg-primary/5 text-primary text-xs font-bold px-3 py-1 rounded-full">
                    Total Guests: {guests.length}
                  </span>
                </div>
              </div>

              {guests.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-gray-400 text-xs font-bold uppercase tracking-wider">
                        {!isCompleted && (
                          <th className="py-3 px-4 w-12 text-center">
                            <input 
                              type="checkbox"
                              disabled={eligibleGuests.length === 0}
                              checked={isAllEligibleSelected}
                              onChange={toggleSelectAllEligible}
                              className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary transition-all cursor-pointer"
                            />
                          </th>
                        )}
                        <th className="py-3 px-4">Attendee Name</th>
                        <th className="py-3 px-4">Side/Group</th>
                        <th className="py-3 px-4">RSVP Status</th>
                        {!isCompleted && <th className="py-3 px-4 text-right">Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {guests.map((guest) => (
                        <tr key={guest.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-all">
                          {!isCompleted && (
                            <td className="py-4 px-4 w-12 text-center">
                              {guest.email ? (
                                <input 
                                  type="checkbox"
                                  checked={selectedGuestIds.includes(guest.id)}
                                  onChange={() => toggleSelectGuest(guest.id)}
                                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary transition-all cursor-pointer"
                                />
                              ) : (
                                <input 
                                  type="checkbox"
                                  disabled
                                  title="No email configured"
                                  className="w-4 h-4 text-gray-200 border-gray-200 rounded cursor-not-allowed"
                                />
                              )}
                            </td>
                          )}
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
                          {!isCompleted && (
                            <td className="py-4 px-4 text-right space-x-2">
                              {guest.email && (
                                <button 
                                  disabled={sendingEmails[guest.id]}
                                  onClick={() => onSendRSVPEmail(guest)}
                                  title="Send RSVP Email invitation link"
                                  className={`w-8 h-8 rounded-full bg-primary/5 hover:bg-primary hover:text-white transition-all text-primary inline-flex items-center justify-center ${sendingEmails[guest.id] ? 'opacity-50 cursor-not-allowed hover:bg-primary/5 hover:text-primary' : ''}`}
                                >
                                  {sendingEmails[guest.id] ? (
                                    <Loader2 className="animate-spin" size={14} />
                                  ) : (
                                    <Mail size={14} />
                                  )}
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
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-20 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                  <Users className="mx-auto text-gray-300 mb-4" size={48} />
                  <p className="text-gray-400 font-medium">Your guest catalog is currently pristine.</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {isCompleted 
                      ? 'This event is completed and the guest catalog is locked.' 
                      : 'Add attendees using the curator dashboard on the right.'}
                  </p>
                </div>
              )}
            </div>

            {/* Add Guest Curator Card */}
            <div className="glass-card p-8 rounded-3xl space-y-6 self-start">
              {isCompleted ? (
                <div className="space-y-4 text-center py-6">
                  <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                    <Check size={32} />
                  </div>
                  <h3 className="text-xl font-display font-bold text-gray-800">Event Completed</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">
                    This masterpiece is officially complete. The guest catalog is finalized and locked against future modifications.
                  </p>
                </div>
              ) : (
                <>
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
                </>
              )}
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
                      {isCompleted ? (
                        <button 
                          disabled
                          className="bg-gray-100 text-gray-400 py-2.5 px-4 text-xs font-bold flex items-center rounded-full cursor-not-allowed border border-gray-200/50"
                        >
                          Event Completed
                        </button>
                      ) : (
                        <button 
                          onClick={() => {
                            setSelectedService(service);
                            setIsBookModalOpen(true);
                          }}
                          className="elegant-button-primary py-2.5 px-4 text-xs font-bold flex items-center shadow-md hover:shadow-lg"
                        >
                          Book Curator
                        </button>
                      )}
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

      {/* RSVP Invitation Email Confirmation Modal */}
      <AnimatePresence>
        {emailModalOpen && selectedGuestForEmail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Overlay */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEmailModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            ></motion.div>

            {/* Modal Box */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-100"
            >
              {/* Header */}
              <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                    <Mail size={20} />
                  </div>
                  <div>
                    <h2 className="text-xl font-display font-bold text-gray-800">Dispatch RSVP Invitation</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Send real email invite to guest</p>
                  </div>
                </div>
                <button type="button" onClick={() => setEmailModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-all">
                  <X size={20} />
                </button>
              </div>

              {/* Body */}
              <div className="p-8 space-y-5">
                <p className="text-sm text-gray-500 leading-relaxed">
                  You are about to transmit a professional luxury RSVP invitation email to:
                </p>

                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400 font-medium">Guest Name</span>
                    <span className="font-bold text-gray-700">{selectedGuestForEmail.name}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400 font-medium">Email Address</span>
                    <span className="font-bold text-primary font-mono">{selectedGuestForEmail.email}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400 font-medium">Event Title</span>
                    <span className="font-bold text-gray-700">{event.title}</span>
                  </div>
                </div>

                <div className="bg-amber-50 p-4 rounded-2xl flex items-start space-x-3 text-xs text-amber-800 leading-relaxed border border-amber-100">
                  <Info size={16} className="shrink-0 mt-0.5 text-amber-600" />
                  <span>The system will automatically set the guest's RSVP response status to <strong>Pending</strong>. They can accept or decline directly from the email with a single click.</span>
                </div>

                {/* Footer buttons */}
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                  <button 
                    type="button" 
                    onClick={() => setEmailModalOpen(false)} 
                    className="px-6 py-2.5 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={triggerRsvpEmail}
                    className="elegant-button-primary py-2.5 px-6 text-xs flex items-center font-bold shadow-md hover:shadow-lg"
                  >
                    <Send className="mr-2" size={14} />
                    Confirm & Send Real Email
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bulk RSVP Invitation Email Confirmation Modal */}
      <AnimatePresence>
        {bulkEmailModalOpen && selectedGuestIds.length > 0 && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Overlay */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setBulkEmailModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            ></motion.div>

            {/* Modal Box */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-100"
            >
              {/* Header */}
              <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                    <Mail size={20} className="animate-pulse" />
                  </div>
                  <div>
                    <h2 className="text-xl font-display font-bold text-gray-800">Bulk RSVP Dispatch</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Send real emails to all selected attendees</p>
                  </div>
                </div>
                <button type="button" onClick={() => setBulkEmailModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-all">
                  <X size={20} />
                </button>
              </div>

              {/* Body */}
              <div className="p-8 space-y-5">
                <p className="text-sm text-gray-500 leading-relaxed">
                  You are about to queue and dispatch luxury RSVP invitations to <strong className="text-primary">{selectedGuestIds.length}</strong> selected guest(s) for the event <strong className="text-gray-700">"{event.title}"</strong>.
                </p>

                <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 flex items-start space-x-3 text-xs text-primary leading-relaxed">
                  <Info size={16} className="shrink-0 mt-0.5 text-primary" />
                  <span>The emails will be securely queued and delivered in the background. Their status will automatically set to <strong>Pending</strong>.</span>
                </div>

                {/* Footer buttons */}
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                  <button 
                    type="button" 
                    onClick={() => setBulkEmailModalOpen(false)} 
                    className="px-6 py-2.5 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={triggerBulkRsvpEmails}
                    disabled={isSendingBulk}
                    className="elegant-button-primary py-2.5 px-6 text-xs flex items-center font-bold shadow-md hover:shadow-lg"
                  >
                    {isSendingBulk ? (
                      <Loader2 className="animate-spin mr-2" size={14} />
                    ) : (
                      <Send className="mr-2" size={14} />
                    )}
                    Confirm & Send {selectedGuestIds.length} Emails
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Specifications Modal */}
      <AnimatePresence>
        {isEditSpecModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Overlay */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditSpecModalOpen(false)}
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
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                    <Pencil size={20} />
                  </div>
                  <div>
                    <h2 className="text-xl font-display font-bold text-gray-800">Edit Event Specifications</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Refine event date, venue, budget, and description</p>
                  </div>
                </div>
                <button type="button" onClick={() => setIsEditSpecModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-all">
                  <X size={20} />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSaveSpec} className="p-8 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Event Title</label>
                    <input
                      required
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-primary transition-all text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Date & Time</label>
                    <input
                      required
                      type="datetime-local"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-primary transition-all text-sm text-gray-700"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Duration (Hours)</label>
                    <input
                      required
                      type="number"
                      min="1"
                      value={editDuration}
                      onChange={(e) => setEditDuration(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-primary transition-all text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Venue</label>
                    <input
                      type="text"
                      placeholder="e.g. Block 45"
                      value={editVenue}
                      onChange={(e) => setEditVenue(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-primary transition-all text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Budget Limit ($)</label>
                    <input
                      type="number"
                      min="0"
                      value={editBudget}
                      onChange={(e) => setEditBudget(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-primary transition-all text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Aesthetic Vision (Description)</label>
                  <textarea
                    rows={4}
                    placeholder="Describe the aesthetic direction, goals, and outline of your event..."
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-primary transition-all text-sm resize-none text-gray-700"
                  ></textarea>
                </div>

                <div className="bg-amber-50 p-4 rounded-2xl flex items-start space-x-3 text-xs text-amber-800 leading-relaxed border border-amber-100">
                  <Info size={16} className="shrink-0 mt-0.5 text-amber-600" />
                  <span>The date must be scheduled at least 24 hours in the future to comply with active orchestrator validation rules.</span>
                </div>

                {/* Footer buttons */}
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                  <button 
                    type="button" 
                    onClick={() => setIsEditSpecModalOpen(false)} 
                    className="px-6 py-2.5 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    disabled={updatingSpec}
                    type="submit"
                    className="elegant-button-primary py-2.5 px-6 text-xs flex items-center font-bold shadow-md hover:shadow-lg"
                  >
                    {updatingSpec ? (
                      <Loader2 className="animate-spin mr-2" size={14} />
                    ) : (
                      <Check className="mr-2" size={14} />
                    )}
                    Save Specifications
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
