// DO NOT add any new files, classes, or namespaces.
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ActivityItem, ActivityStatus, SearchCandidate, ActivityStep } from '../types';
import { 
    Loader2, CheckCircle2, XCircle, AlertTriangle, 
    Activity, RotateCcw, X, Check, ChevronDown, ChevronRight,
    ArrowRight, Maximize2, Minimize2, Columns, LayoutDashboard,
    Clock, Database, Search, Cpu, Trash2, GripHorizontal,
    Flag, Eye
} from 'lucide-react';

interface ActivityPanelProps {
  activities: ActivityItem[];
  isOpen: boolean;
  mode: 'side' | 'floating' | 'full';
  onModeChange: (mode: 'side' | 'floating' | 'full') => void;
  onClose: () => void;
  onCancel: (id: string) => void;
  onRetry: (activity: ActivityItem) => void;
  onDismiss: (id: string) => void;
  onClearAll: () => void;
  onResolve?: (id: string, choice: 'accept' | 'reject' | 'select', payload?: any) => void;
}

const ActivityPanel: React.FC<ActivityPanelProps> = ({ 
    activities, isOpen, mode, onModeChange, onClose, onCancel, onRetry, onDismiss, onClearAll, onResolve 
}) => {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

  // Drag State
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, startX: 0, startY: 0 });

  useEffect(() => {
    if (mode === 'floating') {
        setPos({ x: (window.innerWidth / 2) + 100, y: (window.innerHeight / 2) - 300 });
    }
  }, [mode, isOpen]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging || mode !== 'floating') return;
        const dx = e.clientX - dragStartRef.current.x;
        const dy = e.clientY - dragStartRef.current.y;
        setPos({ x: dragStartRef.current.startX + dx, y: dragStartRef.current.startY + dy });
    };
    const handleMouseUp = () => setIsDragging(false);
    if (isDragging) { document.addEventListener('mousemove', handleMouseMove); document.addEventListener('mouseup', handleMouseUp); }
    return () => { document.removeEventListener('mousemove', handleMouseMove); document.removeEventListener('mouseup', handleMouseUp); };
  }, [isDragging, mode]);

  const onDragStart = (e: React.MouseEvent) => {
      if (mode !== 'floating') return;
      setIsDragging(true);
      dragStartRef.current = { x: e.clientX, y: e.clientY, startX: pos.x, startY: pos.y };
  };

  const needsInput = useMemo(() => activities.filter(a => a.status === 'needs_input'), [activities]);
  const activeAndRecent = useMemo(() => 
      activities.filter(a => a.status !== 'needs_input').sort((a,b) => (b.timestamp || 0) - (a.timestamp || 0)), 
      [activities]
  );

  const toggleExpand = (id: string) => { const next = new Set(expandedItems); if (next.has(id)) next.delete(id); else next.add(id); setExpandedItems(next); };
  const toggleStepExpand = (id: string) => { const next = new Set(expandedSteps); if (next.has(id)) next.delete(id); else next.add(id); setExpandedSteps(next); };

  const formatTime = (ts: number | undefined) => {
      if (!ts) return '--:--';
      const d = new Date(ts);
      if (isNaN(d.getTime())) return '--:--';
      return d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  };

  // v2.35.9 Truncation & Toggle Logic
  const renderTruncatedRationale = (text: string, id: string) => {
      if (!text) return null;
      const limit = 250;
      const isTooLong = text.length > limit;
      const isExpanded = expandedSteps.has(id);
      
      return (
          <div className="text-[11px] text-slate-600 italic leading-relaxed">
              {isTooLong && !isExpanded ? `${text.substring(0, limit)}...` : text}
              {isTooLong && (
                  <button onClick={() => toggleStepExpand(id)} className="ml-1 text-blue-600 font-bold hover:underline">
                      {isExpanded ? 'Show less' : 'Read more'}
                  </button>
              )}
          </div>
      );
  };

  const renderJsonMetadata = (data: any, id: string) => {
      if (!data) return null;
      const jsonStr = JSON.stringify(data, null, 2);
      const isExpanded = expandedSteps.has(id);
      const limit = 1000;
      const isTooLong = jsonStr.length > limit;
      
      return (
          <div className="mt-1 bg-slate-50 border border-slate-100 rounded text-[10px] font-mono text-slate-500 overflow-hidden relative">
              <pre className={`p-2 whitespace-pre-wrap overflow-auto custom-scrollbar ${!isExpanded ? 'max-h-[120px]' : 'max-h-[400px]'}`}>
                  {isTooLong && !isExpanded ? `${jsonStr.substring(0, limit)}\n... [Data truncated. Click Expand to see full record]` : jsonStr}
              </pre>
              {isTooLong && (
                  <button onClick={() => toggleStepExpand(id)} className="absolute top-2 right-2 p-1 bg-white border border-slate-200 rounded text-slate-400 hover:text-blue-600 shadow-sm transition-all" title="Toggle Metadata Visibility">
                      {isExpanded ? <Minimize2 size={12}/> : <Maximize2 size={12}/>}
                  </button>
              )}
          </div>
      );
  };

  const renderStep = (step: ActivityStep, idx: number, parentId: string) => {
      let stepIcon = <Clock size={12} className="text-slate-300" />;
      if (step.status === 'running') stepIcon = <Loader2 size={12} className="animate-spin text-leaf-500" />;
      if (step.status === 'completed') stepIcon = <CheckCircle2 size={12} className="text-green-500" />;
      if (step.status === 'error') stepIcon = <XCircle size={12} className="text-red-500" />;
      const stepTime = step.timestamp ? new Date(step.timestamp) : null;
      const isValidTime = stepTime && !isNaN(stepTime.getTime());
      const stepId = `${parentId}-step-${idx}`;

      return (
          <div key={idx} className="flex items-start gap-3 py-2 border-l-2 border-slate-100 ml-2 pl-4 relative">
              <div className="absolute -left-[7px] top-3 w-3 h-3 rounded-full bg-white border-2 border-slate-100 flex items-center justify-center">{stepIcon}</div>
              <div className="flex-1 overflow-hidden">
                  <div className="flex justify-between items-center">
                      <span className={`text-[11px] font-bold ${step.status === 'running' ? 'text-leaf-700' : 'text-slate-600'}`}>{step.label}</span>
                      <span className="text-[9px] text-slate-400 font-mono">{isValidTime ? stepTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second: '2-digit'}) : ''}</span>
                  </div>
                  {step.data && renderJsonMetadata(step.data, stepId)}
                  {step.error && (<div className="mt-1 p-2 bg-red-50 border border-red-100 rounded text-[10px] font-bold text-red-600">{step.error}</div>)}
              </div>
          </div>
      );
  };

  const renderItem = (item: ActivityItem) => {
      let icon = <Activity size={14} className="text-slate-400"/>; let statusColor = "bg-slate-100 text-slate-500"; let outcomeBg = "bg-slate-100/50 text-slate-600 border-slate-200";
      if (item.status === 'running') { icon = <Loader2 size={14} className="animate-spin text-leaf-600"/>; statusColor = "bg-leaf-50 text-leaf-700"; }
      else if (item.status === 'completed') { icon = <CheckCircle2 size={14} className="text-green-600"/>; statusColor = "bg-green-50 text-green-700"; outcomeBg = "bg-green-50/50 text-green-800 border-green-200/50"; }
      else if (item.status === 'error') { icon = <XCircle size={14} className="text-red-600"/>; statusColor = "bg-red-50 text-red-700"; outcomeBg = "bg-red-50/50 text-red-800 border-red-200/50"; }
      else if (item.status === 'needs_input') { icon = <AlertTriangle size={14} className="text-amber-600"/>; statusColor = "bg-amber-50 text-amber-700 font-bold border-amber-200 border"; }
      const isExpanded = expandedItems.has(item.id);

      return (
          <div key={item.id} className={`p-4 rounded-xl border text-sm relative group transition-all duration-200 ${item.status === 'needs_input' ? 'bg-amber-50/30 border-amber-200' : 'bg-white border-slate-100 shadow-sm hover:border-slate-200'}`}>
              <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">{icon}<div className="flex flex-col"><span className="font-bold text-slate-800 truncate max-w-[220px]">{item.name}</span><span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{item.type}</span></div></div>
                  <div className="flex items-center gap-2"><span className="text-[10px] text-slate-400 font-mono">{formatTime(item.timestamp)}</span><button onClick={() => toggleExpand(item.id)} className="p-1 text-slate-300 hover:text-slate-600 transition-colors">{isExpanded ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}</button></div>
              </div>
              <div className="flex items-center gap-2 mb-2 pl-6"><span className={`text-[9px] uppercase font-black px-1.5 py-0.5 rounded tracking-tighter ${statusColor}`}>{item.status.replace('_', ' ')}</span><span className="text-xs text-slate-500 truncate flex-1 font-medium">{item.message}</span></div>
              {isExpanded && (
                  <div className="mt-4 space-y-2 animate-in slide-in-from-top-1 duration-200">
                      {item.inputs && (<div className="p-3 bg-slate-50/50 rounded-lg border border-slate-100"><span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2 flex items-center gap-1.5"><Search size={10}/> Input Intent</span><div className="text-xs font-serif italic text-slate-600">{JSON.stringify(item.inputs)}</div></div>)}
                      <div className="py-2"><span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-3 flex items-center gap-1.5"><Cpu size={10}/> Process Ledger</span><div className="space-y-0">{item.steps?.map((s, idx) => renderStep(s, idx, item.id))}</div></div>
                      {item.details && (<div className="p-3 bg-indigo-50/30 rounded-lg border border-indigo-100/50"><span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest block mb-2 flex items-center gap-1.5"><Database size={10}/> Metadata Out</span>{renderJsonMetadata(item.details, `${item.id}-metadata`)}</div>)}
                  </div>
              )}
              {item.outcome && (
                  <div className={`mt-3 p-3 rounded-lg border-l-4 ${outcomeBg} animate-in slide-in-from-left-1 duration-300`}>
                      <div className="flex items-start gap-2.5"><Flag size={14} className="mt-0.5 opacity-50 shrink-0" /><div className="flex-1"><span className="text-[9px] font-black uppercase tracking-widest block mb-1 opacity-60">Final Outcome</span>{renderTruncatedRationale(item.outcome, `${item.id}-outcome`)}</div></div>
                  </div>
              )}
              <div className="flex gap-2 justify-end mt-3 border-t border-slate-50 pt-3">
                  {item.status === 'running' && (<button onClick={() => onCancel(item.id)} className="text-[10px] font-bold uppercase text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors tracking-widest">Cancel</button>)}
                  {(item.status === 'completed' || item.status === 'error') && (<button onClick={() => onDismiss(item.id)} className="text-[10px] font-bold uppercase text-slate-400 hover:bg-slate-100 px-3 py-1.5 rounded-lg tracking-widest">Dismiss</button>)}
              </div>
          </div>
      );
  };

  if (!isOpen) return null;
  const modeClasses = { side: "fixed right-0 top-0 h-screen w-[450px] shadow-2xl z-50", floating: "fixed shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)] z-50 rounded-2xl w-[550px] max-h-[85vh]", full: "fixed inset-8 shadow-2xl z-50 rounded-2xl" };

  return (
    <div style={mode === 'floating' ? { left: `${pos.x}px`, top: `${pos.y}px` } : {}} className={`${modeClasses[mode]} bg-white border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200`}>
        <div onMouseDown={onDragStart} className={`p-4 flex items-center justify-between border-b bg-slate-50 ${mode === 'floating' ? 'cursor-grab active:cursor-grabbing hover:bg-slate-100' : ''}`}><div className="flex items-center gap-3"><div className="p-2 bg-leaf-600 text-white rounded-lg"><LayoutDashboard size={18}/></div><div><h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Operations Hub</h3><p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">v2.35.9 Process Ledger</p></div></div><div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 shadow-sm pointer-events-auto">{mode === 'floating' && <div className="p-1.5 text-slate-300"><GripHorizontal size={16}/></div>}<button onClick={() => onModeChange('side')} className={`p-1.5 rounded-md transition-all ${mode === 'side' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-50'}`}><Columns size={16}/></button><button onClick={() => onModeChange('floating')} className={`p-1.5 rounded-md transition-all ${mode === 'floating' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-50'}`}><Minimize2 size={16}/></button><button onClick={() => onModeChange('full')} className={`p-1.5 rounded-md transition-all ${mode === 'full' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-50'}`}><Maximize2 size={16}/></button><div className="w-px h-4 bg-slate-200 mx-1"></div><button onClick={onClose} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"><X size={20} /></button></div></div>
        <div className="flex-1 overflow-hidden flex flex-col bg-slate-50/50">
            {needsInput.length > 0 && (<div className="p-4 border-b border-amber-200 bg-amber-50/20 overflow-y-auto max-h-[40vh]"><div className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-4 flex items-center gap-2"><AlertTriangle size={12}/> Interaction Required</div><div className="space-y-3">{needsInput.map(renderItem)}</div></div>)}
            <div className={`flex-1 overflow-y-auto p-4 custom-scrollbar ${mode === 'full' ? 'columns-2 gap-6' : ''}`}><div className="break-inside-avoid mb-8"><div className="flex justify-between items-center mb-4"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Clock size={12}/> Active & Recent</span><button onClick={onClearAll} className="text-[10px] font-bold text-red-500 uppercase flex items-center gap-1 hover:underline"><Trash2 size={10}/> Wipe History</button></div>{activeAndRecent.length === 0 ? (<div className="flex flex-col items-center justify-center py-20 text-slate-300 opacity-50"><Activity size={48} className="mb-4" /><p className="text-sm font-bold uppercase tracking-widest">No processes tracked</p></div>) : (<div className="space-y-4">{activeAndRecent.map(renderItem)}</div>)}</div></div>
        </div>
    </div>
  );
};

export default ActivityPanel;