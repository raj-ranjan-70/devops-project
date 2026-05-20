import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CreditCard, TrendingUp, Clock, CheckCircle2, XCircle, 
  Search, AlertCircle, Calendar, ArrowUpRight, Loader2,
  Wallet, RefreshCw, BarChart3, Receipt, FileText
} from 'lucide-react';
import api from '../services/api';
import useAuthStore from '../store/useAuthStore';
import Toastify from 'toastify-js';
import "toastify-js/src/toastify.css";

const PaymentsPage = () => {
  const { user } = useAuthStore();
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState({
    total_earnings: 0,
    pending_earnings: 0,
    completed_count: 0,
    pending_count: 0
  });
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [filter, setFilter] = useState('all'); // all, pending, paid, failed
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch payment records based on role
  const fetchPaymentData = async () => {
    setLoading(true);
    try {
      if (user?.role === 'planner') {
        const response = await api.get('/payments/planner-history');
        setPayments(response.data);
      } else if (user?.role === 'vendor') {
        const response = await api.get('/payments/vendor-history');
        setPayments(response.data.payments);
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('Failed to retrieve payment records', error);
      Toastify({
        text: "Could not align transaction database. Please refresh.",
        duration: 4000,
        style: { background: "linear-gradient(135deg, #ef4444, #dc2626)" }
      }).showToast();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchPaymentData();
    }
  }, [user?.id, user?.role]);

  // Handle planner inline payment with Razorpay
  const handleInitiatePayment = async (payment) => {
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
            const verifyResponse = await api.post('/payments/verify', {
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

            fetchPaymentData();
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
          name: user.name,
          email: user.email,
        },
        theme: {
          color: "#EC4899", // Premium pink / primary theme accent
        },
        modal: {
          ondismiss: function () {
            setProcessingId(null);
            Toastify({
              text: "Transaction cancelled by user.",
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

          Toastify({
            text: `❌ Payment failed: ${response.error?.description || 'Transaction declined.'}`,
            duration: 5000,
            style: { background: "linear-gradient(135deg, #ef4444, #dc2626)" }
          }).showToast();

          fetchPaymentData();
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

  // Download Invoice PDF via Auth API Blob
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

  // Filtering & searching
  const filteredPayments = payments.filter(p => {
    const matchesFilter = filter === 'all' || p.status === filter;
    
    const searchTarget = (
      (p.vendor?.vendor?.business_name || p.vendor?.name || '') + 
      (p.planner?.name || '') + 
      (p.event?.title || '') + 
      (p.service_booking?.vendor_service?.business_name || '') +
      (p.message || '') +
      (p.razorpay_payment_id || '')
    ).toLowerCase();
    
    const matchesSearch = searchTarget.includes(searchQuery.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  // Calculate analytical stats for planners locally
  const totalPaidPlanner = payments
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + parseFloat(p.amount), 0);
  
  const totalPendingPlanner = payments
    .filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + parseFloat(p.amount), 0);

  const getStatusStyle = (status) => {
    switch (status) {
      case 'paid':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'failed':
        return 'bg-rose-50 text-rose-700 border-rose-100';
      case 'pending':
      default:
        return 'bg-amber-50 text-amber-700 border-amber-100 animate-pulse';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'paid':
        return <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />;
      case 'failed':
        return <XCircle size={14} className="text-rose-500 shrink-0" />;
      case 'pending':
      default:
        return <Clock size={14} className="text-amber-500 shrink-0" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header section with refreshing animation */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-display font-bold text-gray-800 tracking-tight">Payments Portal</h1>
          <p className="text-xs text-gray-500 mt-1">
            {user?.role === 'planner' 
              ? 'Oversee contracts, pending invoices, and settle transaction balances securely via Razorpay.'
              : 'Monitor revenue summaries, process payouts, and track booking commission analytics.'}
          </p>
        </div>
        <button 
          onClick={fetchPaymentData}
          disabled={loading}
          className="flex items-center space-x-2 px-4 py-2.5 bg-white border border-gray-100 text-gray-600 hover:text-primary rounded-2xl shadow-sm text-xs hover:border-primary/10 transition-all active:scale-95 disabled:opacity-50 self-start"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          <span>Synchronize Ledger</span>
        </button>
      </div>

      {loading && payments.length === 0 ? (
        <div className="h-96 flex flex-col items-center justify-center space-y-3 text-gray-400 text-sm">
          <Loader2 className="animate-spin text-primary" size={32} />
          <span className="font-display font-medium">Reconciling financial ledgers...</span>
        </div>
      ) : (
        <>
          {/* STATS OVERVIEW CARDS */}
          {user?.role === 'vendor' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Card 1: Cumulative Earnings */}
              <div className="p-6 rounded-3xl bg-white border border-gray-100 shadow-sm relative overflow-hidden flex flex-col justify-between h-36">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Total Revenue</span>
                    <h3 className="text-2xl font-bold text-emerald-600 font-display">₹{stats.total_earnings.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
                  </div>
                  <div className="p-2.5 bg-emerald-50 text-emerald-500 rounded-2xl">
                    <TrendingUp size={18} />
                  </div>
                </div>
                <div className="flex items-center space-x-1.5 text-[10px] text-gray-400 mt-4 border-t border-gray-50 pt-3">
                  <span className="font-bold text-emerald-500">{stats.completed_count} invoices paid</span>
                  <span>successfully</span>
                </div>
              </div>

              {/* Card 2: Pending Invoices */}
              <div className="p-6 rounded-3xl bg-white border border-gray-100 shadow-sm relative overflow-hidden flex flex-col justify-between h-36">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Pending Receivables</span>
                    <h3 className="text-2xl font-bold text-amber-500 font-display">₹{stats.pending_earnings.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
                  </div>
                  <div className="p-2.5 bg-amber-50 text-amber-500 rounded-2xl">
                    <Clock size={18} />
                  </div>
                </div>
                <div className="flex items-center space-x-1.5 text-[10px] text-gray-400 mt-4 border-t border-gray-50 pt-3">
                  <span className="font-bold text-amber-500">{stats.pending_count} requests awaiting</span>
                  <span>planner action</span>
                </div>
              </div>

              {/* Card 3: Commission Efficiency */}
              <div className="p-6 rounded-3xl bg-white border border-gray-100 shadow-sm relative overflow-hidden flex flex-col justify-between h-36">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Commission Rate</span>
                    <h3 className="text-2xl font-bold text-primary font-display">0.00%</h3>
                  </div>
                  <div className="p-2.5 bg-primary/5 text-primary rounded-2xl">
                    <Wallet size={18} />
                  </div>
                </div>
                <div className="flex items-center space-x-1.5 text-[10px] text-gray-400 mt-4 border-t border-gray-50 pt-3">
                  <span className="font-bold text-primary">Aura Premium Discount</span>
                  <span>fully active</span>
                </div>
              </div>

              {/* Card 4: Total Requests */}
              <div className="p-6 rounded-3xl bg-white border border-gray-100 shadow-sm relative overflow-hidden flex flex-col justify-between h-36">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Total Requested</span>
                    <h3 className="text-2xl font-bold text-gray-700 font-display">{(stats.completed_count + stats.pending_count)} Requests</h3>
                  </div>
                  <div className="p-2.5 bg-gray-50 text-gray-500 rounded-2xl">
                    <Receipt size={18} />
                  </div>
                </div>
                <div className="flex items-center space-x-1.5 text-[10px] text-gray-400 mt-4 border-t border-gray-50 pt-3">
                  <span>Transactions generated inside chats</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Planner Card 1: Settled Payments */}
              <div className="p-6 rounded-3xl bg-white border border-gray-100 shadow-sm relative overflow-hidden flex flex-col justify-between h-36">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Settled Balances</span>
                    <h3 className="text-2xl font-bold text-emerald-600 font-display">₹{totalPaidPlanner.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
                  </div>
                  <div className="p-2.5 bg-emerald-50 text-emerald-500 rounded-2xl">
                    <CheckCircle2 size={18} />
                  </div>
                </div>
                <div className="flex items-center space-x-1.5 text-[10px] text-gray-400 mt-4 border-t border-gray-50 pt-3">
                  <span>Cumulative payments sent securely</span>
                </div>
              </div>

              {/* Planner Card 2: Outstanding Invoices */}
              <div className="p-6 rounded-3xl bg-white border border-gray-100 shadow-sm relative overflow-hidden flex flex-col justify-between h-36">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Outstanding Invoices</span>
                    <h3 className="text-2xl font-bold text-amber-500 font-display">₹{totalPendingPlanner.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
                  </div>
                  <div className="p-2.5 bg-amber-50 text-amber-500 rounded-2xl">
                    <Clock size={18} />
                  </div>
                </div>
                <div className="flex items-center space-x-1.5 text-[10px] text-gray-400 mt-4 border-t border-gray-50 pt-3">
                  <span>Balance awaiting your Razorpay verification</span>
                </div>
              </div>

              {/* Planner Card 3: Total Contracts */}
              <div className="p-6 rounded-3xl bg-white border border-gray-100 shadow-sm relative overflow-hidden flex flex-col justify-between h-36">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Services Billed</span>
                    <h3 className="text-2xl font-bold text-primary font-display">{payments.length} Bookings</h3>
                  </div>
                  <div className="p-2.5 bg-primary/5 text-primary rounded-2xl">
                    <BarChart3 size={18} />
                  </div>
                </div>
                <div className="flex items-center space-x-1.5 text-[10px] text-gray-400 mt-4 border-t border-gray-50 pt-3">
                  <span>Includes all active chat negotiations</span>
                </div>
              </div>
            </div>
          )}

          {/* TABLE CONTROLS: FILTER & SEARCH */}
          <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 md:space-x-4">
              {/* Filters */}
              <div className="flex flex-wrap gap-2">
                {['all', 'pending', 'paid', 'failed'].map((item) => (
                  <button
                    key={item}
                    onClick={() => setFilter(item)}
                    className={`px-4 py-2 rounded-full text-xs font-semibold capitalize transition-all duration-300 ${
                      filter === item 
                        ? 'bg-primary text-white shadow-md shadow-primary/10' 
                        : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>

              {/* Search query input */}
              <div className="relative max-w-sm w-full">
                <Search className="absolute left-3.5 top-3 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Search invoice details, message or IDs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-gray-50/50 pl-10 pr-4 py-2.5 rounded-2xl border-none focus:ring-2 focus:ring-primary/20 text-xs transition-all placeholder:text-gray-400"
                />
              </div>
            </div>

            {/* TRANSACTIONS FEED/TABLE */}
            <div className="overflow-x-auto rounded-2xl border border-gray-50">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 text-gray-400 font-bold border-b border-gray-100">
                    <th className="p-4">Transaction Details</th>
                    <th className="p-4">Event Context</th>
                    <th className="p-4">Requested Amount</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Settle Date</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence initial={false}>
                    {filteredPayments.length > 0 ? (
                      filteredPayments.map((p) => {
                        const dateFormatted = p.payment_date 
                          ? new Date(p.payment_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                          : '-';
                        const requestedDate = new Date(p.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                        
                        const isPlanner = user?.role === 'planner';
                        const businessName = isPlanner 
                          ? (p.vendor?.vendor?.business_name || p.vendor?.name) 
                          : (p.planner?.name || 'Client Planner');
                        
                        return (
                          <motion.tr 
                            key={p.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="border-b border-gray-100 hover:bg-gray-50/30 transition-all font-medium text-gray-700"
                          >
                            <td className="p-4 max-w-xs">
                              <div className="space-y-1">
                                <p className="font-bold text-gray-800 flex items-center">
                                  <span>{businessName}</span>
                                  <span className="ml-2 text-[9px] px-1.5 py-0.5 bg-gray-100 text-gray-400 rounded">
                                    {isPlanner ? 'Vendor' : 'Client'}
                                  </span>
                                </p>
                                {p.message && (
                                  <p className="text-[10px] text-gray-400 italic line-clamp-1">
                                    "{p.message}"
                                  </p>
                                )}
                                <p className="text-[9px] text-gray-300 tracking-wider">
                                  INV-#{p.id} • Booking #{p.service_booking_id}
                                </p>
                              </div>
                            </td>

                            <td className="p-4">
                              <div className="space-y-1">
                                <p className="font-bold text-gray-700 truncate max-w-[150px]">
                                  {p.event?.title || 'Unknown Event'}
                                </p>
                                <p className="text-[10px] text-gray-400 flex items-center">
                                  <Calendar size={10} className="mr-1 shrink-0" />
                                  <span>Requested: {requestedDate}</span>
                                </p>
                              </div>
                            </td>

                            <td className="p-4 font-display font-bold text-gray-800 text-sm">
                              ₹{parseFloat(p.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>

                            <td className="p-4">
                              <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${getStatusStyle(p.status)}`}>
                                {getStatusIcon(p.status)}
                                <span className="capitalize">{p.status === 'paid' && user?.role === 'vendor' ? 'payment received' : p.status}</span>
                              </span>
                            </td>

                            <td className="p-4 text-gray-400 font-mono text-[10px]">
                              {dateFormatted}
                            </td>

                            <td className="p-4 text-right">
                              {p.status === 'pending' && isPlanner ? (
                                <button
                                  onClick={() => handleInitiatePayment(p)}
                                  disabled={processingId !== null}
                                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-primary text-white rounded-xl hover:bg-primary/95 text-[10px] font-bold shadow-md shadow-primary/10 transition-all hover:scale-[1.02] disabled:opacity-50 shrink-0"
                                >
                                  {processingId === p.id ? (
                                    <Loader2 className="animate-spin" size={12} />
                                  ) : (
                                    <CreditCard size={12} />
                                  )}
                                  <span>Pay Now</span>
                                </button>
                              ) : p.status === 'paid' ? (
                                <div className="flex flex-col items-end space-y-1.5">
                                  {p.razorpay_payment_id && (
                                    <span className="text-[9px] text-emerald-600 font-mono tracking-tight bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100/50">
                                      ID: {p.razorpay_payment_id}
                                    </span>
                                  )}
                                  <button
                                    onClick={() => handleDownloadInvoice(p.id)}
                                    className="inline-flex items-center space-x-1 px-2 py-1 bg-gray-50 border border-gray-100 hover:border-primary/20 hover:bg-primary/5 text-gray-500 hover:text-primary rounded-lg text-[9px] font-bold transition-all"
                                  >
                                    <FileText size={10} />
                                    <span>Invoice PDF</span>
                                  </button>
                                </div>
                              ) : (
                                <span className="text-gray-300 text-[10px]">-</span>
                              )}
                            </td>
                          </motion.tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="6" className="p-12 text-center text-gray-400">
                          <AlertCircle size={28} className="mx-auto text-gray-200 mb-2" />
                          <p className="font-semibold text-xs">No matching transactions found</p>
                          <p className="text-[10px] text-gray-300 mt-0.5">Adjust filter options or search query keywords</p>
                        </td>
                      </tr>
                    )}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PaymentsPage;
