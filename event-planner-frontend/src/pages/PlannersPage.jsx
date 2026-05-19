import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MoreVertical, Trash2, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import api from '../services/api';
import useAuthStore from '../store/useAuthStore';
import Toastify from 'toastify-js';
import "toastify-js/src/toastify.css";

const PlannersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { user: currentUser } = useAuthStore();

  // Suspension modal and loader states
  const [suspensionModalOpen, setSuspensionModalOpen] = useState(false);
  const [selectedPlannerForSuspension, setSelectedPlannerForSuspension] = useState(null);
  const [suspensionReason, setSuspensionReason] = useState('');
  const [suspending, setSuspending] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState(null); // button loading spinner state

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/admin/users?role=planner');
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch planners', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = (planner) => {
    if (planner.is_active) {
      setSelectedPlannerForSuspension(planner);
      setSuspensionReason('');
      setSuspensionModalOpen(true);
    } else {
      if (window.confirm(`Are you sure you want to reactivate ${planner.name}'s profile?`)) {
        handleUpdateStatus(planner.id, true);
      }
    }
  };

  const handleUpdateStatus = async (plannerId, is_active) => {
    setUpdatingUserId(plannerId);
    try {
      await api.put(`/admin/users/${plannerId}`, { is_active });
      Toastify({
        text: `Planner account reactivated successfully`,
        duration: 3000,
        gravity: "top",
        position: "right",
        style: {
          background: "linear-gradient(135deg, #10b981, #059669)",
          borderRadius: "16px",
          boxShadow: "0 10px 15px -3px rgba(16, 185, 129, 0.2)",
          fontFamily: "Outfit, Inter, sans-serif",
          fontSize: "14px",
          fontWeight: "600",
          padding: "12px 24px",
        }
      }).showToast();
      fetchUsers();
    } catch (error) {
      console.error('Failed to update planner status', error);
      alert('Failed to reactivate planner. Please try again.');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const confirmSuspension = async () => {
    if (!selectedPlannerForSuspension) return;
    setSuspending(true);
    setUpdatingUserId(selectedPlannerForSuspension.id);
    try {
      await api.put(`/admin/users/${selectedPlannerForSuspension.id}`, { 
        is_active: false,
        suspension_reason: suspensionReason.trim()
      });
      
      Toastify({
        text: `Planner account suspended successfully`,
        duration: 3000,
        gravity: "top",
        position: "right",
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

      fetchUsers();
      setSuspensionModalOpen(false);
      setSelectedPlannerForSuspension(null);
      setSuspensionReason('');
    } catch (error) {
      console.error('Failed to suspend planner', error);
      alert('Failed to suspend planner. Please try again.');
    } finally {
      setSuspending(false);
      setUpdatingUserId(null);
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this planner? This action cannot be undone.')) return;
    try {
      await api.delete(`/admin/users/${userId}`);
      fetchUsers();
    } catch (error) {
      console.error('Failed to delete planner', error);
      alert(error.response?.data?.message || 'Failed to delete planner.');
    }
  };

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-display font-bold">Event Planners</h1>
          <p className="text-gray-500 mt-2">View and manage planner accounts</p>
        </div>
      </div>

      <div className="glass-card p-6 rounded-3xl">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search planners..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64 text-primary animate-pulse">Loading planners...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="py-4 px-4 font-display font-bold text-gray-600">Planner</th>
                  <th className="py-4 px-4 font-display font-bold text-gray-600">Role</th>
                  <th className="py-4 px-4 font-display font-bold text-gray-600">Status</th>
                  <th className="py-4 px-4 font-display font-bold text-gray-600">Joined</th>
                  <th className="py-4 px-4 font-display font-bold text-gray-600 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user, index) => (
                  <motion.tr 
                    key={user.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-gray-800">{user.name}</p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-600">
                        {user.role}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center w-max
                        ${user.is_active ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}
                      >
                        {user.is_active ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-gray-600 text-sm">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex justify-end space-x-2">
                        {user.id !== currentUser?.id && (
                          <>
                            {updatingUserId === user.id ? (
                              <button 
                                disabled
                                className="p-2 rounded-lg bg-gray-50/50 border border-gray-100 text-gray-400"
                              >
                                <Loader2 size={18} className="animate-spin text-primary" />
                              </button>
                            ) : user.is_active ? (
                              <button 
                                onClick={() => handleToggleStatus(user)}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Suspend Planner"
                              >
                                <XCircle size={18} />
                              </button>
                            ) : (
                              <button 
                                onClick={() => handleToggleStatus(user)}
                                className="p-2 text-green-600 hover:bg-green-50 bg-green-50/50 rounded-lg transition-colors border border-green-200 shadow-sm"
                                title="Reactivate Planner"
                              >
                                <CheckCircle size={18} />
                              </button>
                            )}
                            
                            <button 
                              onClick={() => handleDelete(user.id)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete User"
                            >
                              <Trash2 size={18} />
                            </button>
                          </>
                        )}
                        <button className="p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-800 rounded-lg transition-colors">
                          <MoreVertical size={18} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
                
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-gray-500">
                      No planners found matching your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Suspension Confirmation Modal */}
      <AnimatePresence>
        {suspensionModalOpen && selectedPlannerForSuspension && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl relative border border-gray-100"
            >
              <h3 className="text-xl font-display font-bold text-gray-800">Suspend Planner Profile</h3>
              <p className="text-sm text-gray-500 mt-2">
                Are you sure you want to suspend <strong className="text-gray-800 font-bold">{selectedPlannerForSuspension.name}</strong>?
              </p>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                This will temporarily disable their account, cancel any active admin partnerships, and send them a chat message indicating the reason.
              </p>
              
              <div className="mt-4">
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                  Reason for Suspension
                </label>
                <textarea
                  value={suspensionReason}
                  onChange={(e) => setSuspensionReason(e.target.value)}
                  placeholder="e.g. Terms of Service violation, suspicious activity, or user misconduct..."
                  rows={4}
                  className="w-full bg-gray-50 border-none rounded-2xl p-3.5 text-xs focus:ring-2 focus:ring-primary/20 text-gray-850 placeholder:text-gray-405 resize-none border border-gray-100"
                  required
                />
              </div>
              
              <div className="mt-6 flex space-x-3 justify-end">
                <button
                  onClick={() => {
                    setSuspensionModalOpen(false);
                    setSelectedPlannerForSuspension(null);
                    setSuspensionReason('');
                  }}
                  disabled={suspending}
                  className="px-4 py-2.5 text-xs rounded-xl font-bold hover:bg-gray-100 transition-colors text-gray-500"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmSuspension}
                  disabled={suspending || !suspensionReason.trim()}
                  className="px-5 py-2.5 text-xs rounded-xl font-bold bg-red-600 hover:bg-red-700 transition-colors text-white shadow-lg shadow-red-600/20 flex items-center space-x-1.5 disabled:opacity-50"
                >
                  {suspending ? 'Suspending...' : 'Suspend Profile'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PlannersPage;
