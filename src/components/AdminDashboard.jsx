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
    } catch (err) {
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
    } catch (err) {
      setStatus({ type: 'error', message: 'Error de conexión al servidor' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white flex items-center gap-3">
            <Server className="text-indigo-500" size={32} />
            Panel de Control
          </h2>
          <p className="text-slate-400 mt-1">Gestiona los servidores de la red</p>
        </div>
        <button
          onClick={onLogout}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg transition-colors border border-slate-700"
        >
          <LogOut size={18} />
          Salir
        </button>
      </div>

      <div className="bg-slate-800 rounded-xl p-8 shadow-lg border border-slate-700 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            {editingId ? <Edit2 className="text-indigo-400" /> : <Plus className="text-indigo-400" />}
            {editingId ? 'Editar Servidor' : 'Registrar Servidor'}
          </h3>
          {editingId && (
            <button 
              onClick={resetForm}
              className="text-slate-400 hover:text-white flex items-center gap-1 text-sm bg-slate-700/50 px-3 py-1 rounded-md"
            >
              <X size={14} /> Cancelar edición
            </button>
          )}
        </div>

        {status.message && (
          <div className={`p-4 rounded-lg mb-6 flex items-center gap-3 ${
            status.type === 'error' 
              ? 'bg-red-500/10 border border-red-500/50 text-red-400'
              : 'bg-green-500/10 border border-green-500/50 text-green-400'
          }`}>
            {status.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
            <p>{status.message}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-slate-400 text-xs font-bold mb-2 uppercase tracking-wider">
                Nombre del Servidor
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-3 outline-none transition-colors"
                placeholder="Ej. Mi Servidor Survival"
                required
              />
            </div>
            
            <div>
              <label className="block text-slate-400 text-xs font-bold mb-2 uppercase tracking-wider">
                Dirección IP / Dominio
              </label>
              <input
                type="text"
                value={ip}
                onChange={(e) => setIp(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-3 outline-none transition-colors font-mono"
                placeholder="mc.mine.net"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 text-xs font-bold mb-2 uppercase tracking-wider">
              Mensaje por Defecto (Fallback)
            </label>
            <input
              type="text"
              value={fallbackDesc}
              onChange={(e) => setFallbackDesc(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-3 outline-none transition-colors"
              placeholder="El servidor está temporalmente inactivo..."
            />
          </div>

          <div className="flex items-center mt-2">
            <input
              id="isBedrock"
              type="checkbox"
              checked={isBedrock}
              onChange={(e) => setIsBedrock(e.target.checked)}
              className="w-4 h-4 text-indigo-600 bg-slate-900 border-slate-700 rounded focus:ring-indigo-500 focus:ring-2"
            />
            <label htmlFor="isBedrock" className="ml-2 text-sm font-medium text-slate-300">
              Es un servidor de Minecraft Bedrock Edition
            </label>
          </div>

          <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-slate-700/50">
            <div className="flex items-center">
              <input
                id="isLocked"
                type="checkbox"
                checked={isLocked}
                onChange={(e) => setIsLocked(e.target.checked)}
                className="w-4 h-4 text-indigo-600 bg-slate-900 border-slate-700 rounded focus:ring-indigo-500 focus:ring-2"
              />
              <label htmlFor="isLocked" className="ml-2 text-sm font-medium text-slate-300 flex items-center gap-1">
                <Lock size={14} className="text-indigo-400" /> Servidor Privado (Bloquear IP con Contraseña)
              </label>
            </div>
            
            {isLocked && (
              <div className="pl-6 mt-2">
                <input
                  type="text"
                  value={lockPassword}
                  onChange={(e) => setLockPassword(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full md:w-1/2 p-3 outline-none transition-colors"
                  placeholder="Contraseña de acceso..."
                  required={isLocked}
                />
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-700">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-lg transition-all shadow-[0_0_15px_rgba(79,70,229,0.3)] flex justify-center items-center gap-2"
            >
              {editingId ? <Edit2 size={20} /> : <Plus size={20} />}
              {loading ? 'Guardando...' : (editingId ? 'Guardar Cambios' : 'Añadir Servidor')}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-slate-800 rounded-xl p-8 shadow-lg border border-slate-700">
        <h3 className="text-xl font-bold text-white mb-6">Servidores Registrados</h3>
        
        {(!servers || servers.length === 0) ? (
           <p className="text-slate-400 text-center py-4">No hay servidores registrados aún.</p>
        ) : (
          <div className="space-y-3">
            {servers.map((server) => (
              <div key={server.id} className="bg-slate-900/50 border border-slate-700 p-4 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h4 className="text-white font-bold flex items-center gap-2">
                    {server.name}
                    {server.isLocked === 1 && <Lock size={14} className="text-indigo-400" title="Privado" />}
                  </h4>
                  <p className="text-slate-400 text-sm font-mono mt-1">{server.ip} {server.isBedrock === 1 && <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded ml-2">Bedrock</span>}</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleEdit(server)}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded-md transition-colors text-sm"
                  >
                    <Edit2 size={16} /> Editar
                  </button>
                  <button 
                    onClick={() => handleDelete(server.id)}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-red-300 px-3 py-2 rounded-md transition-colors text-sm border border-red-500/30"
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
