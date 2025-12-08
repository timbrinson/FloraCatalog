
import React, { useState, useMemo, useEffect } from 'react';
import { ActivityItem, ActivityStatus, SearchCandidate } from '../types';
import { 
    Loader2, CheckCircle2, XCircle, AlertTriangle, 
    Activity, Minimize2, Maximize2, RotateCcw, X, Play, Clock, Check, Search
} from 'lucide-react';
import { formatScientificName } from '../utils/formatters'; 

interface ActivityPanelProps {
  activities: ActivityItem[];
  onCancel: (id: string) => void;
  onRetry: (activity: ActivityItem) => void;
  onDismiss: (id: string) => void;
  onResolve?: (id: string, choice: 'accept' | 'reject' | 'select', payload?: any) => void;
}

const ActivityPanel: React.FC<ActivityPanelProps> = ({ activities, onCancel, onRetry, onDismiss, onResolve }) => {
  const [isCollapsed, setIsCollapsed] = useState(true);

  // Categorize
  const needsInput = useMemo(() => 
      activities.filter(a => a.status === 'needs_input'), 
  [activities]);
  
  const running = useMemo(() => 
      activities.filter(a => a.status === 'running'), 
  [activities]);
  
  const history = useMemo(() => 
      activities.filter(a => a.status === 'completed' || a.status === 'error').sort((a,b) => b.timestamp - a.timestamp), 
  [activities]);

  const hasAttentionItems = needsInput.length > 0 || activities.some(a => a.status === 'error' && Date.now() - a.timestamp < 30000); 

  useEffect(() => {
      if (needsInput.length > 0 && isCollapsed) {
          // Optional: Auto expand if critical
      }
  }, [needsInput.length]);

  const renderResolutionUI = (item: ActivityItem) => {
      if (!item.resolution) return null;
      const { type, candidates, originalQuery, existingId } = item.resolution;

      if (type === 'duplicate') {
          return (
              <div className="mt-2 p-2 bg-white rounded border border-amber-200">
                  <p className="text-xs text-slate-600 mb-2">
                      <strong>{candidates[0].scientificName}</strong> is already in your database.
                  </p>
                  <div className="flex gap-2 justify-end">
                      <button 
                          onClick={() => onDismiss(item.id)}
                          className="px-2 py-1 text-xs bg-slate-100 text-slate-600 rounded hover:bg-slate-200"
                      >
                          Cancel
                      </button>
                      <button 
                          onClick={() => { alert("Showing existing item logic not impl"); onDismiss(item.id); }}
                          className="px-2 py-1 text-xs bg-leaf-100 text-leaf-700 rounded hover:bg-leaf-200"
                      >
                          Show Existing
                      </button>
                  </div>
              </div>
          );
      }

      if (type === 'correction') {
          const match = candidates[0];
          return (
              <div className="mt-2 p-2 bg-white rounded border border-amber-200">
                  <p className="text-xs text-slate-600 mb-2">
                      Did you mean <strong>{match.scientificName}</strong>? <br/>
                      <span className="text-[10px] text-slate-400">Match: {match.matchType} ({Math.round(match.confidence * 100)}%)</span>
                  </p>
                  <div className="flex gap-2 justify-end">
                      <button 
                          onClick={() => onDismiss(item.id)}
                          className="px-2 py-1 text-xs bg-slate-100 text-slate-600 rounded hover:bg-slate-200"
                      >
                          No, Cancel
                      </button>
                      <button 
                          onClick={() => onResolve && onResolve(item.id, 'accept', match)}
                          className="px-2 py-1 text-xs bg-leaf-600 text-white rounded hover:bg-leaf-700 flex items-center gap-1"
                      >
                          <Check size={12}/> Yes, Add
                      </button>
                  </div>
              </div>
          );
      }

      if (type === 'ambiguous') {
          return (
              <div className="mt-2 space-y-2">
                  <p className="text-xs text-slate-500">Select the correct plant:</p>
                  {candidates.map((c, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2 bg-white border border-slate-200 rounded hover:border-leaf-300 cursor-pointer"
                           onClick={() => onResolve && onResolve(item.id, 'select', c)}>
                          <div>
                              <div className="text-xs font-bold text-slate-700">{c.scientificName}</div>
                              {c.commonName && <div className="text-[10px] text-slate-500">{c.commonName}</div>}
                          </div>
                          <div className="text-[10px] bg-slate-100 px-1 rounded">{c.matchType}</div>
                      </div>
                  ))}
                  <button 
                      onClick={() => onDismiss(item.id)}
                      className="w-full text-center text-xs text-slate-400 hover:text-slate-600 mt-2"
                  >
                      Cancel Search
                  </button>
              </div>
          );
      }
  };

  const renderItem = (item: ActivityItem) => {
      let icon = <Activity size={14} className="text-slate-400"/>;
      let statusColor = "bg-slate-100 text-slate-500";
      
      if (item.status === 'running') {
          icon = <Loader2 size={14} className="animate-spin text-leaf-600"/>;
          statusColor = "bg-leaf-50 text-leaf-700";
      } else if (item.status === 'completed') {
          icon = <CheckCircle2 size={14} className="text-green-600"/>;
          statusColor = "bg-green-50 text-green-700";
      } else if (item.status === 'error') {
          icon = <XCircle size={14} className="text-red-600"/>;
          statusColor = "bg-red-50 text-red-700";
      } else if (item.status === 'needs_input') {
          icon = <AlertTriangle size={14} className="text-amber-600"/>;
          statusColor = "bg-amber-50 text-amber-700 font-bold border-amber-200 border";
      }

      // Safely handle status string
      const statusLabel = (item.status || 'unknown').replace('_', ' ');

      return (
          <div key={item.id} className={`p-3 rounded-lg border text-sm relative group transition-all ${item.status === 'needs_input' ? 'bg-amber-50/50 border-amber-200' : 'bg-white border-slate-100 shadow-sm'}`}>
              <div className="flex justify-between items-start mb-1">
                  <span className="font-semibold text-slate-700 truncate pr-6" title={item.name}>{item.name}</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
              </div>
              
              <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${statusColor}`}>
                      {statusLabel}
                  </span>
                  {item.status !== 'needs_input' && (
                      <span className="text-xs text-slate-500 truncate flex-1" title={item.message}>
                          {item.message}
                      </span>
                  )}
              </div>

              {item.status === 'needs_input' && renderResolutionUI(item)}

              <div className="flex gap-2 justify-end mt-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  {item.status === 'running' && (
                      <button onClick={() => onCancel(item.id)} className="text-xs flex items-center gap-1 text-red-500 hover:bg-red-50 px-2 py-1 rounded">
                          <X size={12}/> Cancel
                      </button>
                  )}
                  {item.canRetry && (item.status === 'needs_input' || item.status === 'error') && !item.resolution && (
                      <button onClick={() => onRetry(item)} className="text-xs flex items-center gap-1 text-amber-600 hover:bg-amber-100 px-2 py-1 rounded font-medium">
                          <RotateCcw size={12}/> Retry
                      </button>
                  )}
                  {(item.status === 'completed' || item.status === 'error') && (
                      <button onClick={() => onDismiss(item.id)} className="text-xs flex items-center gap-1 text-slate-400 hover:bg-slate-100 px-2 py-1 rounded">
                          <X size={12}/> Dismiss
                      </button>
                  )}
              </div>
          </div>
      );
  };

  return (
    <div className={`fixed bottom-4 right-4 bg-white border border-slate-200 shadow-2xl rounded-xl z-40 transition-all duration-300 flex flex-col ${isCollapsed ? 'w-auto h-auto' : 'w-[450px] max-h-[90vh]'}`}>
        
        <div 
            className={`p-3 flex items-center justify-between cursor-pointer border-b border-slate-100 ${hasAttentionItems ? 'bg-amber-50' : 'bg-white'}`}
            onClick={() => setIsCollapsed(!isCollapsed)}
        >
            <div className="flex items-center gap-3">
                <div className={`relative p-1.5 rounded-full ${hasAttentionItems ? 'bg-amber-100 text-amber-600 animate-pulse' : 'bg-slate-100 text-slate-500'}`}>
                    <Activity size={18} />
                    {running.length > 0 && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-leaf-500 rounded-full border-2 border-white"></span>
                    )}
                </div>
                <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-800">Activity</span>
                    <span className="text-[10px] text-slate-500">
                        {running.length} active, {needsInput.length} alerts
                    </span>
                </div>
            </div>
            <button className="text-slate-400 hover:text-slate-600">
                {isCollapsed ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
            </button>
        </div>

        {!isCollapsed && (
            <div className="flex-1 overflow-hidden flex flex-col bg-slate-50">
                
                {needsInput.length > 0 && (
                    <div className="p-3 border-b border-amber-200 bg-amber-50/50 overflow-y-auto flex-shrink-0 max-h-[50vh]">
                        <div className="text-[10px] font-bold text-amber-700 uppercase tracking-wide mb-2 flex items-center gap-2">
                            <AlertTriangle size={12}/> User Input Required
                        </div>
                        <div className="space-y-2">
                            {needsInput.map(renderItem)}
                        </div>
                    </div>
                )}

                <div className="p-3 border-b border-slate-200 flex-shrink-0 max-h-48 overflow-y-auto">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">Active Tasks</div>
                    {running.length === 0 ? (
                        <p className="text-xs text-slate-400 italic py-2">No background tasks running.</p>
                    ) : (
                        <div className="space-y-2">
                            {running.map(renderItem)}
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-3">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Recent Log</span>
                        <button onClick={() => history.forEach(h => onDismiss(h.id))} className="text-[10px] text-blue-500 hover:underline">Clear</button>
                    </div>
                    {history.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">No recent activity.</p>
                    ) : (
                        <div className="space-y-2 opacity-80">
                            {history.map(renderItem)}
                        </div>
                    )}
                </div>
            </div>
        )}
    </div>
  );
};

export default ActivityPanel;
