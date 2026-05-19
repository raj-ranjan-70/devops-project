import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, CheckCircle, XCircle, Trash2, Eye } from 'lucide-react';
import api from '../services/api';

const AdminVendorsPage = () => {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      const response = await api.get('/admin/users?role=vendor');
      setVendors(response.data);
    } catch (error) {
      console.error('Failed to fetch vendors', error);
    } finally {
      setLoading(false);
    }
  };

  // Suspension modal states
  const [suspensionModalOpen, setSuspensionModalOpen] = useState(false);
  const [selectedVendorForSuspension, setSelectedVendorForSuspension] = useState(null);
  const [suspensionReason, setSuspensionReason] = useState('');
  const [suspending, setSuspending] = useState(false);

  const handleUpdateStatus = async (vendorId, is_active) => {
    try {
      await api.put(`/admin/users/${vendorId}`, { is_active });
      fetchVendors();
    } catch (error) {
      console.error('Failed to update vendor status', error);
    }
  };

  const confirmSuspension = async () => {
    if (!selectedVendorForSuspension) return;
    setSuspending(true);
    try {
      await api.put(`/admin/users/${selectedVendorForSuspension.id}`, { 
        is_active: false,
        suspension_reason: suspensionReason.trim()
      });
      fetchVendors();
      setSuspensionModalOpen(false);
      setSelectedVendorForSuspension(null);
      setSuspensionReason('');
    } catch (error) {
      console.error('Failed to suspend vendor', error);
      alert('Failed to suspend vendor. Please try again.');
    } finally {
      setSuspending(false);
    }
  };

  const handleToggleStatus = (vendor) => {
    if (vendor.is_active) {
      // Open suspension modal
      setSelectedVendorForSuspension(vendor);
      setSuspensionReason('');
      setSuspensionModalOpen(true);
    } else {
      // Activating suspended vendor
      if (window.confirm(`Are you sure you want to reactivate ${vendor.name}'s profile?`)) {
        handleUpdateStatus(vendor.id, true);
      }
    }
  };

  const handleDelete = async (vendorId) => {
    if (!window.confirm('Are you sure you want to permanently remove this vendor?')) return;
    try {
      await api.delete(`/admin/users/${vendorId}`);
      fetchVendors();
    } catch (error) {
      console.error('Failed to delete vendor', error);
    }
  };

  const filteredVendors = vendors.filter(vendor => 
    (vendor.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (vendor.user?.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-display font-bold">Vendor Management</h1>
          <p className="text-gray-500 mt-2">Approve, reject, and monitor vendor profiles</p>
        </div>
      </div>

      <div className="glass-card p-6 rounded-3xl">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search vendors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64 text-primary animate-pulse">Loading vendors...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="py-4 px-4 font-display font-bold text-gray-600">Vendor User</th>
                  <th className="py-4 px-4 font-display font-bold text-gray-600">Email</th>
                  <th className="py-4 px-4 font-display font-bold text-gray-600">Status</th>
                  <th className="py-4 px-4 font-display font-bold text-gray-600">Joined</th>
                  <th className="py-4 px-4 font-display font-bold text-gray-600 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredVendors.map((vendor, index) => (
                  <motion.tr 
                    key={vendor.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                          {vendor.name ? vendor.name.charAt(0).toUpperCase() : 'V'}
                        </div>
                        <div>
                          <p className="font-bold text-gray-800">{vendor.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-gray-500">
                      {vendor.email}
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider
                        ${vendor.is_active ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}
                      >
                        {vendor.is_active ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-600">
                      {new Date(vendor.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex justify-end space-x-2">
                        {vendor.is_active ? (
                          <button 
                            onClick={() => handleToggleStatus(vendor)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Suspend Vendor"
                          >
                            <XCircle size={18} />
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleToggleStatus(vendor)}
                            className="p-2 text-green-600 hover:bg-green-50 bg-green-50/50 rounded-lg transition-colors border border-green-200 shadow-sm"
                            title="Reactivate Vendor"
                          >
                            <CheckCircle size={18} />
                          </button>
                        )}
                        <button className="p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-800 rounded-lg transition-colors" title="View Details">
                          <Eye size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(vendor.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remove Vendor"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
                
                {filteredVendors.length === 0 && (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-gray-500">
                      No vendors found matching your search.
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
        {suspensionModalOpen && selectedVendorForSuspension && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl relative border border-gray-100"
            >
              <h3 className="text-xl font-display font-bold text-gray-800">Suspend Vendor Profile</h3>
              <p className="text-sm text-gray-500 mt-2">
                Are you sure you want to suspend <strong className="text-gray-800 font-bold">{selectedVendorForSuspension.name}</strong>?
              </p>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                This will temporarily disable their account, hide all their service listings from planners, and send them a chat message indicating the reason.
              </p>
              
              <div className="mt-4">
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                  Reason for Suspension
                </label>
                <textarea
                  value={suspensionReason}
                  onChange={(e) => setSuspensionReason(e.target.value)}
                  placeholder="e.g. Multiple client complaints regarding late delivery or non-responsiveness..."
                  rows={4}
                  className="w-full bg-gray-50 border-none rounded-2xl p-3.5 text-xs focus:ring-2 focus:ring-primary/20 text-gray-850 placeholder:text-gray-405 resize-none border border-gray-100"
                  required
                />
              </div>
              
              <div className="mt-6 flex space-x-3 justify-end">
                <button
                  onClick={() => {
                    setSuspensionModalOpen(false);
                    setSelectedVendorForSuspension(null);
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

export default AdminVendorsPage;
