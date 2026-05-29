import React, { useState } from 'react';
import { Server, Plus, AlertCircle, CheckCircle2, LogOut, Edit2, Trash2, X, Lock } from 'lucide-react';

const AdminDashboard = ({ token, onLogout, servers, onServerAdded, onServerUpdated, onServerDeleted }) => {
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [ip, setIp] = useState('');
  const [fallbackDesc, setFallbackDesc] = useState('');
  const [isBedrock, setIsBedrock] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [lockPassword, setLockPassword] = useState('');
  
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setIp('');
    setFallbackDesc('');
    setIsBedrock(false);
    setIsLocked(false);
    setLockPassword('');
    setStatus({ type: '', message: '' });
  };

  const handleEdit = (server) => {
    setEditingId(server.id);
    setName(server.name);
    setIp(server.ip);
    setFallbackDesc(server.fallbackDesc || '');
    setIsBedrock(server.isBedrock === 1);
    setIsLocked(server.isLocked === 1);
    setLockPassword(server.lockPassword || '');
    setStatus({ type: '', message: '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este servidor? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      const response = await fetch(`/api/servers/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        if (onServerDeleted) onServerDeleted(id);
        if (editingId === id) resetForm();
        setStatus({ type: 'success', message: 'Servidor eliminado correctamente.' });
      } else {
        if (response.status === 401 || response.status === 403) onLogout();
        const data = await response.json();
        setStatus({ type: 'error', message: data.error || 'Error al eliminar' });
      }
    } catch (_err) {
      setStatus({ type: 'error', message: 'Error de conexión al servidor' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: '', message: '' });

    const isEditing = editingId !== null;
    const url = isEditing ? `/api/servers/${editingId}` : '/api/servers';
    const method = isEditing ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name, ip, fallbackDesc, isBedrock, isLocked, lockPassword })
      });

      const data = await response.json();

      if (response.ok) {
        setStatus({ type: 'success', message: isEditing ? '¡Servidor actualizado!' : '¡Servidor añadido correctamente!' });
        
        if (isEditing) {
          if (onServerUpdated) onServerUpdated(data);
        } else {
          if (onServerAdded) onServerAdded(data);
        }
        
        resetForm();
      } else {
        if (response.status === 401 || response.status === 403) onLogout();
        setStatus({ type: 'error', message: data.error || 'Error al guardar' });
      }
    } catch (_err) {
      setStatus({ type: 'error', message: 'Error de conexión al servidor' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-extrabold text-ash-100 flex items-center gap-3">
            <Server className="text-forge-500" size={32} />
            Panel de Control
            <span className="text-xs ml-2 px-2 py-1 rounded bg-forge-500/10 text-forge-400 border border-forge-500/20 font-mono">
              {servers?.length || 0}
            </span>
          </h2>
          <p className="text-obsidian-400 mt-1">Gestiona los servidores de la red</p>
        </div>
        <button
          onClick={onLogout}
          className="flex items-center gap-2 bg-transparent border border-obsidian-600 hover:bg-obsidian-800/50 text-obsidian-300 hover:text-ash-100 px-4 py-2 rounded-lg transition-all"
        >
          <LogOut size={18} />
          Salir
        </button>
      </div>

      <div className="glass rounded-xl p-8 shadow-lg mb-8 relative overflow-hidden">
        {/* Decorative top line */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-forge-600 via-forge-500 to-forge-400"></div>

        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-ash-100 flex items-center gap-2">
            {editingId ? <Edit2 className="text-forge-400" /> : <Plus className="text-forge-400" />}
            {editingId ? 'Editar Servidor' : 'Registrar Servidor'}
          </h3>
          {editingId && (
            <button 
              onClick={resetForm}
              className="text-obsidian-400 hover:text-ash-100 flex items-center gap-1 text-sm bg-obsidian-800/50 px-3 py-1 rounded-md"
            >
              <X size={14} /> Cancelar edición
            </button>
          )}
        </div>

        {status.message && (
          <div className={`p-4 rounded-lg mb-6 flex items-center gap-3 ${
            status.type === 'error' 
              ? 'bg-ember-500/10 border border-ember-500/50 text-ember-500'
              : 'bg-[#4ade80]/10 border border-[#4ade80]/50 text-[#4ade80]'
          }`}>
            {status.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
            <p>{status.message}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-obsidian-400 text-xs font-bold mb-2 uppercase tracking-wider">
                Nombre del Servidor
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-obsidian-900/50 border-b border-obsidian-700 text-ash-100 text-sm rounded-t-lg focus:bg-obsidian-900 focus:border-forge-500 block w-full p-3 outline-none transition-all"
                placeholder="Ej. Mi Servidor Survival"
                required
              />
            </div>
            
            <div>
              <label className="block text-obsidian-400 text-xs font-bold mb-2 uppercase tracking-wider">
                Dirección IP / Dominio
              </label>
              <input
                type="text"
                value={ip}
                onChange={(e) => setIp(e.target.value)}
                className="bg-obsidian-900/50 border-b border-obsidian-700 text-ash-100 text-sm rounded-t-lg focus:bg-obsidian-900 focus:border-forge-500 block w-full p-3 outline-none transition-all font-mono"
                placeholder="mc.mine.net"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-obsidian-400 text-xs font-bold mb-2 uppercase tracking-wider">
              Mensaje por Defecto (Fallback)
            </label>
            <input
              type="text"
              value={fallbackDesc}
              onChange={(e) => setFallbackDesc(e.target.value)}
              className="bg-obsidian-900/50 border-b border-obsidian-700 text-ash-100 text-sm rounded-t-lg focus:bg-obsidian-900 focus:border-forge-500 block w-full p-3 outline-none transition-all"
              placeholder="El servidor está temporalmente inactivo..."
            />
          </div>

          <div className="flex items-center mt-2">
            <input
              id="isBedrock"
              type="checkbox"
              checked={isBedrock}
              onChange={(e) => setIsBedrock(e.target.checked)}
              className="w-4 h-4 text-forge-500 bg-obsidian-900 border-obsidian-700 rounded focus:ring-forge-500 focus:ring-2 accent-forge-500"
            />
            <label htmlFor="isBedrock" className="ml-2 text-sm font-medium text-obsidian-300">
              Es un servidor de Minecraft Bedrock Edition
            </label>
          </div>

          <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-obsidian-700/50">
            <div className="flex items-center">
              <input
                id="isLocked"
                type="checkbox"
                checked={isLocked}
                onChange={(e) => setIsLocked(e.target.checked)}
                className="w-4 h-4 text-forge-500 bg-obsidian-900 border-obsidian-700 rounded focus:ring-forge-500 focus:ring-2 accent-forge-500"
              />
              <label htmlFor="isLocked" className="ml-2 text-sm font-medium text-obsidian-300 flex items-center gap-1">
                <Lock size={14} className="text-forge-400" /> Servidor Privado (Bloquear IP con Contraseña)
              </label>
            </div>
            
            {isLocked && (
              <div className="pl-6 mt-2">
                <input
                  type="text"
                  value={lockPassword}
                  onChange={(e) => setLockPassword(e.target.value)}
                  className="bg-obsidian-900/50 border-b border-obsidian-700 text-ash-100 text-sm rounded-t-lg focus:bg-obsidian-900 focus:border-forge-500 block w-full md:w-1/2 p-3 outline-none transition-all"
                  placeholder="Contraseña de acceso..."
                  required={isLocked}
                />
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-obsidian-700">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-forge-600 to-forge-500 hover:brightness-110 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-lg transition-all shadow-[0_0_15px_rgba(192,110,59,0.3)] flex justify-center items-center gap-2"
            >
              {editingId ? <Edit2 size={20} /> : <Plus size={20} />}
              {loading ? 'Guardando...' : (editingId ? 'Guardar Cambios' : 'Añadir Servidor')}
            </button>
          </div>
        </form>
      </div>

      <div className="glass rounded-xl p-8 shadow-lg">
        <h3 className="text-xl font-bold text-ash-100 mb-6">Servidores Registrados</h3>
        
        {(!servers || servers.length === 0) ? (
           <p className="text-obsidian-400 text-center py-4">No hay servidores registrados aún.</p>
        ) : (
          <div className="space-y-3">
            {servers.map((server) => (
              <div key={server.id} className={`bg-obsidian-900/30 border border-obsidian-700 border-l-4 p-4 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:bg-obsidian-800/40 ${server.isLocked ? 'border-l-obsidian-600' : 'border-l-forge-500/50'}`}>
                <div>
                  <h4 className="text-ash-100 font-bold flex items-center gap-2">
                    {server.name}
                    {server.isLocked === 1 && <Lock size={14} className="text-forge-400" title="Privado" />}
                  </h4>
                  <p className="text-obsidian-400 text-sm font-mono mt-1">{server.ip} {server.isBedrock === 1 && <span className="text-xs bg-forge-500/20 text-forge-300 px-2 py-0.5 rounded ml-2">Bedrock</span>}</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleEdit(server)}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-transparent hover:bg-obsidian-800/50 text-obsidian-300 hover:text-ash-100 px-3 py-2 rounded-md transition-colors text-sm border border-obsidian-600"
                  >
                    <Edit2 size={16} /> Editar
                  </button>
                  <button 
                    onClick={() => handleDelete(server.id)}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-ember-500/10 hover:bg-ember-500/20 text-ember-500 hover:text-ember-400 px-3 py-2 rounded-md transition-colors text-sm border border-ember-500/30"
                  >
                    <Trash2 size={16} /> Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
