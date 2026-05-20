import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Truck, Plus, Star, MapPin, Edit3, Trash2, X, Loader2, 
  Info, Sparkles, IndianRupee, ToggleLeft, ToggleRight, Check 
} from 'lucide-react';
import api from '../services/api';
import { useForm } from 'react-hook-form';

const VendorServicesPage = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm();

  const fetchServices = async () => {
    setLoading(true);
    try {
      const response = await api.get('/vendor/services');
      setServices(response.data);
    } catch (error) {
      console.error('Failed to fetch services', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const openAddModal = () => {
    setEditingService(null);
    reset();
    setIsModalOpen(true);
  };

  const openEditModal = (service) => {
    setEditingService(service);
    setValue('business_name', service.business_name);
    setValue('category', service.category);
    setValue('description', service.description || '');
    setValue('starting_price', service.starting_price);
    setValue('location', service.location || '');
    setValue('image_url', service.image_url || '');
    setIsModalOpen(true);
  };

  const onSubmit = async (formData) => {
    setSubmitting(true);
    try {
      if (editingService) {
        // Update
        const response = await api.put(`/vendor/services/${editingService.id}`, formData);
        setServices(services.map(s => s.id === editingService.id ? response.data : s));
      } else {
        // Create
        const response = await api.post('/vendor/services', formData);
        setServices([response.data, ...services]);
      }
      setIsModalOpen(false);
      reset();
    } catch (error) {
      console.error('Failed to save service', error);
      alert('Failed to save service. Please check your inputs and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleAvailability = async (service) => {
    try {
      const updatedValue = !service.is_available;
      const response = await api.put(`/vendor/services/${service.id}`, {
        ...service,
        is_available: updatedValue
      });
      setServices(services.map(s => s.id === service.id ? response.data : s));
    } catch (error) {
      console.error('Failed to toggle availability', error);
    }
  };

  const deleteService = async (id) => {
    if (!confirm('Are you absolutely sure you want to delete this service profile? This action is permanent.')) return;
    try {
      await api.delete(`/vendor/services/${id}`);
      setServices(services.filter(s => s.id !== id));
    } catch (error) {
      console.error('Failed to delete service', error);
      alert('Failed to delete service. Please try again.');
    }
  };

  return (
    <div className="space-y-8 relative">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-display font-bold">Your Offerings</h1>
          <p className="text-gray-500 mt-1">Design, configure, and display your professional services to planning clients</p>
        </div>
        
        <button
          onClick={openAddModal}
          className="elegant-button-primary px-6 py-3 text-sm rounded-full shadow-lg shadow-primary/20 flex items-center space-x-2 font-bold"
        >
          <Plus size={18} />
          <span>New Service Profile</span>
        </button>
      </div>

      {/* Main Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64 font-display text-primary animate-pulse">
          Loading your service catalog...
        </div>
      ) : services.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="glass-card overflow-hidden rounded-3xl flex flex-col group border border-gray-100 hover:shadow-xl hover:shadow-primary/5 transition-all duration-500"
            >
              {/* Image / Header block */}
              <div className="h-48 relative overflow-hidden bg-gray-100 shrink-0">
                <img 
                  src={service.image_url || 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?q=80&w=600&auto=format&fit=crop'} 
                  alt={service.business_name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-md px-3 py-1 rounded-full flex items-center shadow-lg">
                  <Star size={14} className="fill-gold text-gold mr-1" />
                  <span className="text-xs font-bold text-gray-800">{Number(service.rating ?? 5.0).toFixed(1)}</span>
                </div>
                <div className="absolute bottom-4 left-4 bg-primary/95 text-white backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">
                  {service.category}
                </div>
              </div>

              {/* Body Content */}
              <div className="p-6 flex-grow flex flex-col justify-between space-y-4">
                <div>
                  <h3 className="text-xl font-display font-bold text-gray-800">{service.business_name}</h3>
                  <div className="flex items-center text-xs text-gray-400 mt-1 mb-3">
                    <MapPin size={12} className="mr-1 text-gray-400" />
                    <span>{service.location || 'Nationwide'}</span>
                  </div>
                  <p className="text-gray-500 text-sm line-clamp-3 leading-relaxed">
                    {service.description || 'No description provided.'}
                  </p>
                </div>

                {/* Pricing, Toggle, Actions */}
                <div className="pt-4 border-t border-gray-100 space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Starting Price</p>
                      <p className="text-lg font-bold text-primary">&#8377;{parseFloat(service.starting_price).toLocaleString('en-IN')}</p>
                    </div>

                    <button 
                      onClick={() => toggleAvailability(service)}
                      className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-300
                        ${service.is_available 
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                          : 'bg-gray-50 text-gray-500 border border-gray-200'}`}
                    >
                      {service.is_available ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                      <span>{service.is_available ? 'Available' : 'Unavailable'}</span>
                    </button>
                  </div>

                  <div className="flex justify-end space-x-2 pt-2">
                    <button
                      onClick={() => deleteService(service.id)}
                      className="p-2.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl transition-colors"
                      title="Delete profile"
                    >
                      <Trash2 size={16} />
                    </button>
                    <button
                      onClick={() => openEditModal(service)}
                      className="p-2.5 bg-gray-50 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors flex items-center space-x-1 font-bold text-xs"
                    >
                      <Edit3 size={16} />
                      <span>Edit Details</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="py-20 text-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center space-y-4 max-w-xl mx-auto">
          <Truck size={48} className="text-gray-300" />
          <div>
            <h3 className="text-lg font-bold text-gray-700">No Services Found</h3>
            <p className="text-sm text-gray-400 mt-1">Get started by building your first curated service profile to receive client bookings.</p>
          </div>
          <button
            onClick={openAddModal}
            className="elegant-button-primary px-5 py-3 text-xs flex items-center space-x-2 font-bold"
          >
            <Plus size={16} />
            <span>Create First Profile</span>
          </button>
        </div>
      )}

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] overflow-y-auto border border-gray-100"
            >
              {/* Modal Header */}
              <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 sticky top-0 z-10">
                <div className="flex items-center space-x-2">
                  <Sparkles className="text-primary" size={20} />
                  <h2 className="text-2xl font-display font-bold">
                    {editingService ? `Edit ${editingService.business_name}` : 'Create Service Profile'}
                  </h2>
                </div>
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Modal Form */}
              <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Business Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Aura Captures Photography"
                      {...register('business_name', { required: 'Business name is required' })}
                      className="w-full px-4 py-3 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary/20 transition-all text-sm text-gray-700"
                    />
                    {errors.business_name && <p className="mt-1 text-xs text-red-500">{errors.business_name.message}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Category</label>
                    <select
                      {...register('category', { required: 'Category is required' })}
                      className="w-full px-4 py-3 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary/20 transition-all text-sm text-gray-700"
                    >
                      <option value="">-- Select Category --</option>
                      <option value="Photography">Photography</option>
                      <option value="Catering">Catering</option>
                      <option value="Music/DJ">Music/DJ</option>
                      <option value="Venue">Venue</option>
                      <option value="Florist">Florist</option>
                      <option value="Other">Other</option>
                    </select>
                    {errors.category && <p className="mt-1 text-xs text-red-500">{errors.category.message}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Starting Price (&#8377;)</label>
                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...register('starting_price', { 
                          required: 'Starting price is required',
                          min: { value: 0, message: 'Price cannot be negative' }
                        })}
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary/20 transition-all text-sm text-gray-700"
                      />
                    </div>
                    {errors.starting_price && <p className="mt-1 text-xs text-red-500">{errors.starting_price.message}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Location / Coverage Area</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      <input
                        type="text"
                        placeholder="e.g. New York, NY"
                        {...register('location')}
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary/20 transition-all text-sm text-gray-700"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Profile Banner / Image URL</label>
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/photo-..."
                    {...register('image_url')}
                    className="w-full px-4 py-3 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary/20 transition-all text-sm text-gray-700"
                  />
                  <p className="mt-1 text-[10px] text-gray-400">Provide an Unsplash or static image link to showcase your work beautifully.</p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Service Description</label>
                  <textarea
                    rows={4}
                    placeholder="Provide a comprehensive breakdown of your service packages, specialized equipment, style, and general experience..."
                    {...register('description')}
                    className="w-full px-4 py-3 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary/20 transition-all text-sm text-gray-700"
                  ></textarea>
                </div>

                <div className="bg-primary/5 p-4 rounded-2xl flex items-start space-x-3 text-xs text-primary/80 leading-relaxed border border-primary/10">
                  <Info size={16} className="shrink-0 mt-0.5 text-primary" />
                  <span>Your service profiles are instantly visible on the planners' Discover directory once marked as **Available**. Maintain clear pricing and details to guarantee professional booking matches.</span>
                </div>

                {/* Actions */}
                <div className="pt-6 flex justify-end space-x-3 border-t border-gray-100">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)} 
                    className="px-6 py-3 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-full transition-colors font-bold"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={submitting} 
                    className="elegant-button-primary py-3 px-6 text-sm flex items-center font-bold"
                  >
                    {submitting ? <Loader2 className="animate-spin mr-2" size={16} /> : <Check className="mr-1.5" size={16} />}
                    {editingService ? 'Save Profile' : 'Publish Profile'}
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

export default VendorServicesPage;
