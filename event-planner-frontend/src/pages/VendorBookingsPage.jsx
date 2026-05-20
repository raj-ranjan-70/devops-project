import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, CheckCircle2, Clock, AlertTriangle, Info, 
  MapPin, Users, MessageSquare, Loader2, Filter, Sparkles, XCircle,
  CreditCard, Coins
} from 'lucide-react';
import api from '../services/api';
import Toastify from 'toastify-js';
import "toastify-js/src/toastify.css";

const VendorBookingsPage = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'pending', 'accepted', 'rejected'
  const [paymentFilter, setPaymentFilter] = useState('all'); // 'all', 'payment pending', 'paid', 'failed'
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // State for Payment Request Modal
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [billingAmount, setBillingAmount] = useState('');
  const [requestMessage, setRequestMessage] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);

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

  const handleOpenRequestModal = (booking) => {
    setSelectedBooking(booking);
    setBillingAmount(booking.vendor_service?.starting_price || '');
    setRequestMessage('');
    setIsRequestModalOpen(true);
  };

  const handleCloseRequestModal = () => {
    setIsRequestModalOpen(false);
    setSelectedBooking(null);
    setBillingAmount('');
    setRequestMessage('');
  };

  const handleSendPaymentRequest = async (e) => {
    e.preventDefault();
    if (!selectedBooking || submittingRequest) return;

    setSubmittingRequest(true);
    try {
      await api.post('/payments/request', {
        service_booking_id: selectedBooking.id,
        amount: billingAmount ? parseFloat(billingAmount) : null,
        message: requestMessage,
      });

      Toastify({
        text: "🎉 Payment request sent to the planner successfully!",
        duration: 5000,
        style: { 
          background: "linear-gradient(135deg, #10b981, #059669)",
          borderRadius: "16px",
          fontWeight: "bold"
        }
      }).showToast();

      handleCloseRequestModal();
      fetchBookings(); // Refresh the list
    } catch (error) {
      console.error("Failed to send payment request", error);
      Toastify({
        text: error.response?.data?.message || "Failed to send payment request.",
        duration: 4000,
        style: { background: "linear-gradient(135deg, #ef4444, #dc2626)" }
      }).showToast();
    } finally {
      setSubmittingRequest(false);
    }
  };

  // Filter bookings based on active status tab and payment status
  const filteredBookings = bookings.filter(b => {
    // 1. Request status filter
    if (filterStatus !== 'all') {
      if (filterStatus === 'pending' && b.status !== 'pending') return false;
      if (filterStatus === 'accepted' && b.status !== 'accepted') return false;
      if (filterStatus === 'rejected' && b.status !== 'rejected') return false;
    }

    // 2. Payment status filter
    if (paymentFilter !== 'all') {
      const isPaid = b.payments?.some(p => p.status === 'paid');
      const isFailed = b.payments?.some(p => p.status === 'failed') && !isPaid;
      const isPending = b.status === 'accepted' && !isPaid && !isFailed;

      if (paymentFilter === 'payment pending' && !isPending) return false;
      if (paymentFilter === 'paid' && !isPaid) return false;
      if (paymentFilter === 'failed' && !isFailed) return false;
    }

    return true;
  });

  return (
    <div className="space-y-8 relative">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-display font-bold">Client Bookings</h1>
        <p className="text-gray-500 mt-1">Review event hire proposals, confirm booking requests, and track planned timelines</p>
      </div>

      {/* Modern Premium Double Filter UI */}
      <div className="flex flex-wrap items-center gap-6 bg-white/60 p-4 rounded-3xl border border-gray-100/80 backdrop-blur-md">
        {/* Booking Request Status Filter */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Booking Status</span>
          <div className="flex bg-gray-100 p-0.5 rounded-xl border border-gray-200/40 shrink-0">
            {['all', 'pending', 'accepted', 'rejected'].map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setFilterStatus(status)}
                className={`px-3.5 py-1.5 rounded-lg font-bold text-[11px] capitalize transition-all duration-200 ${
                  filterStatus === status
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Payment Status Filter */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Payment Status</span>
          <div className="flex bg-gray-100 p-0.5 rounded-xl border border-gray-200/40 shrink-0">
            {['all', 'payment pending', 'paid', 'failed'].map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setPaymentFilter(status)}
                className={`px-3.5 py-1.5 rounded-lg font-bold text-[11px] capitalize transition-all duration-200 ${
                  paymentFilter === status
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {status === 'all' ? 'all' : status === 'payment pending' ? 'pending' : status}
              </button>
            ))}
          </div>
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

                      {/* Payment Status Tag */}
                      {booking.status === 'accepted' && (
                        <div className="flex items-center lg:justify-end space-x-1.5">
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Payment:</span>
                          {(() => {
                            const isPaid = booking.payments?.some(p => p.status === 'paid');
                            const isFailed = booking.payments?.some(p => p.status === 'failed') && !isPaid;
                            
                            if (isPaid) {
                              return (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center">
                                  Paid
                                </span>
                              );
                            } else if (isFailed) {
                              return (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-600 border border-rose-100 flex items-center">
                                  Failed
                                </span>
                              );
                            } else {
                              return (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-600 border border-amber-100 flex items-center">
                                  Payment Pending
                                </span>
                              );
                            }
                          })()}
                        </div>
                      )}
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

                    {/* Accepted Booking Actions (Request Payment) */}
                    {booking.status === 'accepted' && (
                      <div className="flex items-center lg:justify-end space-x-2 lg:mt-2">
                        {(() => {
                          const isPaid = booking.payments?.some(p => p.status === 'paid');
                          const hasPending = booking.payments?.some(p => p.status === 'pending');
                          
                          if (isPaid) {
                            return (
                              <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100 flex items-center">
                                <CheckCircle2 size={13} className="mr-1" />
                                Payment Completed
                              </span>
                            );
                          }
                          
                          if (hasPending) {
                            return (
                              <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-100 flex items-center">
                                <Clock size={13} className="mr-1" />
                                Request Pending
                              </span>
                            );
                          }
                          
                          return (
                            <button
                              type="button"
                              onClick={() => handleOpenRequestModal(booking)}
                              className="px-4 py-2 bg-primary text-white font-bold rounded-xl text-xs hover:bg-primary/90 transition-all flex items-center shadow-md shadow-primary/10 hover:shadow-lg"
                            >
                              <CreditCard size={13} className="mr-1.5" />
                              Request Payment
                            </button>
                          );
                        })()}
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

      {/* Premium Glassmorphic Payment Request Modal */}
      <AnimatePresence>
        {isRequestModalOpen && selectedBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseRequestModal}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white/95 backdrop-blur-md w-full max-w-md rounded-3xl p-6 shadow-2xl border border-gray-100 relative z-10 space-y-5"
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-primary/10 rounded-xl text-primary animate-pulse">
                    <CreditCard size={20} />
                  </div>
                  <h3 className="text-lg font-display font-bold text-gray-800">Send Payment Request</h3>
                </div>
                <button
                  onClick={handleCloseRequestModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-full hover:bg-gray-50"
                >
                  <XCircle size={20} />
                </button>
              </div>

              <div className="bg-gray-50/70 p-4 rounded-2xl border border-gray-100 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400 font-medium">Event:</span>
                  <span className="font-bold text-gray-800">{selectedBooking.event?.title || 'Private Event'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 font-medium">Service:</span>
                  <span className="font-bold text-primary">{selectedBooking.vendor_service?.business_name}</span>
                </div>
                <div className="flex justify-between border-t border-gray-100 pt-2">
                  <span className="text-gray-400 font-medium">Standard Service Charge:</span>
                  <span className="font-bold text-gray-800">₹{selectedBooking.vendor_service?.starting_price?.toLocaleString('en-IN') || '0'}</span>
                </div>
              </div>

              <form onSubmit={handleSendPaymentRequest} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-600 block">
                    Billing Amount (₹) <span className="text-gray-400 font-normal">(Leave blank to bill standard charge)</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={billingAmount}
                    onChange={(e) => setBillingAmount(e.target.value)}
                    placeholder={`e.g. ${selectedBooking.vendor_service?.starting_price || '1000'}`}
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm font-semibold transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-600 block">Message / Note for Planner</label>
                  <textarea
                    rows="3"
                    value={requestMessage}
                    onChange={(e) => setRequestMessage(e.target.value)}
                    placeholder="e.g. Please process payment for the upcoming wedding decorations setup."
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-xs leading-relaxed transition-all"
                  />
                </div>

                <div className="flex space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={handleCloseRequestModal}
                    className="flex-1 py-3 bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold rounded-2xl text-xs transition-colors border border-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingRequest}
                    className="flex-1 py-3 bg-primary hover:bg-primary/90 text-white font-bold rounded-2xl text-xs transition-all flex items-center justify-center space-x-1.5 disabled:opacity-50 shadow-lg shadow-primary/20"
                  >
                    {submittingRequest ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Sending Request...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Send Request</span>
                      </>
                    )}
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

export default VendorBookingsPage;
