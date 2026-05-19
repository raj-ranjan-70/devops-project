import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, Search, MessageSquare, Clock, ArrowLeft, 
  Loader2, User, Sparkles, Lock
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

              <div className="text-[10px] bg-green-50 text-green-600 px-2.5 py-1 rounded-full font-bold border border-green-100 flex items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1 animate-ping"></span>
                Active Thread
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
                    
                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        className={`flex ${isSelf ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[70%] space-y-1`}>
                          <div className={`p-4 rounded-3xl text-xs leading-relaxed shadow-sm
                            ${isSelf 
                              ? 'bg-primary text-white rounded-tr-none' 
                              : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'}`}
                          >
                            <p className="whitespace-pre-wrap">{msg.message}</p>
                          </div>
                          
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
    </div>
  );
};

export default ChatPage;
