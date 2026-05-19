import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, Lock, ArrowRight, Loader2, ArrowLeft } from 'lucide-react';
import useAuthStore from '../store/useAuthStore';

const SignupPage = () => {
  const { register, handleSubmit, formState: { errors }, watch } = useForm();
  const { register: signup, isLoading, error } = useAuthStore();
  const navigate = useNavigate();

  const onSubmit = async (data) => {
    const success = await signup(data);
    if (success) {
      navigate('/dashboard');
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div 
      className="min-h-screen w-full relative flex items-center justify-center px-6 py-20 bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/images/signup-page-image.webp')" }}
    >
      {/* Background Dimming & Blur Overlay */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-0"></div>

      {/* Floating Back Arrow Button */}
      <button 
        onClick={handleBack}
        className="absolute top-8 left-8 z-20 flex items-center justify-center w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/25 hover:scale-105 transition-all shadow-lg cursor-pointer"
        aria-label="Go Back"
      >
        <ArrowLeft size={20} />
      </button>

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="max-w-md w-full relative z-10"
      >
        <div className="text-center mb-8">
          <h1 className="text-4xl font-display font-bold mb-3 text-white drop-shadow-md">Join Aura</h1>
          <p className="text-white/80 font-medium">Start planning your extraordinary event today</p>
        </div>

        {/* Premium Glassmorphic Form Container */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-8 md:p-10 rounded-3xl shadow-2xl relative">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-red-500/25 border border-red-500/40 text-red-100 p-4 rounded-2xl text-sm font-medium overflow-hidden"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Full Name */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-white/90">Full Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-white/60" size={20} />
                <input
                  {...register('name', { required: 'Name is required' })}
                  type="text"
                  className="w-full pl-12 pr-4 py-4 bg-white/5 text-white placeholder-white/40 rounded-2xl border border-white/10 focus:outline-none focus:ring-2 focus:ring-white/40 focus:bg-white/10 transition-all text-sm font-medium"
                  placeholder="John Doe"
                />
              </div>
              {errors.name && <p className="mt-1 text-xs text-red-300 font-semibold">{errors.name.message}</p>}
            </div>

            {/* Account Type */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-white/90">Account Type</label>
              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center p-4 border border-white/10 rounded-2xl cursor-pointer bg-white/5 hover:bg-white/10 transition-colors text-white">
                  <input
                    {...register('role')}
                    type="radio"
                    value="planner"
                    defaultChecked
                    className="mr-3 accent-white"
                  />
                  <span className="font-bold text-sm text-white/90">Event Planner</span>
                </label>
                <label className="flex items-center p-4 border border-white/10 rounded-2xl cursor-pointer bg-white/5 hover:bg-white/10 transition-colors text-white">
                  <input
                    {...register('role')}
                    type="radio"
                    value="vendor"
                    className="mr-3 accent-white"
                  />
                  <span className="font-bold text-sm text-white/90">Service Vendor</span>
                </label>
              </div>
            </div>

            {/* Email Address */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-white/90">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/60" size={20} />
                <input
                  {...register('email', { 
                    required: 'Email is required',
                    pattern: { value: /^\S+@\S+$/i, message: 'Invalid email' }
                  })}
                  type="email"
                  className="w-full pl-12 pr-4 py-4 bg-white/5 text-white placeholder-white/40 rounded-2xl border border-white/10 focus:outline-none focus:ring-2 focus:ring-white/40 focus:bg-white/10 transition-all text-sm font-medium"
                  placeholder="name@example.com"
                />
              </div>
              {errors.email && <p className="mt-1 text-xs text-red-300 font-semibold">{errors.email.message}</p>}
            </div>

            {/* Password Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-bold text-white/90">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/60" size={20} />
                  <input
                    {...register('password', { 
                      required: 'Password is required',
                      minLength: { value: 8, message: 'Min 8 characters' }
                    })}
                    type="password"
                    className="w-full pl-12 pr-4 py-4 bg-white/5 text-white placeholder-white/40 rounded-2xl border border-white/10 focus:outline-none focus:ring-2 focus:ring-white/40 focus:bg-white/10 transition-all text-xs font-medium"
                    placeholder="••••••••"
                  />
                </div>
                {errors.password && <p className="mt-1 text-xs text-red-300 font-semibold">{errors.password.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-white/90">Confirm</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/60" size={20} />
                  <input
                    {...register('password_confirmation', { 
                      validate: value => value === watch('password') || 'Passwords do not match'
                    })}
                    type="password"
                    className="w-full pl-12 pr-4 py-4 bg-white/5 text-white placeholder-white/40 rounded-2xl border border-white/10 focus:outline-none focus:ring-2 focus:ring-white/40 focus:bg-white/10 transition-all text-xs font-medium"
                    placeholder="••••••••"
                  />
                </div>
                {errors.password_confirmation && <p className="mt-1 text-xs text-red-300 font-semibold">{errors.password_confirmation.message}</p>}
              </div>
            </div>

            {/* Submit Button */}
            <button
              disabled={isLoading}
              type="submit"
              className="w-full bg-white hover:bg-gray-100 text-gray-900 font-bold py-4 rounded-2xl shadow-xl flex items-center justify-center group transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer text-sm"
            >
              {isLoading ? (
                <Loader2 className="animate-spin mr-2 text-gray-900" />
              ) : (
                <>
                  Create Account
                  <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform text-gray-900" size={16} />
                </>
              )}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-8 text-center border-t border-white/10 pt-6">
            <p className="text-white/70 text-sm font-medium">
              Already have an account?{' '}
              <Link to="/login" className="text-white font-bold hover:underline transition-all">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default SignupPage;
