import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, Search, MessageSquare, Clock, ArrowLeft, ChevronDown,
  Loader2, User, Sparkles, Lock, CreditCard, CheckCircle2, XCircle, AlertCircle, FileText
} from 'lucide-react';
import api from '../services/api';
import useAuthStore from '../store/useAuthStore';
import Toastify from 'toastify-js';
import "toastify-js/src/toastify.css";

const ChatPage = () => {
  const { user: currentUser } = useAuthStore();
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  
  // Loading states
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);

  const isSuspendedPlanner = currentUser?.role === 'planner' && !currentUser?.is_active;
  
  // Payment states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [selectedBookingId, setSelectedBookingId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [submittingPaymentRequest, setSubmittingPaymentRequest] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [bookingDropdownOpen, setBookingDropdownOpen] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef(null);
  const pollingIntervalRef = useRef(null);
  const contactPollingRef = useRef(null);

  // Fetch all chat contacts
  const fetchContacts = async (showLoader = false) => {
    if (showLoader) setLoadingContacts(true);
    try {
      const response = await api.get('/chat/contacts');
      setContacts(response.data);
    } catch (error) {
      console.error('Failed to load chat contacts', error);
    } finally {
      if (showLoader) setLoadingContacts(false);
    }
  };

  // Fetch message history for selected contact
  const fetchMessages = async (contactId, showLoader = false) => {
    if (showLoader) setLoadingMessages(true);
    try {
      const response = await api.get(`/chat/messages/${contactId}`);
      setMessages(response.data);
    } catch (error) {
      console.error('Failed to load messages', error);
    } finally {
      if (showLoader) setLoadingMessages(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchContacts(true);

    // Poll contacts periodically to update unread counts
    contactPollingRef.current = setInterval(() => {
      fetchContacts(false);
    }, 6000);

    return () => {
      if (contactPollingRef.current) clearInterval(contactPollingRef.current);
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    };
  }, []);

  // Poll messages when contact is selected
  useEffect(() => {
    if (isSuspendedPlanner && selectedContact && selectedContact.role !== 'admin') {
      setSelectedContact(null);
      return;
    }

    if (!selectedContact) {
      setMessages([]);
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }

    fetchMessages(selectedContact.id, true);

    // Establish polling for the active chat thread
    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    pollingIntervalRef.current = setInterval(() => {
      fetchMessages(selectedContact.id, false);
    }, 3000);

    // Refresh contact unread counts locally
    fetchContacts(false);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [selectedContact]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fetch bookings when modal is opened
  useEffect(() => {
    if (showPaymentModal && currentUser?.role === 'vendor') {
      const fetchBookings = async () => {
        try {
          const res = await api.get('/vendor/bookings');
          // Filter bookings that match the currently selected contact (who is the planner) and are not paid yet
          const filtered = res.data.filter(b => 
            b.event?.user_id === selectedContact?.id && 
            !b.payments?.some(p => p.status === 'paid')
          );
          setBookings(filtered);
          if (filtered.length > 0) {
            setSelectedBookingId(filtered[0].id);
            setPaymentAmount('');
          }
        } catch (error) {
          console.error("Failed to fetch bookings", error);
          Toastify({
            text: "Failed to fetch bookings list.",
            style: { background: "linear-gradient(135deg, #ef4444, #dc2626)" }
          }).showToast();
        }
      };
      fetchBookings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPaymentModal]);

  // Handle vendor submitting payment request
  const handleRequestPaymentSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBookingId || submittingPaymentRequest) return;

    setSubmittingPaymentRequest(true);
    try {
      const res = await api.post('/payments/request', {
        service_booking_id: selectedBookingId,
        amount: paymentAmount ? parseFloat(paymentAmount) : null,
        message: paymentNote
      });

      Toastify({
        text: "🎉 Payment request sent successfully!",
        duration: 5000,
        style: { 
          background: "linear-gradient(135deg, #10b981, #059669)",
          borderRadius: "16px",
          fontWeight: "bold"
        }
      }).showToast();

      // Append new message of type payment_request
      if (res.data.chat_message) {
        // Ensure payment loaded in the response object
        const newMsg = {
          ...res.data.chat_message,
          payment: res.data.payment
        };
        setMessages(prev => [...prev, newMsg]);
      }

      setShowPaymentModal(false);
      setPaymentNote('');
    } catch (error) {
      console.error("Failed to submit payment request", error);
      Toastify({
        text: error.response?.data?.message || "Failed to submit payment request.",
        duration: 4000,
        style: { background: "linear-gradient(135deg, #ef4444, #dc2626)" }
      }).showToast();
    } finally {
      setSubmittingPaymentRequest(false);
    }
  };

  // Handle planner inline payment with Razorpay
  const handlePayInvoice = async (payment) => {
    setProcessingId(payment.id);
    try {
      // 1. Create Razorpay order on backend
      const orderResponse = await api.post('/payments/create-order', {
        payment_id: payment.id
      });

      const { order_id, amount, currency, key_id } = orderResponse.data;

      // 2. Configure Razorpay checkout options
      const options = {
        key: key_id,
        amount: amount,
        currency: currency,
        name: "Aura Events Platform",
        description: `Payment for service booking #${payment.service_booking_id}`,
        order_id: order_id,
        retry: {
          enabled: false
        },
        handler: async function (response) {
          setProcessingId(payment.id);
          try {
            // 3. Verify Razorpay signature on backend
            await api.post('/payments/verify', {
              payment_id: payment.id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature
            });

            Toastify({
              text: "🎉 Payment processed and completed successfully!",
              duration: 5000,
              style: { 
                background: "linear-gradient(135deg, #10b981, #059669)",
                borderRadius: "16px",
                fontWeight: "bold"
              }
            }).showToast();

            // Dynamically update the payment status of the message in the state
            setMessages(prev => prev.map(m => {
              if (m.payment_id === payment.id) {
                return {
                  ...m,
                  payment: {
                    ...m.payment,
                    status: 'paid',
                    razorpay_payment_id: response.razorpay_payment_id
                  }
                };
              }
              return m;
            }));

            // Also reload messages list just to ensure integrity
            fetchMessages(selectedContact.id, false);
          } catch (verificationError) {
            console.error('Signature verification failed', verificationError);
            Toastify({
              text: "Payment verification failed. Please contact admin.",
              duration: 5000,
              style: { background: "linear-gradient(135deg, #ef4444, #dc2626)" }
            }).showToast();
          } finally {
            setProcessingId(null);
          }
        },
        prefill: {
          name: currentUser.name,
          email: currentUser.email,
        },
        theme: {
          color: "#EC4899", // Premium pink / primary theme accent
        },
        modal: {
          ondismiss: function () {
            setProcessingId(null);
            Toastify({
              text: "Transaction cancelled.",
              duration: 3000,
              style: { background: "linear-gradient(135deg, #6b7280, #4b5563)" }
            }).showToast();
          }
        }
      };

      // 3. Open Razorpay Popup
      const rzp = new window.Razorpay(options);
      
      rzp.on('payment.failed', async function (response) {
        console.error('Payment failure event:', response.error);
        try {
          await api.post('/payments/fail', {
            payment_id: payment.id,
            error_message: response.error?.description || 'Payment failed during checkout.'
          });

          setMessages(prev => prev.map(m => {
            if (m.payment_id === payment.id) {
              return {
                ...m,
                payment: {
                  ...m.payment,
                  status: 'failed'
                }
              };
            }
            return m;
          }));

          Toastify({
            text: `❌ Payment failed: ${response.error?.description || 'Transaction declined.'}`,
            duration: 5000,
            style: { background: "linear-gradient(135deg, #ef4444, #dc2626)" }
          }).showToast();

          fetchMessages(selectedContact.id, false);
        } catch (failError) {
          console.error('Failed to notify backend of payment failure', failError);
        } finally {
          setProcessingId(null);
        }
      });

      rzp.open();

    } catch (err) {
      console.error('Failed to initiate checkout', err);
      Toastify({
        text: err.response?.data?.message || "Failed to contact payment gateway.",
        duration: 4000,
        style: { background: "linear-gradient(135deg, #ef4444, #dc2626)" }
      }).showToast();
      setProcessingId(null);
    }
  };

  // Securely download invoice PDF stream from back-end
  const handleDownloadInvoice = async (paymentId) => {
    try {
      const response = await api.get(`/payments/${paymentId}/invoice`, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `INV-${String(paymentId).padStart(6, '0')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);

      Toastify({
        text: "📄 Invoice PDF downloaded successfully!",
        duration: 3500,
        style: { 
          background: "linear-gradient(135deg, #10b981, #059669)",
          borderRadius: "16px",
          fontWeight: "bold"
        }
      }).showToast();
    } catch (err) {
      console.error('Failed to download invoice', err);
      Toastify({
        text: "Could not retrieve invoice PDF. Please try again later.",
        duration: 4000,
        style: { background: "linear-gradient(135deg, #ef4444, #dc2626)" }
      }).showToast();
    }
  };

  // Handle message sending
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedContact || sending) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    setSending(true);

    // Optimistically insert message in local UI state
    const optimisticMessage = {
      id: Date.now(),
      sender_id: currentUser.id,
      receiver_id: selectedContact.id,
      message: messageText,
      is_read: false,
      created_at: new Date().toISOString(),
      optimistic: true
    };
    setMessages(prev => [...prev, optimisticMessage]);

    try {
      const response = await api.post('/chat/messages', {
        receiver_id: selectedContact.id,
        message: messageText
      });
      
      // Replace optimistic message with actual DB record
      setMessages(prev => 
        prev.map(msg => msg.optimistic && msg.message === messageText ? response.data : msg)
      );
      
      // Update contacts list to reflect latest changes
      fetchContacts(false);
    } catch (error) {
      console.error('Failed to send message', error);
      // Remove optimistic message on failure
      setMessages(prev => prev.filter(msg => !msg.optimistic));
      alert('Failed to deliver message. Please retry.');
    } finally {
      setSending(false);
    }
  };

  const filteredContacts = contacts.filter(contact => 
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (contact.vendor?.business_name && contact.vendor.business_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="chat-container-layout">
      {/* LEFT COLUMN: CONTACTS LIST */}
      <div className={"chat-sidebar-layout border-r border-gray-100 flex flex-col " + (selectedContact ? 'hidden md:flex' : 'flex')}>
        {/* Search header */}
        <div className="p-4 border-b border-gray-50 bg-white/40">
          <div className="relative">
            <Search className="absolute left-3.5 top-3 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search chat thread..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-50/80 pl-10 pr-4 py-2.5 rounded-2xl border-none focus:ring-2 focus:ring-primary/20 text-xs transition-all placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* Contacts feed */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 custom-scrollbar">
          {loadingContacts ? (
            <div className="flex flex-col items-center justify-center h-48 space-y-2 text-gray-400 text-xs">
              <Loader2 className="animate-spin text-primary" size={20} />
              <span>Aligning communication channels...</span>
            </div>
          ) : filteredContacts.length > 0 ? (
            filteredContacts.map(contact => {
              const isSelected = selectedContact?.id === contact.id;
              const hasUnread = contact.unread_count > 0;
              const initials = contact.name.slice(0, 2).toUpperCase();
              
              return (
                <button
                  key={contact.id}
                  onClick={() => {
                    if (isSuspendedPlanner && contact.role !== 'admin') {
                      Toastify({
                        text: "Your account is currently suspended. You can only chat with the administrator.",
                        duration: 4000,
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
                    setSelectedContact(contact);
                  }}
                  className={`w-full p-3 rounded-2xl flex items-center space-x-3 text-left transition-all duration-300 relative
                    ${isSuspendedPlanner && contact.role !== 'admin' ? 'opacity-60 cursor-not-allowed bg-transparent' : ''}
                    ${isSelected 
                      ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-[0.98]' 
                      : 'hover:bg-gray-50/80 text-gray-700 bg-transparent'}`}
                >
                  {/* Dynamic Avatar */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shrink-0
                    ${isSelected ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary'}`}>
                    {initials}
                  </div>

                  <div className="flex-grow min-w-0 pr-2">
                    <p className={`text-xs font-bold truncate leading-tight ${isSelected ? 'text-white' : 'text-gray-800'} flex items-center`}>
                      <span className="truncate">{contact.vendor?.business_name || contact.name}</span>
                      {isSuspendedPlanner && contact.role !== 'admin' && (
                        <Lock size={12} className="ml-1.5 text-gray-400 shrink-0" />
                      )}
                    </p>
                    <p className={`text-[10px] truncate mt-0.5 ${isSelected ? 'text-white/70' : 'text-gray-400'} flex items-center`}>
                      <span>
                        {contact.role === 'admin' ? 'Administrator' : contact.role === 'vendor' ? 'Service Vendor' : 'Event Planner'}
                      </span>
                      {contact.role === 'vendor' && !contact.is_active && (
                        <span className={`ml-1.5 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${isSelected ? 'bg-white/20 text-white' : 'bg-red-100 text-red-600'}`}>
                          Suspended
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Badges / Indicators */}
                  {hasUnread && !isSelected && (
                    <span className="bg-red-500 text-white font-extrabold text-[9px] w-4.5 h-4.5 rounded-full flex items-center justify-center shadow-sm shrink-0 animate-pulse">
                      {contact.unread_count}
                    </span>
                  )}
                </button>
              );
            })
          ) : (
            <div className="py-20 text-center text-gray-400 text-xs">
              <MessageSquare size={32} className="mx-auto text-gray-200 mb-2" />
              <span>No conversations found</span>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: ACTIVE CHAT SCREEN */}
      <div className={"flex-1 min-w-0 flex flex-col bg-gray-50/30 " + (!selectedContact ? 'hidden md:flex items-center justify-center' : 'flex')}>
        {selectedContact ? (
          <>
            {/* Header info */}
            <div className="h-16 border-b border-gray-100 bg-white/80 backdrop-blur-md px-6 flex items-center justify-between shrink-0 z-10">
              <div className="flex items-center space-x-3">
                <button 
                  onClick={() => setSelectedContact(null)}
                  className="md:hidden p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-full"
                >
                  <ArrowLeft size={18} />
                </button>
                
                <div>
                  <h4 className="text-sm font-bold text-gray-800 leading-tight flex items-center">
                    <span>{selectedContact.vendor?.business_name || selectedContact.name}</span>
                    {selectedContact.role === 'vendor' && !selectedContact.is_active && (
                      <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-600 rounded text-[9px] font-bold uppercase tracking-wider">
                        Suspended
                      </span>
                    )}
                  </h4>
                  <p className="text-[10px] text-gray-400 capitalize mt-0.5">
                    {selectedContact.role === 'admin' ? 'Administrator' : selectedContact.role} • {selectedContact.email}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                {currentUser?.role === 'vendor' && selectedContact?.role === 'planner' && (
                  <button
                    onClick={() => setShowPaymentModal(true)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-primary text-white rounded-xl hover:bg-primary/95 text-[10px] font-bold shadow-md shadow-primary/10 transition-all hover:scale-[1.02] cursor-pointer"
                  >
                    <CreditCard size={12} />
                    <span>Request Payment</span>
                  </button>
                )}

                <div className="text-[10px] bg-green-50 text-green-600 px-2.5 py-1 rounded-full font-bold border border-green-100 flex items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1 animate-ping"></span>
                  Active Thread
                </div>
              </div>
            </div>

            {/* Message Feed */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {loadingMessages ? (
                <div className="flex flex-col items-center justify-center h-full space-y-2 text-gray-400 text-xs">
                  <Loader2 className="animate-spin text-primary" size={24} />
                  <span>Loading history...</span>
                </div>
              ) : messages.length > 0 ? (
                <AnimatePresence initial={false}>
                  {messages.map((msg, index) => {
                    const isSelf = msg.sender_id === currentUser.id;
                    const dateObj = new Date(msg.created_at);
                    const timeString = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const isPaymentRequest = msg.type === 'payment_request' && msg.payment;
                    const isInvoice = msg.type === 'invoice' && msg.payment;
                    
                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        className={`flex ${isSelf ? 'justify-end' : 'justify-start'} w-full mb-2`}
                      >
                        <div className="max-w-[85%] sm:max-w-[70%] space-y-1">
                          {isPaymentRequest ? (
                            <div className={`p-5 rounded-3xl border text-xs leading-relaxed shadow-lg backdrop-blur-md relative overflow-hidden transition-all duration-300 w-72 sm:w-80
                              ${isSelf 
                                ? 'bg-gradient-to-br from-primary/95 via-pink-600/95 to-rose-600/95 text-white border-primary/20 rounded-tr-none shadow-primary/10' 
                                : 'bg-gradient-to-br from-white/95 to-gray-50/95 text-gray-800 border-gray-100 rounded-tl-none'}`}
                            >
                              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>
                              
                              <div className="flex items-center justify-between border-b pb-3 mb-3 border-gray-100/10">
                                <div className="flex items-center space-x-2">
                                  <div className={`p-2 rounded-xl ${isSelf ? 'bg-white/10 text-white' : 'bg-primary/10 text-primary'}`}>
                                    <CreditCard size={16} />
                                  </div>
                                  <div>
                                    <h5 className={`font-bold tracking-wide uppercase text-[10px] ${isSelf ? 'text-white/80' : 'text-gray-500'}`}>
                                      Payment Request
                                    </h5>
                                    <p className={`text-[9px] ${isSelf ? 'text-white/60' : 'text-gray-400'}`}>
                                      INV-#{msg.payment.id}
                                    </p>
                                  </div>
                                </div>
                                
                                <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[9px] font-bold border capitalize shadow-sm
                                  ${msg.payment.status === 'paid' 
                                    ? (isSelf ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30' : 'bg-emerald-50 text-emerald-700 border-emerald-100')
                                    : msg.payment.status === 'failed'
                                      ? (isSelf ? 'bg-rose-500/20 text-rose-200 border-rose-400/30' : 'bg-rose-50 text-rose-700 border-rose-100')
                                      : (isSelf ? 'bg-amber-500/20 text-amber-200 border-amber-400/30 animate-pulse' : 'bg-amber-50 text-amber-700 border-amber-100 animate-pulse')
                                  }`}
                                >
                                  {msg.payment.status === 'paid' ? (
                                    <CheckCircle2 size={10} className="shrink-0" />
                                  ) : msg.payment.status === 'failed' ? (
                                    <XCircle size={10} className="shrink-0" />
                                  ) : (
                                    <Clock size={10} className="shrink-0 animate-pulse" />
                                  )}
                                  <span>{msg.payment.status}</span>
                                </span>
                              </div>

                              <div className="space-y-3">
                                <div>
                                  <span className={`text-[9px] block ${isSelf ? 'text-white/70' : 'text-gray-400'}`}>Requested Amount</span>
                                  <h3 className="text-xl font-bold font-display mt-0.5 flex items-baseline">
                                    <span className="text-xs mr-0.5 font-sans">₹</span>
                                    <span>{parseFloat(msg.payment.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                  </h3>
                                </div>

                                <div className={`flex flex-col space-y-1.5 p-3 rounded-2xl border ${
                                  isSelf ? 'bg-white/5 border-white/10' : 'bg-gray-50/50 border-gray-100'
                                }`}>
                                  <div>
                                    <span className={`text-[8px] font-bold uppercase tracking-wider ${isSelf ? 'text-white/60' : 'text-gray-400'}`}>Event Context</span>
                                    <p className={`font-bold text-[11px] truncate ${isSelf ? 'text-white' : 'text-gray-700'}`}>
                                      {msg.payment.event?.title || 'Unknown Event'}
                                    </p>
                                  </div>
                                  <div className="border-t border-dashed border-gray-100/10 pt-1">
                                    <span className={`text-[8px] font-bold uppercase tracking-wider ${isSelf ? 'text-white/60' : 'text-gray-400'}`}>Service Billed</span>
                                    <p className={`font-bold text-[11px] truncate ${isSelf ? 'text-white' : 'text-gray-700'}`}>
                                      {msg.payment.service_booking?.vendor_service?.business_name || 'Vendor Service'}
                                    </p>
                                  </div>
                                </div>

                                {msg.payment.message && (
                                  <div className={`p-3 rounded-2xl text-[11px] leading-normal italic
                                    ${isSelf ? 'bg-white/10 text-white/90' : 'bg-gray-50/80 text-gray-600 border border-gray-100'}`}
                                  >
                                    "{msg.payment.message}"
                                  </div>
                                )}
                                
                                {!isSelf && currentUser?.role === 'planner' && msg.payment.status === 'pending' && (
                                  <button
                                    onClick={() => handlePayInvoice(msg.payment)}
                                    disabled={processingId !== null}
                                    className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-bold rounded-2xl text-xs transition-all shadow-md shadow-pink-500/20 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                                  >
                                    {processingId === msg.payment.id ? (
                                      <Loader2 className="animate-spin" size={14} />
                                    ) : (
                                      <CreditCard size={14} />
                                    )}
                                    <span>Pay Invoice Inline</span>
                                  </button>
                                )}
                                
                                {msg.payment.status === 'paid' && msg.payment.razorpay_payment_id && (
                                  <div className={`text-[9px] font-mono mt-1 ${isSelf ? 'text-white/60' : 'text-gray-400'}`}>
                                    Transaction ID: {msg.payment.razorpay_payment_id}
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : isInvoice ? (
                            <div className={`p-5 rounded-3xl border text-xs leading-relaxed shadow-lg backdrop-blur-md relative overflow-hidden transition-all duration-300 w-72 sm:w-80
                              ${isSelf 
                                ? 'bg-gradient-to-br from-primary/95 via-pink-600/95 to-rose-600/95 text-white border-primary/20 rounded-tr-none shadow-primary/10' 
                                : 'bg-gradient-to-br from-white/95 to-gray-50/95 text-gray-800 border-gray-100 rounded-tl-none'}`}
                            >
                              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>
                              
                              <div className="flex items-center justify-between border-b pb-3 mb-3 border-gray-100/10">
                                <div className="flex items-center space-x-2">
                                  <div className={`p-2 rounded-xl ${isSelf ? 'bg-white/10 text-white' : 'bg-primary/10 text-primary'}`}>
                                    <FileText size={16} />
                                  </div>
                                  <div>
                                    <h5 className={`font-bold tracking-wide uppercase text-[10px] ${isSelf ? 'text-white/80' : 'text-gray-500'}`}>
                                      Invoice Receipt
                                    </h5>
                                    <p className={`text-[9px] ${isSelf ? 'text-white/60' : 'text-gray-400'}`}>
                                      INV-#{msg.payment.id}
                                    </p>
                                  </div>
                                </div>
                                
                                <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[9px] font-bold border capitalize shadow-sm
                                  ${isSelf ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}
                                >
                                  <CheckCircle2 size={10} className="shrink-0" />
                                  <span>Paid</span>
                                </span>
                              </div>

                              <div className="space-y-3">
                                <div className={`flex flex-col space-y-1.5 p-3 rounded-2xl border ${
                                  isSelf ? 'bg-white/5 border-white/10' : 'bg-gray-50/50 border-gray-100'
                                }`}>
                                  <div>
                                    <span className={`text-[8px] font-bold uppercase tracking-wider ${isSelf ? 'text-white/60' : 'text-gray-400'}`}>Event Context</span>
                                    <p className={`font-bold text-[11px] truncate ${isSelf ? 'text-white' : 'text-gray-700'}`}>
                                      {msg.payment.event?.title || 'Unknown Event'}
                                    </p>
                                  </div>
                                  <div className="border-t border-dashed border-gray-100/10 pt-1">
                                    <span className={`text-[8px] font-bold uppercase tracking-wider ${isSelf ? 'text-white/60' : 'text-gray-400'}`}>Service Billed</span>
                                    <p className={`font-bold text-[11px] truncate ${isSelf ? 'text-white' : 'text-gray-700'}`}>
                                      {msg.payment.service_booking?.vendor_service?.business_name || 'Vendor Service'}
                                    </p>
                                  </div>
                                </div>

                                <div>
                                  <span className={`text-[9px] block ${isSelf ? 'text-white/70' : 'text-gray-400'}`}>Amount Billed</span>
                                  <h3 className="text-xl font-bold font-display mt-0.5 flex items-baseline">
                                    <span className="text-xs mr-0.5 font-sans">₹</span>
                                    <span>{parseFloat(msg.payment.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                  </h3>
                                </div>
                                
                                <button
                                  type="button"
                                  onClick={() => handleDownloadInvoice(msg.payment.id)}
                                  className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold rounded-2xl text-xs transition-all shadow-md shadow-emerald-500/20 active:scale-[0.98] cursor-pointer"
                                >
                                  <FileText size={14} />
                                  <span>Download Invoice PDF</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className={`p-4 rounded-3xl text-xs leading-relaxed shadow-sm
                              ${isSelf 
                                ? 'bg-primary text-white rounded-tr-none' 
                                : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'}`}
                            >
                              <p className="whitespace-pre-wrap">{msg.message}</p>
                            </div>
                          )}
                          
                          <span className={`text-[9px] text-gray-300 flex items-center space-x-1 px-1
                            ${isSelf ? 'justify-end' : 'justify-start'}`}
                          >
                            <Clock size={8} className="mr-0.5" />
                            <span>{timeString}</span>
                            {msg.optimistic && <span className="italic text-gray-300">• sending</span>}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-2">
                  <Sparkles size={36} className="text-gray-200" />
                  <p className="text-xs font-medium">No messages in this chat thread.</p>
                  <p className="text-[10px] text-gray-400">Send a message to initiate communication!</p>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Composer */}
            <form 
              onSubmit={handleSendMessage}
              className="p-4 border-t border-gray-100 bg-white/80 backdrop-blur-md flex items-center space-x-3 shrink-0"
            >
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your premium response..."
                disabled={sending}
                className="flex-grow bg-gray-50/80 border-none rounded-2xl py-3 px-5 text-xs focus:ring-2 focus:ring-primary/20 placeholder:text-gray-400 text-gray-800"
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || sending}
                className="p-3.5 bg-primary text-white rounded-2xl hover:bg-primary/95 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-primary/20"
              >
                {sending ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <Send size={16} />
                )}
              </button>
            </form>
          </>
        ) : (
          <div className="text-center p-8 space-y-4 max-w-sm">
            <div className="w-16 h-16 bg-primary/5 text-primary rounded-3xl flex items-center justify-center mx-auto shadow-inner">
              <MessageSquare size={32} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-700">Select a Thread</h3>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                Choose a contact from the active feed to open real-time correspondence. Planners can query services, and vendors can negotiate details.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* VENDOR PAYMENT REQUEST MODAL */}
      <AnimatePresence>
        {showPaymentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3 }}
              className="bg-white border border-gray-100 rounded-3xl p-6 shadow-2xl max-w-md w-full relative overflow-hidden"
            >
              {/* Background accent ambient light */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none"></div>

              <div className="flex justify-between items-center border-b pb-4 mb-4 border-gray-50">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-primary/10 text-primary rounded-xl">
                    <CreditCard size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-800">Send Payment Request</h3>
                    <p className="text-[10px] text-gray-400">Request funds from {selectedContact?.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full cursor-pointer"
                >
                  <XCircle size={18} />
                </button>
              </div>

              {bookings.length === 0 ? (
                <div className="py-8 text-center text-gray-400 space-y-3">
                  <AlertCircle size={28} className="mx-auto text-gray-200" />
                  <p className="text-xs font-semibold text-gray-600">No active bookings</p>
                  <p className="text-[10px] text-gray-400 leading-relaxed px-4">
                    You do not have any active service bookings with this planner. Bookings must be active to initiate billing.
                  </p>
                  <button
                    onClick={() => setShowPaymentModal(false)}
                    className="mt-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-2xl text-[10px] transition-all cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <form onSubmit={handleRequestPaymentSubmit} className="space-y-4">
                  {/* Select Booking */}
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block">
                      Select Linked Service Booking
                    </label>
                    <div className="relative">
                      {/* Dropdown Button */}
                      <button
                        type="button"
                        onClick={() => setBookingDropdownOpen(!bookingDropdownOpen)}
                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-2.5 px-4 text-xs font-semibold text-gray-800 flex items-center justify-between shadow-sm hover:border-primary/20 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer text-left"
                      >
                        {(() => {
                          const selected = bookings.find(b => b.id.toString() === selectedBookingId.toString());
                          if (selected) {
                            return (
                              <div className="flex flex-col items-start text-left space-y-0.5">
                                <span className="font-bold text-gray-800 text-[11px] uppercase tracking-wider">
                                  {selected.vendor_service?.business_name || 'Service'}
                                </span>
                                <span className="text-[10px] text-gray-500 font-medium">
                                  Event: {selected.event?.title || 'Event'} • ₹{parseFloat(selected.vendor_service?.starting_price || 0).toLocaleString('en-IN')}
                                </span>
                              </div>
                            );
                          }
                          return <span className="text-gray-400">Select a Linked Service Booking</span>;
                        })()}
                        <ChevronDown size={16} className={`text-gray-400 transition-transform duration-300 ${bookingDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {/* Dropdown Panel */}
                      {bookingDropdownOpen && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setBookingDropdownOpen(false)} />
                          <div className="absolute left-0 right-0 mt-2 bg-white/95 backdrop-blur-md border border-gray-100 rounded-2xl shadow-xl z-50 overflow-hidden max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="p-2 space-y-1">
                              {bookings.map(b => {
                                const isSelected = b.id.toString() === selectedBookingId.toString();
                                return (
                                  <button
                                    key={b.id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedBookingId(b.id);
                                      setPaymentAmount('');
                                      setBookingDropdownOpen(false);
                                    }}
                                    className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-all duration-200 cursor-pointer
                                      ${isSelected 
                                        ? 'bg-primary/5 border border-primary/20 text-primary font-bold' 
                                        : 'hover:bg-gray-50 text-gray-700 hover:text-gray-900 border border-transparent'}`}
                                  >
                                    <div className="flex flex-col space-y-0.5">
                                      <span className={`text-[11px] font-bold uppercase tracking-wider ${isSelected ? 'text-primary' : 'text-gray-800'}`}>
                                        {b.vendor_service?.business_name || 'Service'}
                                      </span>
                                      <span className="text-[10px] text-gray-500 font-medium">
                                        Event: {b.event?.title || 'Event'}
                                      </span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <span className={`text-xs font-bold ${isSelected ? 'text-primary' : 'text-gray-800'}`}>
                                        ₹{parseFloat(b.vendor_service?.starting_price || 0).toLocaleString('en-IN')}
                                      </span>
                                      {isSelected && <CheckCircle2 size={12} className="text-primary shrink-0" />}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Amount Input */}
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block">
                      Billing Amount (₹) <span className="text-[9px] font-normal text-gray-400 uppercase tracking-normal">(Optional)</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-2.5 text-xs text-gray-400 font-bold">₹</span>
                      <input
                        type="number"
                        min="1"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        placeholder={(() => {
                          const selected = bookings.find(b => b.id.toString() === selectedBookingId.toString());
                          return selected ? `Starting Price: ₹${parseFloat(selected.vendor_service?.starting_price || 0).toLocaleString('en-IN')}` : 'Enter amount';
                        })()}
                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-2.5 pl-8 pr-4 text-xs focus:ring-2 focus:ring-primary/20 text-gray-800 font-bold"
                      />
                    </div>
                    <span className="text-[9px] text-gray-400 block px-1">
                      * Leave blank to request the standard service charge of ₹{parseFloat(bookings.find(b => b.id.toString() === selectedBookingId.toString())?.vendor_service?.starting_price || 0).toLocaleString('en-IN')}
                    </span>
                  </div>

                  {/* Note / Message */}
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block">
                      Payment Note / Message
                    </label>
                    <textarea
                      value={paymentNote}
                      onChange={(e) => setPaymentNote(e.target.value)}
                      placeholder="e.g. 50% advance booking deposit, final payment..."
                      rows={3}
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-2.5 px-4 text-xs focus:ring-2 focus:ring-primary/20 text-gray-800"
                    />
                  </div>

                  {/* Submit buttons */}
                  <div className="flex space-x-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowPaymentModal(false)}
                      className="flex-1 py-2.5 px-4 border border-gray-100 hover:bg-gray-50 text-gray-600 font-bold rounded-2xl text-xs transition-all text-center cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingPaymentRequest}
                      className="flex-1 py-2.5 px-4 bg-primary hover:bg-primary/95 text-white font-bold rounded-2xl text-xs transition-all shadow-md shadow-primary/20 flex items-center justify-center space-x-1.5 cursor-pointer"
                    >
                      {submittingPaymentRequest ? (
                        <Loader2 className="animate-spin" size={14} />
                      ) : (
                        <Send size={12} />
                      )}
                      <span>Request Funds</span>
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChatPage;
