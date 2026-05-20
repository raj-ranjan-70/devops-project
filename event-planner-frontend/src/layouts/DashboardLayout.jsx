import { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  Truck, 
  Wallet, 
  Settings, 
  LogOut,
  Bell,
  MessageSquare,
  CreditCard,
  Loader2
} from 'lucide-react';
import useAuthStore from '../store/useAuthStore';
import api from '../services/api';
import Toastify from 'toastify-js';
import "toastify-js/src/toastify.css";

const DashboardLayout = () => {
  const { user, logout, fetchUser } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const [notifications, setNotifications] = useState([]);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const [payingNotificationId, setPayingNotificationId] = useState(null);

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/notifications');
      setNotifications(response.data);
    } catch (error) {
      console.error('Failed to fetch notifications', error);
    }
  };

  useEffect(() => {
    fetchUser();
    fetchNotifications();
    const interval = setInterval(() => {
      fetchUser();
      fetchNotifications();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchUser]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowNotificationsDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id, type) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      fetchNotifications();
      if (type === 'message') {
        setShowNotificationsDropdown(false);
        navigate('/chat');
      } else if (type === 'payment') {
        setShowNotificationsDropdown(false);
        navigate('/payments');
      }
    } catch (error) {
      console.error('Failed to mark notification as read', error);
    }
  };

  const handlePayDirectly = async (e, notif) => {
    e.stopPropagation(); // Stop click from bubbling to mark as read
    if (payingNotificationId) return;
    
    const paymentId = notif.payment_id;
    if (!paymentId) return;

    setPayingNotificationId(notif.id);
    try {
      // 1. Create Razorpay order on backend
      const orderResponse = await api.post('/payments/create-order', {
        payment_id: paymentId
      });

      const { order_id, amount, currency, key_id } = orderResponse.data;

      // 2. Configure Razorpay checkout options
      const options = {
        key: key_id,
        amount: amount,
        currency: currency,
        name: "Aura Events Platform",
        description: `Payment for service request`,
        order_id: order_id,
        retry: {
          enabled: false
        },
        handler: async function (response) {
          setPayingNotificationId(notif.id);
          try {
            // 3. Verify Razorpay signature on backend
            await api.post('/payments/verify', {
              payment_id: paymentId,
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

            // Mark notification as read
            await api.patch(`/notifications/${notif.id}/read`);
            fetchNotifications();
          } catch (verificationError) {
            console.error('Signature verification failed', verificationError);
            Toastify({
              text: "Payment verification failed. Please contact admin.",
              duration: 5000,
              style: { background: "linear-gradient(135deg, #ef4444, #dc2626)" }
            }).showToast();
          } finally {
            setPayingNotificationId(null);
          }
        },
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
        },
        theme: {
          color: "#EC4899", // Premium pink / primary theme accent
        },
        modal: {
          ondismiss: function () {
            setPayingNotificationId(null);
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
            payment_id: paymentId,
            error_message: response.error?.description || 'Payment failed during checkout.'
          });

          Toastify({
            text: `❌ Payment failed: ${response.error?.description || 'Transaction declined.'}`,
            duration: 5000,
            style: { background: "linear-gradient(135deg, #ef4444, #dc2626)" }
          }).showToast();
        } catch (failError) {
          console.error('Failed to notify backend of payment failure', failError);
        } finally {
          setPayingNotificationId(null);
        }
      });

      rzp.open();

    } catch (err) {
      console.error('Failed to initiate checkout from notification', err);
      Toastify({
        text: err.response?.data?.message || "Failed to contact payment gateway.",
        duration: 4000,
        style: { background: "linear-gradient(135deg, #ef4444, #dc2626)" }
      }).showToast();
      setPayingNotificationId(null);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.post('/notifications/mark-all-read');
      fetchNotifications();
    } catch (error) {
      console.error('Failed to mark all as read', error);
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

    const getNavItems = (role) => {
    switch (role) {
      case 'admin':
        return [
          { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
          { name: 'Planners', path: '/planners', icon: Users },
          { name: 'Vendors', path: '/admin/vendors', icon: Truck },
          { name: 'Events', path: '/admin/events', icon: Calendar },
          { name: 'Messages', path: '/chat', icon: MessageSquare },
        ];
      case 'vendor':
        return [
          { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
          { name: 'Services', path: '/services', icon: Truck },
          { name: 'Bookings', path: '/bookings', icon: Calendar },
          { name: 'Payments', path: '/payments', icon: CreditCard },
          { name: 'Messages', path: '/chat', icon: MessageSquare },
        ];
      case 'planner':
      default:
        return [
          { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
          { name: 'Events', path: '/events', icon: Calendar },
          { name: 'Budget', path: '/budget', icon: Wallet },
          { name: 'Payments', path: '/payments', icon: CreditCard },
          { name: 'Messages', path: '/chat', icon: MessageSquare },
        ];
    }
  };

  const navItems = getNavItems(user?.role);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col">
        <div className="p-8">
          <h1 className="text-2xl font-display text-primary font-bold">Aura Events</h1>
        </div>
        
        <nav className="flex-1 px-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center space-x-3 px-4 py-3 rounded-full transition-all duration-200 ${
                location.pathname === item.path
                  ? 'bg-primary text-white shadow-lg shadow-primary/20'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <item.icon size={20} />
              <span className="font-medium">{item.name}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="flex items-center space-x-3 px-4 py-3 rounded-full text-red-500 hover:bg-red-50 w-full transition-colors"
          >
            <LogOut size={20} />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Navbar */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-gray-100 flex items-center justify-between px-8 sticky top-0 z-20">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-display font-semibold text-gray-800">
              {navItems.find(n => n.path === location.pathname)?.name || 'Dashboard'}
            </h2>
          </div>

          <div className="flex items-center space-x-6">
            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)}
                className="relative text-gray-500 hover:text-primary transition-colors p-2 rounded-full hover:bg-gray-50"
              >
                <Bell size={22} />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 bg-red-500 text-white font-extrabold text-[9px] w-4 h-4 flex items-center justify-center rounded-full border border-white shadow-sm">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotificationsDropdown && (
                <div className="absolute right-0 mt-3 w-80 bg-white/95 backdrop-blur-md rounded-3xl border border-gray-100 shadow-2xl p-4 space-y-3 z-50 text-left">
                  <div className="flex justify-between items-center pb-2 border-b border-gray-50">
                    <span className="font-display font-bold text-gray-800 text-sm">Notifications</span>
                    {unreadCount > 0 && (
                      <button 
                        onClick={handleMarkAllAsRead}
                        className="text-[10px] font-bold text-primary hover:underline"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>
                  
                  <div className="max-h-64 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                    {notifications.length > 0 ? (
                      notifications.map((notif) => (
                        <div 
                          key={notif.id}
                          onClick={() => handleMarkAsRead(notif.id, notif.type)}
                          className={`p-3 rounded-2xl cursor-pointer transition-all duration-200 border text-xs relative flex items-start space-x-2.5
                            ${notif.is_read 
                              ? 'bg-white hover:bg-gray-50/50 border-transparent text-gray-500' 
                              : 'bg-primary/5 hover:bg-primary/10 border-primary/5 text-gray-800 font-medium'}`}
                        >
                          <div className="flex-1 space-y-0.5">
                            <p className={`text-[11px] leading-tight ${!notif.is_read ? 'font-bold text-gray-900' : 'text-gray-600'}`}>
                              {notif.title}
                            </p>
                            <p className="text-[10px] text-gray-400 line-clamp-2 leading-relaxed">
                              {notif.message}
                            </p>
                            <span className="text-[9px] text-gray-300 block mb-1">
                              {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {notif.payment_id && !notif.is_read && (
                              <button
                                onClick={(e) => handlePayDirectly(e, notif)}
                                disabled={payingNotificationId === notif.id}
                                className="mt-1.5 flex items-center space-x-1 bg-primary text-white font-bold text-[10px] px-2.5 py-1 rounded-lg hover:bg-primary/95 transition-all shadow-sm disabled:opacity-50"
                              >
                                {payingNotificationId === notif.id ? (
                                  <>
                                    <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                    <span>Processing...</span>
                                  </>
                                ) : (
                                  <>
                                    <CreditCard className="w-2.5 h-2.5" />
                                    <span>Click to pay</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                          {!notif.is_read && (
                            <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0 animate-pulse"></span>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="py-6 text-center text-gray-400 text-[11px]">
                        No notifications yet
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-gray-800">{user?.name}</p>
                <p className="text-xs text-gray-500 capitalize">{user?.role || 'Planner'}</p>
              </div>
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
                {user?.name?.[0]?.toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-8 flex-1">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
