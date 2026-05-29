import React, { useState, useEffect } from 'react';
import { Copy, Users, Check, Wifi, Lock, KeyRound } from 'lucide-react';
import { motion } from 'framer-motion';

const ServerCard = ({ id, name, ip, fallbackDesc, isBedrock = false, isLocked = false }) => {
  const [serverData, setServerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);
  
  const [unlocked, setUnlocked] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [realIp, setRealIp] = useState(ip);

  useEffect(() => {
    setRealIp(ip);
  }, [ip]);

  useEffect(() => {
    // If locked and not unlocked, fetch status from backend proxy
    // If unlocked or not locked, fetch directly using realIp
    const apiUrl = (isLocked && !unlocked) 
      ? `/api/status/${id}` 
      : (isBedrock
        ? `https://api.mcstatus.io/v2/status/bedrock/${realIp}`
        : `https://api.mcstatus.io/v2/status/java/${realIp}`);

    // If it's a direct fetch but realIp is missing (shouldn't happen unless locked and not unlocked), skip
    if (!apiUrl.includes('undefined') && !apiUrl.includes('null')) {
      fetch(apiUrl)
        .then((res) => {
          if (!res.ok) throw new Error("Error en la red");
          return res.json();
        })
        .then((data) => {
          setServerData(data);
          setLoading(false);
        })
        .catch((err) => {
          setError(true);
          setLoading(false);
        });
    }
  }, [id, isBedrock, realIp, isLocked, unlocked]);

  const handleCopy = () => {
    if (isLocked && !unlocked) {
      setShowPasswordPrompt(true);
      return;
    }
    navigator.clipboard.writeText(realIp);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/servers/${id}/unlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput })
      });
      
      if (res.ok) {
        const data = await res.json();
        setRealIp(data.ip);
        setUnlocked(true);
        setShowPasswordPrompt(false);
        setPasswordError(false);
        
        navigator.clipboard.writeText(data.ip);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        setPasswordError(true);
        setTimeout(() => setPasswordError(false), 1000);
      }
    } catch (_err) {
      setPasswordError(true);
      setTimeout(() => setPasswordError(false), 1000);
    }
  };

  const displayIp = (isLocked && !unlocked) ? '[ IP PROTEGIDA ]' : realIp;

  const getDescription = () => {
    if (loading) return "Conectando con el satélite...";
    if (error) return fallbackDesc;
    if (!serverData?.online) return fallbackDesc;

    // La nueva API devuelve el MOTD limpio aquí
    return serverData.motd?.clean || fallbackDesc;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="glass rounded-xl p-6 hover:glow-forge transition-all duration-300 max-w-md w-full flex flex-col hover:border-forge-500/40"
    >
      <div className="flex items-center gap-4 mb-4">
        {/* Icono */}
        <div className="w-16 h-16 rounded-lg overflow-hidden bg-obsidian-900 flex-shrink-0 border border-obsidian-700 relative">
          {loading ? (
            <div className="w-full h-full animate-pulse bg-obsidian-800" />
          ) : (
            <img
              // Esta API devuelve el icono directamente en base64 si existe, si no ponemos uno por defecto
              src={serverData?.icon ? serverData.icon : `https://api.mcstatus.io/v2/icon/${realIp}`}
              alt={name}
              className="w-full h-full object-cover"
              onError={(e) => { e.target.style.display = 'none' }} // Si falla, se oculta
            />
          )}
          {/* Si falla la imagen principal, mostramos un backup detrás */}
          {!loading && !serverData?.icon && (
            <div className="absolute inset-0 flex items-center justify-center text-obsidian-600 font-bold bg-obsidian-900">MC</div>
          )}
        </div>

        <div>
          <h2 className="text-xl font-bold text-ash-100">{name}</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className={`w-2 h-2 rounded-full ${serverData?.online ? 'bg-ember-500 animate-pulse-glow' : 'bg-obsidian-600'}`}></span>
            <span className="text-sm text-obsidian-400 font-medium">
              {loading ? "Ping..." : serverData?.online ? "En línea" : "Desconectado"}
            </span>
          </div>
        </div>
      </div>

      <div className="mb-4 flex-grow border-l-2 border-forge-500/50 pl-3 py-1">
        <p className="text-obsidian-300 text-sm leading-relaxed">
          {getDescription()}
        </p>
      </div>

      <div className="flex items-center justify-between bg-obsidian-950/50 p-3 rounded-lg mb-4 border border-obsidian-800/50">
        <div className="flex items-center gap-2 text-obsidian-400">
          {isLocked && !unlocked ? <Lock size={16} className="text-obsidian-400" /> : <Wifi size={16} />}
          <span className={`text-xs font-mono truncate max-w-[150px] ${isLocked && !unlocked ? 'text-obsidian-400 font-bold' : ''}`}>
            {displayIp}
          </span>
        </div>
        <div className="flex items-center gap-2 text-forge-400 font-semibold">
          <Users size={16} />
          {/* Adaptado para la estructura de mcstatus.io */}
          <span>{serverData?.players?.online || 0}</span>
          <span className="text-obsidian-600 text-xs font-normal">/ {serverData?.players?.max || 20}</span>
        </div>
      </div>

      {showPasswordPrompt ? (
        <form onSubmit={handlePasswordSubmit} className="flex gap-2">
          <div className="relative flex-grow">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <KeyRound size={16} className={passwordError ? "text-ember-500" : "text-obsidian-400"} />
            </div>
            <input 
              type="password" 
              autoFocus
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Contraseña..."
              className={`w-full bg-obsidian-900 text-ash-100 text-sm rounded-lg block pl-9 p-3 outline-none border transition-colors ${
                passwordError ? 'border-ember-500 ring-1 ring-ember-500' : 'border-obsidian-700 focus:border-forge-500'
              }`}
            />
          </div>
          <button
            type="submit"
            className="bg-gradient-to-r from-forge-600 to-forge-500 hover:brightness-110 text-white font-bold px-4 rounded-lg transition-all shadow-[0_0_15px_rgba(192,110,59,0.2)]"
          >
            Ver
          </button>
        </form>
      ) : (
        <button
          onClick={handleCopy}
          className={`w-full py-3 px-4 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all duration-300 shadow-md group ${
            copied 
              ? 'bg-[#4ade80] text-obsidian-950 scale-95' 
              : (isLocked && !unlocked)
                ? 'bg-transparent hover:bg-obsidian-800 text-ash-100 border border-obsidian-700 hover:border-obsidian-600 hover:-translate-y-0.5'
                : 'bg-gradient-to-r from-forge-600 to-forge-500 text-white hover:shadow-[0_0_15px_rgba(192,110,59,0.4)] hover:-translate-y-0.5 hover:brightness-110'
          }`}
        >
          {copied ? <Check size={18} /> : (isLocked && !unlocked ? <Lock size={18} className="transition-transform group-hover:rotate-12" /> : <Copy size={18} />)}
          {copied ? "¡COPIADO!" : (isLocked && !unlocked ? "DESBLOQUEAR IP" : "COPIAR IP")}
        </button>
      )}
    </motion.div>
  );
};

export default ServerCard;
