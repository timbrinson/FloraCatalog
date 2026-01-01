
import React, { useState, useMemo } from 'react';
import { ActivityItem, ActivityStatus, SearchCandidate } from '../types';
import { 
    Loader2, CheckCircle2, XCircle, AlertTriangle, 
    Activity, RotateCcw, X, Check, ChevronDown, ChevronRight,
    ArrowRight
} from 'lucide-react';

interface ActivityPanelProps {
  activities: ActivityItem[];
  isOpen: boolean;
  onClose: () => void;
  onCancel: (id: string) => void;
  onRetry: (activity: ActivityItem) => void;
  onDismiss: (id: string) => void;
  onResolve?: (id: string, choice: 'accept' | 'reject' | 'select', payload?: any) => void;
}

const ActivityPanel: React.FC<ActivityPanelProps> = ({ 
    activities, isOpen, onClose, onCancel, onRetry, onDismiss, onResolve 
}) => {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const needsInput = useMemo(() => activities.filter(a => a.status === 'needs_input'), [activities]);
  const running = useMemo(() => activities.filter(a => a.status === 'running'), [activities]);
  const history = useMemo(() => activities.filter(a => a.status === 'completed' || a.status === 'error').sort((a,b) => b.timestamp - a.timestamp), [activities]);

  const toggleExpand = (id: string) => {
      const next = new Set(expandedItems);
      if (next.has(id)) next.delete(id); else next.add(id);
      setExpandedItems(next);
  };

  const renderResolutionUI = (item: ActivityItem) => {
      if (!item.resolution) return null;
      const { type, candidates } = item.resolution;

      if (type === 'duplicate') {
          return (
              <div className="mt-2 p-2 bg-white rounded border border-amber-200">
                  <p className="text-xs text-slate-600 mb-2"><strong>{candidates[0].taxon_name}</strong> is already in your database.</p>
                  <div className="flex gap-2 justify-end"><button onClick={() => onDismiss(item.id)} className="px-2 py-1 text-xs bg-slate-100 text-slate-600 rounded">Cancel</button></div>
              </div>
          );
      }

      if (type === 'synonym') {
          const match = candidates[0];
          return (
              <div className="mt-2 p-2 bg-white rounded border border-amber-200 shadow-sm">
                  <p className="text-xs text-slate-700 mb-3"><strong>{match.taxon_name}</strong> is a synonym for <strong>{match.accepted_name}</strong>. Which would you like to add?</p>
                  <div className="space-y-2">
                      <button onClick={() => onResolve?.(item.id, 'accept', { ...match, taxon_name: match.accepted_name })} className="w-full flex items-center justify-between p-2 text-xs border border-leaf-200 bg-leaf-50 text-leaf-800 rounded"><div className="text-left"><div className="font-bold">Add Accepted Name</div><div className="text-[10px] opacity-70">{match.accepted_name}</div></div><Check size={14}/></button>
                      <button onClick={() => onResolve?.(item.id, 'accept', match)} className="w-full flex items-center justify-between p-2 text-xs border border-slate-200 bg-white text-slate-600 rounded"><div className="text-left"><div className="font-medium">Add Synonym Name</div><div className="text-[10px] opacity-70">{match.taxon_name}</div></div><ArrowRight size={14}/></button>
                  </div>
              </div>
          );
      }

      if (type === 'correction') {
          const match = candidates[0];
          return (
              <div className="mt-2 p-2 bg-white rounded border border-amber-200"><p className="text-xs text-slate-600 mb-2">Did you mean <strong>{match.taxon_name}</strong>? <br/><span className="text-[10px] text-slate-400">Match: {match.match_type} ({Math.round(match.confidence * 100)}%)</span></p><div className="flex gap-2 justify-end"><button onClick={() => onDismiss(item.id)} className="px-2 py-1 text-xs bg-slate-100 text-slate-600 rounded">No</button><button onClick={() => onResolve?.(item.id, 'accept', match)} className="px-2 py-1 text-xs bg-leaf-600 text-white rounded flex items-center gap-1"><Check size={12}/> Yes</button></div></div>
          );
      }

      if (type === 'ambiguous') {
          return (
              <div className="mt-2 space-y-2">
                  <p className="text-xs text-slate-500">Select the correct plant:</p>
                  {candidates.map((c, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2 bg-white border border-slate-200 rounded hover:border-leaf-300 cursor-pointer" onClick={() => onResolve?.(item.id, 'select', c)}><div><div className="text-xs font-bold text-slate-700">{c.taxon_name}</div>{c.common_name && <div className="text-[10px] text-slate-500">{c.common_name}</div>}</div><div className="text-[10px] bg-slate-100 px-1 rounded">{c.match_type}</div></div>
                  ))}
              </div>
          );
      }
  };

  const renderItem = (item: ActivityItem) => {
      let icon = <Activity size={14} className="text-slate-400"/>;
      let statusColor = "bg-slate-100 text-slate-500";
      if (item.status === 'running') { icon = <Loader2 size={14} className="animate-spin text-leaf-600"/>; statusColor = "bg-leaf-50 text-leaf-700"; }
      else if (item.status === 'completed') { icon = <CheckCircle2 size={14} className="text-green-600"/>; statusColor = "bg-green-50 text-green-700"; }
      else if (item.status === 'error') { icon = <XCircle size={14} className="text-red-600"/>; statusColor = "bg-red-50 text-red-700"; }
      else if (item.status === 'needs_input') { icon = <AlertTriangle size={14} className="text-amber-600"/>; statusColor = "bg-amber-50 text-amber-700 font-bold border-amber-200 border"; }
      const isExpanded = expandedItems.has(item.id);
      return (
          <div key={item.id} className={`p-3 rounded-lg border text-sm relative group transition-all ${item.status === 'needs_input' ? 'bg-amber-50/50 border-amber-200' : 'bg-white border-slate-100 shadow-sm'}`}>
              <div className="flex justify-between items-start mb-1"><div className="flex items-center gap-2">{icon}<span className="font-semibold text-slate-700 truncate max-w-[180px]">{item.name}</span></div><div className="flex items-center gap-2"><span className="text-[10px] text-slate-400 font-mono">{new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>{item.details && (<button onClick={() => toggleExpand(item.id)} className="text-slate-400 hover:text-slate-600">{isExpanded ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}</button>)}</div></div>
              <div className="flex items-center gap-2 mb-1 pl-6"><span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${statusColor}`}>{item.status.replace('_', ' ')}</span>{item.status !== 'needs_input' && (<span className="text-xs text-slate-500 truncate flex-1">{item.message}</span>)}</div>
              {item.status === 'needs_input' && renderResolutionUI(item)}
              {isExpanded && item.details && (<div className="mt-2 p-2 bg-slate-50 border border-slate-200 rounded text-[10px] font-mono overflow-x-auto max-h-32"><pre>{JSON.stringify(item.details, null, 2)}</pre></div>)}
              <div className="flex gap-2 justify-end mt-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  {item.status === 'running' && (<button onClick={() => onCancel(item.id)} className="text-xs text-red-500 hover:bg-red-50 px-2 py-1 rounded">Cancel</button>)}
                  {item.can_retry && (item.status === 'needs_input' || item.status === 'error') && !item.resolution && (<button onClick={() => onRetry(item)} className="text-xs text-amber-600 hover:bg-amber-100 px-2 py-1 rounded font-medium">Retry</button>)}
                  {(item.status === 'completed' || item.status === 'error') && (<button onClick={() => onDismiss(item.id)} className="text-xs text-slate-400 hover:bg-slate-100 px-2 py-1 rounded">Dismiss</button>)}
              </div>
          </div>
      );
  };

  if (!isOpen) return null;
  return (
    <div className="absolute top-full right-0 mt-2 w-[450px] max-h-[85vh] bg-white border border-slate-200 shadow-2xl rounded-xl z-50 flex flex-col origin-top-right">
        <div className="p-3 flex items-center justify-between border-b bg-slate-50 rounded-t-xl"><span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Activity Monitor</span><button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1"><X size={16} /></button></div>
        <div className="flex-1 overflow-hidden flex flex-col bg-slate-50">
            {needsInput.length > 0 && (<div className="p-3 border-b border-amber-200 bg-amber-50/50 overflow-y-auto max-h-[50vh]"><div className="text-[10px] font-bold text-amber-700 uppercase tracking-wide mb-2">Action Required</div><div className="space-y-2">{needsInput.map(renderItem)}</div></div>)}
            <div className="p-3 border-b border-slate-200 max-h-48 overflow-y-auto"><div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">Active Tasks</div>{running.length === 0 ? <p className="text-xs text-slate-400 italic py-2">No background tasks running.</p> : <div className="space-y-2">{running.map(renderItem)}</div>}</div>
            <div className="flex-1 overflow-y-auto p-3"><div className="flex justify-between items-center mb-2"><span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">History</span><button onClick={() => history.forEach(h => onDismiss(h.id))} className="text-[10px] text-blue-500 hover:underline">Clear</button></div>{history.length === 0 ? <p className="text-xs text-slate-400 italic">No recent activity.</p> : <div className="space-y-2 opacity-80">{history.map(renderItem)}</div>}</div>
        </div>
    </div>
  );
};

export default ActivityPanel;
