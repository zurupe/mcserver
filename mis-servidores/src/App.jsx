import React, { useState, useEffect } from 'react';
import { Lock } from 'lucide-react';
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
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 selection:bg-indigo-500 selection:text-white relative">
      {view === 'home' && (
        <button 
          onClick={() => setView(token ? 'admin' : 'login')}
          className="absolute top-4 right-4 text-slate-700 hover:text-indigo-400 transition-colors p-2"
          title="Acceso Administrativo"
        >
          <Lock size={20} />
        </button>
      )}

      {view === 'login' && (
        <div className="w-full flex justify-center flex-grow items-center">
          <Login onLogin={handleLogin} onCancel={() => setView('home')} />
        </div>
      )}

      {view === 'admin' && (
        <div className="w-full flex justify-center flex-grow items-center">
          <AdminDashboard 
            token={token} 
            onLogout={handleLogout} 
            servers={servers}
            onServerAdded={(newServer) => setServers([...servers, newServer])}
            onServerUpdated={(updatedServer) => setServers(servers.map(s => s.id === updatedServer.id ? updatedServer : s))}
            onServerDeleted={(deletedId) => setServers(servers.filter(s => s.id !== deletedId))}
          />
        </div>
      )}

      {view === 'home' && (
        <>
          <div className="text-center mb-12 mt-8">
            <h1 className="text-5xl font-black text-white mb-2 tracking-tight">
              MIS SERVIDORES
            </h1>
            <div className="h-1 w-24 bg-indigo-500 mx-auto rounded-full"></div>
          </div>

          {loading ? (
            <div className="text-slate-400 flex items-center gap-2">
              <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
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
        </>
      )}
      
      <footer className="mt-16 text-slate-700 text-xs uppercase font-bold tracking-widest">
        Zhuru Mc_Servers v3.0 {view === 'home' && '| Sistema en Vivo'}
      </footer>
    </div>
  );
}

export default App;