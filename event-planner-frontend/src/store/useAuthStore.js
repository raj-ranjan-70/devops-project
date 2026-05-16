import { create } from 'zustand';
import api from '../services/api';

const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: !!localStorage.getItem('auth_token'),
  isLoading: false,
  error: null,

  login: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/login', credentials);
      const { user, token } = response.data;
      localStorage.setItem('auth_token', token);
      set({ user, isAuthenticated: true, isLoading: false });
      return true;
    } catch (error) {
      const message = error.response?.data?.message || 
                      (error.response?.data ? Object.values(error.response.data).flat()[0] : null) || 
                      'Login failed';
      set({ error: message, isLoading: false });
      
      // Auto-clear error after 5 seconds
      setTimeout(() => set({ error: null }), 5000);
      
      return false;
    }
  },

  register: async (userData) => {
    console.log(import.meta.env.VITE_API_URL);
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/register', userData);
      const { user, token } = response.data;
      localStorage.setItem('auth_token', token);
      set({ user, isAuthenticated: true, isLoading: false });
      return true;
    } catch (error) {
      const message = error.response?.data?.message || 
                      (error.response?.data ? Object.values(error.response.data).flat()[0] : null) || 
                      'Registration failed';
      set({ error: message, isLoading: false });
      
      // Auto-clear error after 5 seconds
      setTimeout(() => set({ error: null }), 5000);
      
      return false;
    }
  },

  clearError: () => set({ error: null }),

  logout: async () => {
    try {
      await api.post('/logout');
    } finally {
      localStorage.removeItem('auth_token');
      set({ user: null, isAuthenticated: false });
    }
  },

  fetchUser: async () => {
    if (!localStorage.getItem('auth_token')) return;
    try {
      const response = await api.get('/me');
      set({ user: response.data, isAuthenticated: true });
    } catch (error) {
      localStorage.removeItem('auth_token');
      set({ user: null, isAuthenticated: false });
    }
  },
}));

export default useAuthStore;
