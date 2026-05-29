import React, { useState, useEffect } from 'react';
import { Lock } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import ServerCard from './components/ServerCard';

function App() {
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('home'); // 'home', 'login', 'admin'
  const [token, setToken] = useState(localStorage.getItem('adminToken') || null);

  useEffect(() => {
    fetchServers();
  }, [token]); // Fetch servers when token changes to get real IPs if logged in

  const fetchServers = async () => {
    try {
      const headers = {};
      const currentToken = localStorage.getItem('adminToken');
      if (currentToken) {
        headers['Authorization'] = `Bearer ${currentToken}`;
      }
      const res = await fetch('/api/servers', { headers });
      const data = await res.json();
      setServers(data);
    } catch (err) {
      console.error('Error fetching servers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (newToken) => {
    setToken(newToken);
    setView('admin');
  };

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem('adminToken');
    setView('home');
  };

  return (
    <div className="min-h-screen bg-radial-forge dot-pattern flex flex-col items-center justify-center p-4 relative">
      {view === 'home' && (
        <button 
          onClick={() => setView(token ? 'admin' : 'login')}
          className="absolute top-4 right-4 text-obsidian-400 hover:text-forge-400 border border-transparent hover:border-obsidian-700 hover:bg-obsidian-900 hover:shadow-[0_0_15px_rgba(192,110,59,0.2)] rounded-full transition-all p-3"
          title="Acceso Administrativo"
        >
          <Lock size={20} />
        </button>
      )}

      <AnimatePresence mode="wait">
        {view === 'login' && (
          <motion.div 
            key="login"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full flex justify-center flex-grow items-center"
          >
            <Login onLogin={handleLogin} onCancel={() => setView('home')} />
          </motion.div>
        )}

        {view === 'admin' && (
          <motion.div 
            key="admin"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full flex justify-center flex-grow items-center"
          >
            <AdminDashboard 
              token={token} 
              onLogout={handleLogout} 
              servers={servers}
              onServerAdded={(newServer) => setServers([...servers, newServer])}
              onServerUpdated={(updatedServer) => setServers(servers.map(s => s.id === updatedServer.id ? updatedServer : s))}
              onServerDeleted={(deletedId) => setServers(servers.filter(s => s.id !== deletedId))}
            />
          </motion.div>
        )}

        {view === 'home' && (
          <motion.div 
            key="home"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full flex flex-col items-center flex-grow"
          >
          <div className="text-center mb-14 mt-12 relative">
            <h1 className="text-5xl md:text-6xl font-extrabold text-white mb-3 tracking-tighter">
              MIS SERVIDORES
            </h1>
            <div className="h-1.5 w-32 bg-gradient-to-r from-forge-600 via-forge-400 to-transparent mx-auto rounded-l-full"></div>
            <p className="text-obsidian-400 text-sm tracking-[0.2em] uppercase mt-4 font-medium">
              Estado en tiempo real
            </p>
          </div>

          {loading ? (
            <div className="text-obsidian-300 flex items-center gap-3">
              <div className="w-6 h-6 border-2 border-forge-500 border-t-transparent rounded-full animate-spin"></div>
              Cargando servidores de la red...
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl justify-items-center">
              {servers.length === 0 ? (
                <p className="text-slate-500 col-span-full">No hay servidores registrados en la base de datos.</p>
              ) : (
                servers.map((server) => (
                  <ServerCard
                    key={server.id}
                    id={server.id}
                    name={server.name}
                    ip={server.ip}
                    fallbackDesc={server.fallbackDesc}
                    isBedrock={server.isBedrock === 1}
                    isLocked={server.isLocked === 1}
                  />
                ))
              )}
            </div>
          )}
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="w-full max-w-lg h-px bg-gradient-to-r from-transparent via-obsidian-700/50 to-transparent mt-16 mb-6"></div>
      <footer className="text-obsidian-400 text-xs uppercase font-bold tracking-[0.3em] hover:text-obsidian-300 transition-colors pb-4">
        Zhuru Mc_Servers v3.0 {view === 'home' && <span className="text-forge-500/80">|</span>} {view === 'home' && 'Sistema en Vivo'}
      </footer>
    </div>
  );
}

export default App;