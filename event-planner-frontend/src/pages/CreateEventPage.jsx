import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Save, 
  Calendar, 
  MapPin, 
  IndianRupee, 
  Users,
  Image as ImageIcon,
  Loader2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useState } from 'react';
import useAuthStore from '../store/useAuthStore';

const CreateEventPage = () => {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const isSuspended = user?.role === 'planner' && !user?.is_active;

  if (isSuspended) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-6">
        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-display font-bold text-gray-800">Account Suspended</h2>
          <p className="text-sm text-gray-500 leading-relaxed animate-pulse">
            You are currently suspended and cannot create new events. Please contact the administrator.
          </p>
        </div>
        <Link to="/chat" className="elegant-button-primary inline-flex items-center">
          Contact Admin
        </Link>
      </div>
    );
  }

  const minDateString = () => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const tzOffset = tomorrow.getTimezoneOffset() * 60000;
    const localTomorrow = new Date(tomorrow.getTime() - tzOffset);
    return localTomorrow.toISOString().slice(0, 16);
  };

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await api.post('/events', data);
      navigate('/events');
    } catch (error) {
      console.error('Failed to create event', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center space-x-4">
        <Link to="/events" className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm hover:shadow-md transition-all">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-4xl font-display font-bold">New Masterpiece</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <div className="glass-card p-10 rounded-3xl space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-bold text-gray-700 mb-3">Event Title</label>
              <input
                {...register('title', { required: 'Title is required' })}
                type="text"
                placeholder="e.g. Celestial Union of Elena & Marc"
                className="w-full px-6 py-4 bg-background rounded-2xl border-none focus:ring-2 focus:ring-primary transition-all text-lg font-display"
              />
              {errors.title && <p className="mt-2 text-sm text-red-500">{errors.title.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-3">Event Date (Min 24 hrs from now)</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  {...register('event_date', { 
                    required: 'Date is required',
                    validate: value => {
                      const selected = new Date(value);
                      const minDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
                      return selected >= minDate || 'Event must be scheduled at least 24 hours in the future.';
                    }
                  })}
                  type="datetime-local"
                  min={minDateString()}
                  className="w-full pl-12 pr-6 py-4 bg-background rounded-2xl border-none focus:ring-2 focus:ring-primary transition-all"
                />
              </div>
              {errors.event_date && <p className="mt-2 text-sm text-red-500">{errors.event_date.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-3">Event Duration (Hours)</label>
              <input
                {...register('duration', { 
                  required: 'Duration is required', 
                  min: { value: 1, message: 'Duration must be at least 1 hour' }
                })}
                type="number"
                placeholder="e.g. 3"
                defaultValue={3}
                className="w-full px-6 py-4 bg-background rounded-2xl border-none focus:ring-2 focus:ring-primary transition-all"
              />
              {errors.duration && <p className="mt-2 text-sm text-red-500">{errors.duration.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-3">Event Type</label>
              <select
                {...register('event_type', { required: 'Type is required' })}
                className="w-full px-6 py-4 bg-background rounded-2xl border-none focus:ring-2 focus:ring-primary transition-all"
              >
                <option value="wedding">Wedding</option>
                <option value="gala">Charity Gala</option>
                <option value="corporate">Corporate Retreat</option>
                <option value="birthday">Private Birthday</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-3">Venue</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  {...register('venue')}
                  type="text"
                  placeholder="Grand Resort & Spa"
                  className="w-full pl-12 pr-6 py-4 bg-background rounded-2xl border-none focus:ring-2 focus:ring-primary transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-3">Target Budget</label>
              <div className="relative">
                <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  {...register('budget')}
                  type="number"
                  placeholder="50000"
                  className="w-full pl-12 pr-6 py-4 bg-background rounded-2xl border-none focus:ring-2 focus:ring-primary transition-all"
                />
              </div>
            </div>

            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-bold text-gray-700 mb-3">Description</label>
              <textarea
                {...register('description')}
                rows={4}
                placeholder="Describe the vision and aesthetic of this event..."
                className="w-full px-6 py-4 bg-background rounded-2xl border-none focus:ring-2 focus:ring-primary transition-all resize-none"
              ></textarea>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-4">
          <Link to="/events" className="elegant-button-secondary">Cancel</Link>
          <button
            disabled={loading}
            type="submit"
            className="elegant-button-primary flex items-center min-w-[200px] justify-center"
          >
            {loading ? <Loader2 className="animate-spin mr-2" /> : <><Save className="mr-2" /> Save Event</>}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateEventPage;
