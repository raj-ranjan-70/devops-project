import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Wallet, TrendingUp, CreditCard, ArrowUpRight, IndianRupee } from 'lucide-react';
import api from '../services/api';

const BudgetPage = () => {
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBudgets = async () => {
      try {
        const response = await api.get('/budgets');
        setBudgets(response.data);
      } catch (error) {
        console.error('Failed to fetch budgets', error);
      } finally {
        setLoading(false);
      }
    };
    fetchBudgets();
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-display font-bold">Financial Clarity</h1>
        <p className="text-gray-500 mt-1">Sophisticated tracking of your event investments</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="glass-card p-10 rounded-3xl bg-primary text-white col-span-1 md:col-span-2">
          <div className="flex justify-between items-start mb-12">
            <div>
              <p className="text-primary-container font-bold uppercase tracking-widest text-sm mb-2">Total Managed Investment</p>
              <h2 className="text-6xl font-display font-bold">₹0.00</h2>
            </div>
            <Wallet size={48} className="opacity-20" />
          </div>
          
          <div className="grid grid-cols-2 gap-8 pt-8 border-t border-white/10">
            <div>
              <p className="text-primary-container text-xs font-bold uppercase tracking-widest mb-1">Spent to Date</p>
              <p className="text-2xl font-bold font-display text-white">₹0.00</p>
            </div>
            <div>
              <p className="text-primary-container text-xs font-bold uppercase tracking-widest mb-1">Remaining Balance</p>
              <p className="text-2xl font-bold font-display text-white">₹0.00</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-10 rounded-3xl">
          <h3 className="text-xl font-display font-bold mb-6">Allocation</h3>
          <div className="space-y-6">
            <div className="text-center py-10 text-gray-400 italic text-sm">
              Create an event to start tracking budget allocation.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BudgetPage;
