import React, { useState } from 'react';
import { Lock, User, KeyRound, AlertCircle } from 'lucide-react';

const Login = ({ onLogin, onCancel }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('adminToken', data.token);
        onLogin(data.token);
      } else {
        setError(data.error || 'Credenciales inválidas');
      }
    } catch (err) {
      setError('Error de conexión al servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass rounded-xl p-8 shadow-2xl w-full max-w-md relative overflow-hidden">
      {/* Decorative top line */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-forge-600 via-forge-500 to-forge-400"></div>

      <div className="flex flex-col items-center mb-6">
        <div className="w-16 h-16 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-obsidian-800 to-obsidian-900 rounded-full flex items-center justify-center mb-4 border border-forge-500/30 shadow-[0_0_15px_rgba(192,110,59,0.15)]">
          <Lock className="text-forge-400" size={32} />
        </div>
        <h2 className="text-2xl font-bold text-ash-100">Acceso Restringido</h2>
        <p className="text-obsidian-400 text-sm mt-1">Ingresa tus credenciales de administrador</p>
      </div>

      {error && (
        <div className="bg-ember-500/10 border border-ember-500/50 rounded-lg p-3 mb-6 flex items-center gap-2 text-ember-500 text-sm">
          <AlertCircle size={16} className="flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-obsidian-400 text-xs font-bold mb-2 uppercase tracking-wider">
            Usuario
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors group-focus-within:text-forge-500">
              <User size={18} className="text-obsidian-400 transition-colors group-focus-within:text-forge-500" />
            </div>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="bg-obsidian-900/50 border-b border-obsidian-700 text-ash-100 text-sm rounded-t-lg focus:bg-obsidian-900 focus:border-forge-500 block w-full pl-10 p-3 outline-none transition-all"
              placeholder="username"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-obsidian-400 text-xs font-bold mb-2 uppercase tracking-wider">
            Contraseña
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors group-focus-within:text-forge-500">
              <KeyRound size={18} className="text-obsidian-400 transition-colors group-focus-within:text-forge-500" />
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-obsidian-900/50 border-b border-obsidian-700 text-ash-100 text-sm rounded-t-lg focus:bg-obsidian-900 focus:border-forge-500 block w-full pl-10 p-3 outline-none transition-all"
              placeholder="••••••••"
              required
            />
          </div>
        </div>

        <div className="pt-4 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-transparent border border-obsidian-600 text-obsidian-300 hover:bg-obsidian-800/50 hover:text-ash-100 font-bold py-3 px-4 rounded-lg transition-all"
          >
            Volver
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-gradient-to-r from-forge-600 to-forge-500 hover:brightness-110 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-lg transition-all shadow-[0_0_15px_rgba(192,110,59,0.3)]"
          >
            {loading ? 'Verificando...' : 'Entrar'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Login;
