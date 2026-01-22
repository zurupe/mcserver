import React, { useState, useEffect } from 'react';
import { Copy, Users, Check, Wifi, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const ServerCard = ({ name, ip, fallbackDesc, isBedrock = false }) => {
  const [serverData, setServerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false); // Nuevo estado para errores

  // Usamos mcstatus.io que es más estable con certificados SSL
  const apiUrl = isBedrock 
    ? `https://api.mcstatus.io/v2/status/bedrock/${ip}` 
    : `https://api.mcstatus.io/v2/status/java/${ip}`;

  useEffect(() => {
    fetch(apiUrl)
      .then((res) => {
        if (!res.ok) throw new Error("Error en la red");
        return res.json();
      })
      .then((data) => {
        console.log(`Datos de ${name}:`, data);
        setServerData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error obteniendo datos:", err);
        setError(true);
        setLoading(false);
      });
  }, [ip]);

  const handleCopy = () => {
    navigator.clipboard.writeText(ip);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
      className="bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-700 hover:border-indigo-500 transition-all duration-300 max-w-md w-full flex flex-col"
    >
      <div className="flex items-center gap-4 mb-4">
        {/* Icono */}
        <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-900 flex-shrink-0 border border-slate-600 relative">
          {loading ? (
            <div className="w-full h-full animate-pulse bg-slate-700" />
          ) : (
            <img 
              // Esta API devuelve el icono directamente en base64 si existe, si no ponemos uno por defecto
              src={serverData?.icon ? serverData.icon : `https://api.mcstatus.io/v2/icon/${ip}`} 
              alt={name} 
              className="w-full h-full object-cover"
              onError={(e) => {e.target.style.display = 'none'}} // Si falla, se oculta
            />
          )}
          {/* Si falla la imagen principal, mostramos un backup detrás */}
          {!loading && !serverData?.icon && (
             <div className="absolute inset-0 flex items-center justify-center text-slate-600 font-bold bg-slate-900">MC</div>
          )}
        </div>
        
        <div>
          <h2 className="text-xl font-bold text-white">{name}</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className={`w-2 h-2 rounded-full ${serverData?.online ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500'}`}></span>
            <span className="text-sm text-slate-400 font-medium">
              {loading ? "Ping..." : serverData?.online ? "En línea" : "Desconectado"}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-slate-900/30 p-3 rounded-lg mb-4 flex-grow border border-slate-700/50">
        <p className="text-slate-300 text-sm leading-relaxed italic">
          "{getDescription()}"
        </p>
      </div>

      <div className="flex items-center justify-between bg-slate-900 p-3 rounded-lg mb-4">
        <div className="flex items-center gap-2 text-slate-400">
          <Wifi size={16} />
          <span className="text-xs font-mono truncate max-w-[150px]">{ip}</span>
        </div>
        <div className="flex items-center gap-2 text-indigo-400 font-semibold">
          <Users size={16} />
          {/* Adaptado para la estructura de mcstatus.io */}
          <span>{serverData?.players?.online || 0}</span>
          <span className="text-slate-500 text-xs font-normal">/ {serverData?.players?.max || 20}</span>
        </div>
      </div>

      <button
        onClick={handleCopy}
        className={`w-full py-3 px-4 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all duration-200 shadow-md ${
          copied 
            ? 'bg-green-600 text-white translate-y-0.5' 
            : 'bg-indigo-600 hover:bg-indigo-500 text-white hover:-translate-y-0.5'
        }`}
      >
        {copied ? <Check size={18} /> : <Copy size={18} />}
        {copied ? "¡COPIADO!" : "COPIAR IP"}
      </button>
    </motion.div>
  );
};

function App() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 selection:bg-indigo-500 selection:text-white">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-black text-white mb-2 tracking-tight">
          MIS SERVIDORES
        </h1>
        <div className="h-1 w-24 bg-indigo-500 mx-auto rounded-full"></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl justify-items-center">
        
        <ServerCard 
          name="ZhuruServer"
          ip="nice-include.gl.joinmc.link"
          fallbackDesc="El servidor está desconectado temporalmente. ¡Vuelve pronto!"
        />

        <ServerCard 
          name="Kaletania"
          ip="de-cute.gl.joinmc.link"
          fallbackDesc="El servidor está descansando. Intenta copiar la IP y entrar."
        />
        
      </div>
      
      <footer className="mt-16 text-slate-700 text-xs uppercase font-bold tracking-widest">
        Status System v2.0
      </footer>
    </div>
  );
}

export default App;