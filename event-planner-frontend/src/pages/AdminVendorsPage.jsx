import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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

  const handleUpdateStatus = async (vendorId, is_active) => {
    try {
      await api.put(`/admin/users/${vendorId}`, { is_active });
      fetchVendors();
    } catch (error) {
      console.error('Failed to update vendor status', error);
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
                        <button 
                          onClick={() => handleUpdateStatus(vendor.id, !vendor.is_active)}
                          className={`p-2 rounded-lg transition-colors ${vendor.is_active ? 'text-red-500 hover:bg-red-50' : 'text-green-500 hover:bg-green-50'}`}
                          title={vendor.is_active ? 'Suspend Vendor' : 'Activate Vendor'}
                        >
                          {vendor.is_active ? <XCircle size={18} /> : <CheckCircle size={18} />}
                        </button>
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
    </div>
  );
};

export default AdminVendorsPage;
