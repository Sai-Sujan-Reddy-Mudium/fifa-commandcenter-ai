import React, { useState, useEffect } from 'react';
import { ShieldAlert, AlertTriangle, AlertCircle, Info, CheckCircle2, Activity, Settings, Radio } from 'lucide-react';

const SEVERITY_COLORS = {
  CRITICAL: 'border-red-500 text-red-400 bg-red-950/30',
  HIGH: 'border-orange-500 text-orange-400 bg-orange-950/30',
  MEDIUM: 'border-yellow-500 text-yellow-400 bg-yellow-950/30',
  LOW: 'border-blue-500 text-blue-400 bg-blue-950/30',
};

const SEVERITY_ICONS = {
  CRITICAL: <ShieldAlert className="w-5 h-5 text-red-500" />,
  HIGH: <AlertTriangle className="w-5 h-5 text-orange-500" />,
  MEDIUM: <AlertCircle className="w-5 h-5 text-yellow-500" />,
  LOW: <Info className="w-5 h-5 text-blue-500" />,
};

export default function App() {
  const [incidents, setIncidents] = useState([]);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [manualAlertText, setManualAlertText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 0. Hydrate initial state
  useEffect(() => {
    const fetchIncidents = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/incidents`);
        if (res.ok) {
          const data = await res.json();
          setIncidents(data);
        }
      } catch (e) {
        console.error("Failed to fetch initial incidents:", e);
      }
    };
    fetchIncidents();
  }, []);

  // 1. Establish and maintain the real-time SSE stream
  useEffect(() => {
    const eventSource = new EventSource(`${import.meta.env.VITE_API_BASE_URL}/api/incidents/stream`);

    eventSource.onopen = () => setIsConnected(true);
    eventSource.onerror = () => setIsConnected(false);

    eventSource.onmessage = (event) => {
      try {
        const newIncident = JSON.parse(event.data);
        setIncidents(prev => {
          if (prev.some(i => i.id === newIncident.id)) return prev;
          return [newIncident, ...prev];
        });
      } catch (e) {
        console.error("Failed to parse incident data:", e);
      }
    };

    return () => {
      eventSource.close();
    }
  }, []);

  // 2. Auto-purge resolved incidents after 45 seconds
  useEffect(() => {
    const timeouts = [];

    incidents.forEach((incident) => {
      if (incident.status === 'RESOLVED') {
        const timer = setTimeout(() => {
          setIncidents((prev) => prev.filter((inc) => inc.id !== incident.id));
          if (selectedIncident && selectedIncident.id === incident.id) {
            setSelectedIncident(null);
          }
        }, 45000);
        timeouts.push(timer);
      }
    });

    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, [incidents, selectedIncident]);

  const resolveIncident = async (id) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/incidents/${id}/resolve`, {
        method: 'PUT'
      });
      if (response.ok) {
        setIncidents(prev => prev.map(inc => 
          inc.id === id ? { ...inc, status: 'RESOLVED' } : inc
        ));
        if (selectedIncident?.id === id) {
          setSelectedIncident(prev => ({ ...prev, status: 'RESOLVED' }));
        }
        
        setTimeout(() => {
          setIncidents((prev) => prev.filter((inc) => inc.id !== id));
          setSelectedIncident(prevSelected => 
            prevSelected?.id === id ? null : prevSelected
          );
        }, 15000);
      }
    } catch (e) {
      console.error("Failed to resolve incident:", e);
    }
  };

  const activeIncidents = incidents.filter(i => i.status !== 'RESOLVED');
  const criticalCount = activeIncidents.filter(i => i.severity === 'CRITICAL').length;
  
  const categoryCounts = activeIncidents.reduce((acc, curr) => {
    acc[curr.category] = (acc[curr.category] || 0) + 1;
    return acc;
  }, {});
  
  const maxCategoryCount = Math.max(...Object.values(categoryCounts), 1);

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 overflow-hidden font-sans">
      
      {/* COLUMN 1: Live Feed */}
      <div className="w-1/3 border-r border-slate-800 flex flex-col bg-slate-900/50">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900">
          <div className="flex items-center space-x-3">
            <Radio className={`w-5 h-5 ${isConnected ? 'text-green-500 animate-pulse' : 'text-red-500'}`} />
            <h1 className="text-xl font-bold tracking-wider uppercase text-slate-100">Live Feed</h1>
          </div>
          <span className="text-xs font-mono bg-slate-800 px-2 py-1 rounded text-slate-400">
            {activeIncidents.length} ACTIVE
          </span>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {incidents.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-500 font-mono text-sm">
              WAITING FOR TELEMETRY...
            </div>
          ) : (
            incidents.map((incident) => (
              <div 
                key={incident.id}
                onClick={() => setSelectedIncident(incident)}
                className={`p-4 rounded-md border-l-4 cursor-pointer transition-all duration-200 hover:bg-slate-800 
                  ${SEVERITY_COLORS[incident.severity] || 'border-slate-500 bg-slate-900/30'}
                  ${selectedIncident?.id === incident.id ? 'ring-1 ring-slate-600 bg-slate-800 shadow-lg' : 'opacity-80'}
                  ${incident.status === 'RESOLVED' ? 'opacity-40 grayscale' : ''}
                `}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center space-x-2">
                    {SEVERITY_ICONS[incident.severity]}
                    <span className="text-xs font-bold font-mono uppercase tracking-wider">{incident.severity}</span>
                  </div>
                  <span className="text-xs font-mono text-slate-500">
                    {incident.created_at ? new Date(incident.created_at).toLocaleTimeString() : 'N/A'}
                  </span>
                </div>
                <h3 className="font-semibold text-slate-100 mb-1 leading-snug">{incident.title}</h3>
                <div className="flex justify-between items-center mt-3">
                  <span className="text-xs px-2 py-1 bg-slate-950 rounded-full text-slate-400 border border-slate-800">
                    {incident.category}
                  </span>
                  {incident.status === 'RESOLVED' && (
                    <span className="text-xs flex items-center text-green-500 font-mono">
                      <CheckCircle2 className="w-3 h-3 mr-1" /> RESOLVED
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* COLUMN 2: Deep Dive */}
      <div className="w-1/3 border-r border-slate-800 flex flex-col bg-slate-950">
        <div className="p-4 border-b border-slate-800 bg-slate-900">
          <h2 className="text-xl font-bold tracking-wider uppercase flex items-center text-slate-100">
            <Activity className="w-5 h-5 mr-3 text-cyan-500" />
            AI Deep-Dive
          </h2>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {!selectedIncident ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-4">
              <ShieldAlert className="w-16 h-16 opacity-20" />
              <p className="font-mono text-sm uppercase tracking-widest">Select Incident to Analyze</p>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div>
                <div className="flex items-center space-x-3 mb-4">
                  {SEVERITY_ICONS[selectedIncident.severity]}
                  <h2 className="text-2xl font-bold text-slate-100 leading-tight">
                    {selectedIncident.title}
                  </h2>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-slate-900 p-3 rounded border border-slate-800">
                    <span className="block text-xs font-mono text-slate-500 mb-1">STATUS</span>
                    <span className={`font-bold ${selectedIncident.status === 'RESOLVED' ? 'text-green-500' : 'text-red-400'}`}>
                      {selectedIncident.status}
                    </span>
                  </div>
                  <div className="bg-slate-900 p-3 rounded border border-slate-800">
                    <span className="block text-xs font-mono text-slate-500 mb-1">CATEGORY</span>
                    <span className="font-bold text-slate-300">{selectedIncident.category}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800">
                  <h3 className="text-sm font-mono text-cyan-500 mb-2 uppercase tracking-wider flex items-center">
                    <Info className="w-4 h-4 mr-2" /> LIVE REPORT DETAIL
                  </h3>
                  <p className="text-slate-300 text-sm leading-relaxed">{selectedIncident.description}</p>
                </div>

                {selectedIncident.recommended_action && (
                  <div className="bg-slate-900 p-4 rounded-lg border border-orange-900/50 ring-1 ring-orange-500/30">
                    <h3 className="text-sm font-mono text-orange-400 mb-2 uppercase tracking-wider flex items-center">
                      <Activity className="w-4 h-4 mr-2" /> RECOMMENDED ACTION DIRECTIVE
                    </h3>
                    <p className="text-slate-200 text-sm leading-relaxed bg-slate-950 p-3 rounded border border-orange-800/50 shadow-inner">
                      {selectedIncident.recommended_action}
                    </p>
                  </div>
                )}

                {selectedIncident.announcement && (
                  <div className="bg-blue-950/20 p-4 rounded-lg border border-blue-900/40">
                    <h3 className="text-sm font-mono text-blue-400 mb-4 uppercase tracking-wider flex items-center">
                      <Radio className="w-4 h-4 mr-2" /> MULTILINGUAL PA BROADCAST
                    </h3>
                    <div className="space-y-3">
                      {selectedIncident.announcement.split('|').map((part, index) => {
                        const [lang, ...textParts] = part.split(':');
                        const text = textParts.join(':').trim();
                        if (!lang || !text) return null;
                        return (
                          <div key={index} className="bg-slate-950 border-l-4 border-blue-500 rounded-r overflow-hidden shadow-inner flex flex-col">
                            <div className="bg-slate-900/80 px-4 py-1 border-b border-slate-800">
                              <h4 className="text-xs font-mono text-blue-400 uppercase tracking-widest">{lang.trim()}</h4>
                            </div>
                            <div className="font-serif italic text-blue-100 text-base leading-relaxed px-4 py-3">
                              "{text}"
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="pt-6">
                <button 
                  onClick={() => resolveIncident(selectedIncident.id)}
                  disabled={selectedIncident.status === 'RESOLVED'}
                  className={`w-full py-3 px-4 rounded font-bold tracking-widest uppercase transition-all duration-300
                    ${selectedIncident.status === 'RESOLVED' 
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                      : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_15px_rgba(8,145,178,0.4)]'
                    }`}
                >
                  {selectedIncident.status === 'RESOLVED' ? 'Incident Resolved' : 'Execute Resolution'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* COLUMN 3: Intelligence Summary */}
      <div className="w-1/3 flex flex-col bg-slate-900/50">
        <div className="p-4 border-b border-slate-800 bg-slate-900">
          <h2 className="text-xl font-bold tracking-wider uppercase flex items-center text-slate-100">
            <Settings className="w-5 h-5 mr-3 text-slate-400" />
            Intelligence
          </h2>
        </div>
        
        <div className="p-6 space-y-8 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-900 p-6 rounded-lg border border-slate-800 flex flex-col items-center justify-center shadow-inner">
              <span className="text-5xl font-light text-cyan-400 mb-2">{activeIncidents.length}</span>
              <span className="text-xs font-mono text-slate-400 uppercase tracking-widest">Active Issues</span>
            </div>
            <div className="bg-slate-900 p-6 rounded-lg border border-slate-800 flex flex-col items-center justify-center shadow-inner relative overflow-hidden">
              {criticalCount > 0 && <div className="absolute inset-0 bg-red-500/10 animate-pulse"></div>}
              <span className={`text-5xl font-light mb-2 relative z-10 ${criticalCount > 0 ? 'text-red-500' : 'text-slate-500'}`}>
                {criticalCount}
              </span>
              <span className="text-xs font-mono text-slate-400 uppercase tracking-widest relative z-10">Critical</span>
            </div>
          </div>

          <div className="bg-slate-900 p-6 rounded-lg border border-slate-800">
            <h3 className="text-sm font-mono text-slate-400 mb-6 uppercase tracking-widest border-b border-slate-800 pb-2">
              Category Density
            </h3>
            
            {Object.keys(categoryCounts).length === 0 ? (
              <div className="text-center text-slate-600 text-sm font-mono py-4">NO ACTIVE DATA</div>
            ) : (
              <div className="space-y-5">
                {Object.entries(categoryCounts)
                  .sort(([,a], [,b]) => b - a)
                  .map(([cat, count]) => {
                  const percentage = Math.round((count / maxCategoryCount) * 100);
                  return (
                    <div key={cat} className="space-y-2">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-slate-300">{cat}</span>
                        <span className="text-cyan-500">{count}</span>
                      </div>
                      <div className="h-2 bg-slate-950 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-cyan-600 rounded-full transition-all duration-1000 ease-out relative"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* FAB */}
      <button 
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-8 right-8 bg-cyan-600 hover:bg-cyan-500 text-white rounded-full p-4 shadow-lg shadow-cyan-900/50 transition-all duration-300 z-40 group"
      >
        <span className="flex items-center space-x-2 font-bold tracking-widest uppercase">
          <Activity className="w-5 h-5 group-hover:scale-110 transition-transform" />
          <span>Add Alert</span>
        </span>
      </button>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-800 bg-slate-950/50">
              <h2 className="text-xl font-bold tracking-wider uppercase flex items-center text-slate-100">
                <AlertTriangle className="w-5 h-5 mr-3 text-cyan-500" />
                Inject Manual Alert
              </h2>
            </div>
            <div className="p-6">
              <label className="block text-xs font-mono text-slate-400 mb-2 uppercase tracking-widest">
                Raw Event Telemetry
              </label>
              <textarea
                className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-slate-200 font-mono text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all min-h-[120px] resize-none"
                placeholder="Describe the incident..."
                value={manualAlertText}
                onChange={(e) => setManualAlertText(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setManualAlertText('');
                }}
                disabled={isSubmitting}
                className="px-4 py-2 rounded text-slate-400 hover:text-slate-200 font-bold uppercase tracking-widest text-sm transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!manualAlertText.trim()) return;
                  setIsSubmitting(true);
                  try {
                    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/incidents/manual`, {
                      method: 'POST',
                      headers: { 
                        'Content-Type': 'application/json'
                      },
                      body: JSON.stringify({ description: manualAlertText })
                    });
                    if (!res.ok) {
                      throw new Error('API Request Failed');
                    }
                    setIsModalOpen(false);
                    setManualAlertText('');
                  } catch (e) {
                    console.error("Error submitting manual alert", e);
                    alert("Failed to generate alert. The AI API might be rate-limited.");
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
                disabled={isSubmitting || !manualAlertText.trim()}
                className="px-6 py-2 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold uppercase tracking-widest text-sm shadow-[0_0_10px_rgba(8,145,178,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Processing...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
