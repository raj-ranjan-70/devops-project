import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, AlertCircle, Heart, Calendar, Clock, MapPin, Sparkles } from 'lucide-react';
import api from '../services/api';

const RSVPProcessingPage = () => {
  const { token, action } = useParams();
  const [state, setState] = useState({
    status: 'loading', // 'loading' | 'success_accepted' | 'success_declined' | 'error_responded' | 'error_invalid'
    guestName: '',
    eventTitle: '',
    message: '',
    recordedStatus: '' // 'confirmed' | 'declined'
  });

  useEffect(() => {
    let isMounted = true;

    const recordRSVP = async () => {
      try {
        // Execute the public unauthenticated RSVP update immediately on mount
        const response = await api.get(`/public-rsvp/${token}/${action}`);
        
        if (isMounted) {
          const { status: rsvpStatus, guest, event } = response.data;
          setState({
            status: rsvpStatus === 'confirmed' ? 'success_accepted' : 'success_declined',
            guestName: guest?.name || 'Guest',
            eventTitle: event?.title || 'the celebration',
            message: response.data.message || '',
            recordedStatus: rsvpStatus
          });
        }
      } catch (err) {
        if (!isMounted) return;

        const errorData = err.response?.data;
        if (err.response?.status === 422 && errorData?.error === 'already_responded') {
          // Already responded - customized premium feedback state
          setState({
            status: 'error_responded',
            guestName: errorData.guest?.name || 'Guest',
            eventTitle: errorData.event?.title || 'the celebration',
            message: errorData.message || 'You have already responded.',
            recordedStatus: errorData.guest?.rsvp_status || 'confirmed'
          });
        } else {
          // 404, invalid action, expired/invalid token
          setState({
            status: 'error_invalid',
            guestName: '',
            eventTitle: '',
            message: errorData?.message || 'This RSVP invitation link is invalid or has expired.',
            recordedStatus: ''
          });
        }
      }
    };

    // Small artificially pleasant timeout to ensure guest gets to see the elegant loading experience
    const timer = setTimeout(() => {
      recordRSVP();
    }, 1500);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [token, action]);

  // Framer Motion transition variables
  const cardVariants = {
    hidden: { opacity: 0, scale: 0.93, y: 15 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      y: 0,
      transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } 
    },
    exit: { 
      opacity: 0, 
      scale: 0.95, 
      y: -10, 
      transition: { duration: 0.3, ease: 'easeIn' } 
    }
  };

  const loaderVariants = {
    animate: {
      rotate: 360,
      transition: {
        repeat: Infinity,
        duration: 1.8,
        ease: "linear"
      }
    }
  };

  const renderContent = () => {
    switch (state.status) {
      case 'loading':
        return (
          <motion.div
            key="loading-state"
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="w-full max-w-md bg-white/70 backdrop-blur-xl border border-white/40 p-10 rounded-[2.5rem] shadow-[0_15px_50px_-15px_rgba(79,55,138,0.12)] text-center relative overflow-hidden"
          >
            {/* Soft decorative background glow */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-primary/5 rounded-full blur-2xl"></div>
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-pink-500/5 rounded-full blur-2xl"></div>

            {/* Custom Premium Wedding Ring Loader */}
            <div className="relative flex justify-center mb-8">
              <motion.div
                variants={loaderVariants}
                animate="animate"
                className="w-20 h-20 rounded-full border-[3px] border-t-gold border-r-primary/20 border-b-primary/10 border-l-primary/10 flex items-center justify-center shadow-lg shadow-gold/5"
              >
                <Heart className="text-gold fill-gold/10 w-8 h-8 animate-pulse" />
              </motion.div>
            </div>

            <h2 className="text-2xl font-display font-semibold text-gray-900 mb-3 tracking-wide">
              Verifying Invitation
            </h2>
            <p className="text-gray-500 text-sm font-medium leading-relaxed max-w-xs mx-auto">
              Please wait a moment while we confirm your response and secure your place...
            </p>
          </motion.div>
        );

      case 'success_accepted':
        return (
          <motion.div
            key="accepted-state"
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="w-full max-w-md bg-white/75 backdrop-blur-2xl border-2 border-gold/30 p-10 rounded-[2.5rem] shadow-[0_20px_60px_-10px_rgba(212,175,55,0.15)] text-center relative overflow-hidden"
          >
            {/* Elegant Floral Deco Dots */}
            <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-gold/50 via-primary to-gold/50"></div>
            
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-md">
                <CheckCircle2 size={32} className="stroke-[1.5]" />
              </div>
            </div>

            <span className="inline-flex items-center gap-1.5 text-xs text-gold font-bold uppercase tracking-widest bg-gold/10 px-3 py-1 rounded-full mb-4">
              <Sparkles size={12} className="fill-gold/20" /> RSVP Confirmed
            </span>

            <h2 className="text-3xl font-display font-bold text-gray-900 mb-2 leading-tight">
              We're Delighted!
            </h2>
            
            <p className="text-gray-700 text-base font-semibold font-display italic mb-6">
              Dearest {state.guestName},
            </p>

            <div className="bg-primary/5 rounded-2xl p-5 mb-6 border border-primary/5 text-left text-sm text-gray-600 space-y-3">
              <div className="flex items-center gap-2.5">
                <Heart size={16} className="text-primary fill-primary/10" />
                <span className="font-semibold text-gray-800 line-clamp-1">{state.eventTitle}</span>
              </div>
              <div className="h-px bg-gray-200/50"></div>
              <p className="text-xs leading-relaxed text-gray-500">
                Your acceptance has been recorded successfully. We look forward to celebrating this beautiful milestone with you.
              </p>
            </div>

            <p className="text-xs text-gray-400 font-medium">
              You may now safely close this window.
            </p>
          </motion.div>
        );

      case 'success_declined':
        return (
          <motion.div
            key="declined-state"
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="w-full max-w-md bg-white/75 backdrop-blur-2xl border border-gray-200/60 p-10 rounded-[2.5rem] shadow-[0_20px_50px_-15px_rgba(0,0,0,0.06)] text-center relative overflow-hidden"
          >
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-gray-300 via-gray-400 to-gray-300"></div>

            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-500 shadow-sm">
                <CheckCircle2 size={32} className="stroke-[1.5]" />
              </div>
            </div>

            <span className="inline-flex items-center text-xs text-gray-500 font-bold uppercase tracking-widest bg-gray-100 px-3 py-1 rounded-full mb-4">
              Response Recorded
            </span>

            <h2 className="text-3xl font-display font-bold text-gray-900 mb-2 leading-tight">
              Thank You
            </h2>

            <p className="text-gray-600 text-base font-semibold font-display italic mb-6">
              Dearest {state.guestName},
            </p>

            <div className="bg-gray-50 rounded-2xl p-5 mb-6 border border-gray-100 text-left text-sm text-gray-600 space-y-3">
              <p className="font-semibold text-gray-800 line-clamp-1">{state.eventTitle}</p>
              <div className="h-px bg-gray-200/50"></div>
              <p className="text-xs leading-relaxed text-gray-500">
                Your decline response has been recorded. While we are sad that you cannot celebrate with us, we truly thank you for letting us know.
              </p>
            </div>

            <p className="text-xs text-gray-400 font-medium">
              You may now safely close this window.
            </p>
          </motion.div>
        );

      case 'error_responded':
        return (
          <motion.div
            key="responded-error-state"
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="w-full max-w-md bg-white/75 backdrop-blur-2xl border border-primary/20 p-10 rounded-[2.5rem] shadow-[0_20px_50px_-15px_rgba(79,55,138,0.08)] text-center relative overflow-hidden"
          >
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/30 to-gold/30"></div>

            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-[#fdf7ff] border border-primary/10 flex items-center justify-center text-primary shadow-sm">
                <AlertCircle size={32} className="stroke-[1.5]" />
              </div>
            </div>

            <span className="inline-flex items-center text-xs text-primary font-bold uppercase tracking-widest bg-primary/5 px-3 py-1 rounded-full mb-4">
              Already Responded
            </span>

            <h2 className="text-2xl font-display font-bold text-gray-900 mb-2 leading-tight">
              Hello {state.guestName}
            </h2>

            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-6">
              For: {state.eventTitle}
            </p>

            <div className="bg-primary/5 rounded-2xl p-5 mb-6 border border-primary/5 text-center text-sm">
              <p className="text-xs text-gray-600 font-medium leading-relaxed">
                You have already responded to this invitation with status:
              </p>
              <div className="mt-3 inline-flex items-center justify-center px-6 py-2 rounded-full font-bold text-xs uppercase tracking-wider border shadow-sm bg-white">
                {state.recordedStatus === 'confirmed' ? (
                  <span className="text-emerald-600 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                    Confirmed & Accepted
                  </span>
                ) : (
                  <span className="text-red-500 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-400"></span>
                    Declined
                  </span>
                )}
              </div>
            </div>

            <p className="text-xs text-gray-400 font-medium leading-relaxed max-w-xs mx-auto">
              If you wish to change your response, please contact the hosts directly. You may now close this page.
            </p>
          </motion.div>
        );

      case 'error_invalid':
      default:
        return (
          <motion.div
            key="invalid-error-state"
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="w-full max-w-md bg-white/75 backdrop-blur-2xl border border-red-200/50 p-10 rounded-[2.5rem] shadow-[0_20px_50px_-15px_rgba(239,68,68,0.08)] text-center relative overflow-hidden"
          >
            <div className="absolute inset-x-0 top-0 h-1 bg-red-500"></div>

            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-red-500 shadow-sm animate-bounce">
                <XCircle size={32} className="stroke-[1.5]" />
              </div>
            </div>

            <span className="inline-flex items-center text-xs text-red-600 font-bold uppercase tracking-widest bg-red-50 px-3 py-1 rounded-full mb-4">
              Link Inoperable
            </span>

            <h2 className="text-2xl font-display font-bold text-gray-900 mb-3 leading-tight">
              Invalid or Expired Link
            </h2>

            <p className="text-gray-500 text-xs leading-relaxed max-w-xs mx-auto mb-6">
              This RSVP link is either fully expired, tampered with, or does not exist on our records. Please double-check the invitation URL or reach out to the event planners.
            </p>

            <div className="h-px bg-gray-200 mb-6"></div>

            <p className="text-xs text-gray-400 font-medium">
              You may close this window.
            </p>
          </motion.div>
        );
    }
  };

  return (
    <div className="min-h-screen w-screen relative bg-gradient-to-tr from-[#faf5ff] via-[#fff5f6] to-[#f3efff] flex flex-col items-center justify-center p-6 font-body overflow-x-hidden selection:bg-gold/20 selection:text-primary">
      {/* Decorative Blur Spheres for a Premium Soft Glow */}
      <div className="absolute top-1/4 left-1/10 w-96 h-96 bg-primary/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/10 w-96 h-96 bg-pink-500/10 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Floating Sparkle/Flower icons for elegant wedding atmosphere */}
      <div className="absolute top-10 right-10 text-gold/30 animate-pulse pointer-events-none">
        <Sparkles size={24} className="stroke-[1]" />
      </div>
      <div className="absolute bottom-10 left-10 text-primary/20 animate-pulse pointer-events-none" style={{ animationDelay: '1s' }}>
        <Sparkles size={32} className="stroke-[1]" />
      </div>

      <div className="relative z-10 w-full flex flex-col items-center">
        {/* Wedding Platform Luxury branding */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 text-center"
        >
          <span className="text-3xl font-display font-bold tracking-widest text-primary drop-shadow-sm">
            Aura
          </span>
          <p className="text-[10px] text-gold font-bold uppercase tracking-[0.25em] mt-1">
            Exclusive Concierge
          </p>
        </motion.div>

        {/* Animated Card Container */}
        <div className="w-full flex items-center justify-center">
          <AnimatePresence mode="wait">
            {renderContent()}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default RSVPProcessingPage;
