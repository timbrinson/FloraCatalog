
import React from 'react';
import { BackgroundProcess } from '../types';
import { Loader2, CheckCircle2, XCircle, Minimize2, Maximize2, Activity, X } from 'lucide-react';

interface ProcessMonitorProps {
  processes: BackgroundProcess[];
  onCancel?: (id: string) => void;
  onCancelAll?: () => void;
}

const ProcessMonitor: React.FC<ProcessMonitorProps> = ({ processes, onCancel, onCancelAll }) => {
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  if (processes.length === 0) return null;

  return (
    <div className={`fixed bottom-4 right-4 bg-white border border-slate-200 shadow-xl rounded-xl z-40 transition-all duration-300 overflow-hidden ${isCollapsed ? 'w-auto' : 'w-80'}`}>
        {/* Header */}
        <div className="bg-slate-50 p-3 flex items-center justify-between border-b border-slate-100">
            <div 
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => setIsCollapsed(!isCollapsed)}
            >
                <Activity size={16} className="text-leaf-600" />
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                    {processes.length} Process{processes.length !== 1 ? 'es' : ''}
                </span>
            </div>
            <div className="flex items-center gap-2">
                {!isCollapsed && onCancelAll && (
                    <button 
                        onClick={onCancelAll}
                        className="text-[10px] text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-0.5 rounded font-medium"
                    >
                        Cancel All
                    </button>
                )}
                <button 
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="text-slate-400 hover:text-slate-600"
                >
                    {isCollapsed ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
                </button>
            </div>
        </div>

        {/* List */}
        {!isCollapsed && (
            <div className="max-h-64 overflow-y-auto p-2 space-y-2">
                {processes.map(proc => (
                    <div key={proc.id} className="bg-white p-3 rounded border border-slate-100 shadow-sm text-sm relative group">
                        {onCancel && (
                            <button 
                                onClick={() => onCancel(proc.id)}
                                className="absolute top-2 right-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Cancel Process"
                            >
                                <X size={14} />
                            </button>
                        )}
                        <div className="flex justify-between items-start mb-1 pr-6">
                            <span className="font-medium text-slate-700 truncate w-full" title={proc.name}>
                                {proc.name}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                             <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 px-1.5 rounded">
                                {proc.type}
                            </span>
                            <div className="flex items-center gap-1 text-slate-500 text-xs truncate flex-1">
                                <Loader2 size={12} className="animate-spin text-leaf-500 flex-shrink-0" />
                                <span className="truncate" title={proc.status}>{proc.status}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )}
    </div>
  );
};

export default ProcessMonitor;
