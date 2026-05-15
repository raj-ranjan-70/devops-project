import { Outlet, Link, useLocation } from 'react-router-dom';

const PublicLayout = () => {
  const location = useLocation();
  const isAuthPage = ['/login', '/signup'].includes(location.pathname);

  return (
    <div className="min-h-screen bg-background">
      {!isAuthPage && (
        <nav className="absolute top-0 left-0 right-0 h-24 px-8 md:px-16 flex items-center justify-between bg-white/10 backdrop-blur-md border-b border-white/20 z-[100]">
          <Link to="/" className="text-3xl font-display font-bold text-primary drop-shadow-sm">Aura</Link>

          <div className="hidden md:flex items-center space-x-12">
            <Link to="/#features" className="font-bold text-gray-800 hover:text-primary transition-colors">Features</Link>
            <Link to="/#vendors" className="font-bold text-gray-800 hover:text-primary transition-colors">Vendors</Link>
            <Link to="/login" className="font-bold text-gray-800 hover:text-primary transition-colors">Log In</Link>
            <Link to="/signup" className="elegant-button-primary shadow-2xl">Get Started</Link>
          </div>
        </nav>
      )}

      <main>
        <Outlet />
      </main>

      <footer className="bg-white py-16 px-8 md:px-16 border-t border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 max-w-7xl mx-auto">
          <div className="col-span-1 md:col-span-1">
            <h3 className="text-2xl font-display font-bold text-primary mb-6">Aura</h3>
            <p className="text-gray-500 leading-relaxed">
              Experience the prestige of luxury event planning with our beautifully designed concierge dashboard.
            </p>
          </div>
          {/* Footer links placeholder */}
        </div>
        <div className="mt-16 pt-8 border-t border-gray-100 text-center text-gray-400 text-sm">
          &copy; 2026 Aura Events Dashboard. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default PublicLayout;
