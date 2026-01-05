import React, { useState } from 'react';
import { X, Settings, Layout, Zap, Palette, Database, Save, Search as SearchIcon, Cpu, AlertTriangle, RefreshCw, Loader2, Trash2, Bug, Network, RotateCcw, Download } from 'lucide-react';
import { UserPreferences, ColorTheme } from '../types';
import { reloadClient, MANUAL_URL, MANUAL_KEY } from '../services/supabaseClient';
import { dataService } from '../services/dataService';
import ConfirmDialog from './ConfirmDialog';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  preferences: UserPreferences;
  onUpdate: (newPrefs: UserPreferences) => void;
  onMaintenanceComplete?: () => void;
  onSaveLayout?: () => void;
  onReloadLayout?: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, preferences, onUpdate, onMaintenanceComplete, onSaveLayout, onReloadLayout }) => {
  if (!isOpen) return null;

  const [dbUrl, setDbUrl] = useState(localStorage.getItem('supabase_url') || MANUAL_URL);
  const [dbKey, setDbKey] = useState(localStorage.getItem('supabase_anon_key') || MANUAL_KEY);
  const [isPurging, setIsPurging] = useState(false);
  const [isWiping, setIsWiping] = useState(false);
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);
  const [showWipeConfirm, setShowWipeConfirm] = useState(false);

  const PREVIEW_SEQUENCE = [
      { label: 'Genus (Agave)', role: 'genus' },
      { label: 'Species (parryi)', role: 'species' },
      { label: 'Infraspecies (var. truncata)', role: 'variety' },
      { label: 'Cultivar (Huntington)', role: 'cultivar' },
      { label: 'Genus (Agave)', role: 'genus' },
      { label: 'Species (parryi)', role: 'species' },
  ];

  const getColor = (theme: ColorTheme, role: string) => {
      const colors: Record<ColorTheme, Record<string, string>> = {
          'option1a': { genus: 'orange', species: 'amber', variety: 'green', cultivar: 'blue' },
          'option1b': { genus: 'blue', species: 'green', variety: 'amber', cultivar: 'orange' },
          'option2a': { genus: 'green', species: 'amber', variety: 'orange', cultivar: 'sky' },
          'option2b': { genus: 'sky', species: 'orange', variety: 'amber', cultivar: 'green' }
      };
      const c = colors[theme][role] || 'slate';
      return `bg-${c}-50 border-${c}-200 text-${c}-500 font-bold`;
  };

  const saveConnection = () => {
      const cleanUrl = dbUrl.trim();
      const cleanKey = dbKey.trim();
      if (cleanUrl && cleanKey) {
          localStorage.setItem('supabase_url', cleanUrl);
          localStorage.setItem('supabase_anon_key', cleanKey);
          reloadClient();
          if (confirm("Connection saved. The app will reload to connect.")) {
              window.location.reload();
          } else {
              onClose();
          }
      } else {
          alert("Please enter both Project URL and Key.");
      }
  };

  const handlePurgeNonWCVP = async () => {
      if (isPurging) return;
      setShowPurgeConfirm(false);
      setIsPurging(true);
      try {
          await dataService.purgeNonWCVPTaxa();
          alert("Manual entries and cultivars removed.");
          onMaintenanceComplete?.();
      } catch (e: any) {
          alert(e.message);
      } finally {
          setIsPurging(false);
      }
  };

  const handleWipeAllDetails = async () => {
      if (isWiping) return;
      setShowWipeConfirm(false);
      setIsWiping(true);
      try {
          await dataService.wipeAllDetails();
          alert("Horticultural details successfully wiped.");
          onMaintenanceComplete?.();
      } catch (e: any) {
          alert(`Wipe failed: ${e.message}`);
      } finally {
          setIsWiping(false);
      }
  };

  const resetToSystemDefaults = async () => {
      if (confirm("This will clear all saved column layouts, filters, and preferences. Continue?")) {
          await dataService.saveGlobalSettings({});
          window.location.reload();
      }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={20} /></button>
        <div className="flex items-center gap-2 mb-6"><Settings className="text-slate-700" size={24} /><h3 className="text-xl font-bold text-slate-800">Settings</h3></div>
        <div className="space-y-8">
            <div>
                <div className="flex justify-between items-center mb-3">
                    <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2"><Layout size={14}/> Persistence</h4>
                    <button onClick={resetToSystemDefaults} className="flex items-center gap-1 text-[10px] font-bold text-red-600 uppercase hover:underline"><RotateCcw size={10}/> Reset Defaults</button>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
                    <p className="text-[10px] text-slate-500 mb-2">Save your current grid layout, filters, and theme preferences to the cloud.</p>
                    <div className="grid grid-cols-2 gap-3">
                        <button 
                            onClick={onSaveLayout} 
                            className="flex items-center justify-center gap-2 py-2.5 bg-slate-800 text-white rounded-lg hover:bg-slate-900 text-xs font-bold shadow-sm transition-all"
                        >
                            <Save size={14} /> Save Layout
                        </button>
                        <button 
                            onClick={onReloadLayout} 
                            className="flex items-center justify-center gap-2 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 text-xs font-bold shadow-sm transition-all"
                        >
                            <Download size={14} /> Reload
                        </button>
                    </div>
                </div>
            </div>

            <div>
                <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-2"><Database size={14}/> Database Connection</h4>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
                    <div><label className="block text-xs font-bold text-slate-600 mb-1">Project URL</label><input type="text" className="w-full text-xs p-2 border border-slate-300 rounded outline-none font-mono" value={dbUrl} onChange={(e) => setDbUrl(e.target.value)} /></div>
                    <div><label className="block text-xs font-bold text-slate-600 mb-1">Anon Key</label><input type="password" className="w-full text-xs p-2 border border-slate-300 rounded outline-none font-mono" value={dbKey} onChange={(e) => setDbKey(e.target.value)} /></div>
                    <button onClick={saveConnection} className="w-full flex items-center justify-center gap-2 py-2 bg-leaf-600 text-white rounded hover:bg-leaf-700 text-xs font-bold"><Save size={14} /> Update Connection</button>
                </div>
            </div>
            <div>
                <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-2"><Network size={14}/> Data Engine</h4>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Grouping Strategy (ADR-006)</label>
                    <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg">
                        <button onClick={() => onUpdate({ ...preferences, grouping_strategy: 'attribute' })} className={`p-2 text-[10px] rounded-md transition-all ${preferences.grouping_strategy === 'attribute' ? 'bg-white shadow-sm font-bold text-slate-700 border border-slate-200' : 'text-slate-500'}`}>Legacy (Strings)</button>
                        <button onClick={() => onUpdate({ ...preferences, grouping_strategy: 'path' })} className={`p-2 text-[10px] rounded-md transition-all ${preferences.grouping_strategy === 'path' ? 'bg-white shadow-sm font-bold text-leaf-700 border border-leaf-200' : 'text-slate-500'}`}>Authority (IDs)</button>
                    </div>
                </div>
            </div>
            <div>
                <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-2"><SearchIcon size={14}/> Search Engine</h4>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4">
                    <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg">
                        <button onClick={() => onUpdate({ ...preferences, search_mode: 'prefix' })} className={`p-2 text-[11px] rounded-md transition-all ${preferences.search_mode === 'prefix' ? 'bg-white shadow-sm font-bold text-leaf-700 border border-leaf-200' : 'text-slate-500'}`}>Prefix (Standard)</button>
                        <button onClick={() => onUpdate({ ...preferences, search_mode: 'fuzzy' })} className={`p-2 text-[11px] rounded-md transition-all ${preferences.search_mode === 'fuzzy' ? 'bg-white shadow-sm font-bold text-indigo-700 border border-indigo-200' : 'text-slate-500'}`}>Fuzzy (Flexible)</button>
                    </div>
                    
                    <button 
                        onClick={() => onUpdate({ ...preferences, debug_mode: !preferences.debug_mode })} 
                        className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all border ${preferences.debug_mode ? 'bg-amber-100 text-amber-800 border-amber-300 shadow-inner' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}
                    >
                        <Bug size={14}/> {preferences.debug_mode ? 'Disable Diagnostic Mode' : 'Enable Diagnostic Mode'}
                    </button>
                </div>
            </div>
            <div>
                <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-2"><Palette size={14}/> Theme</h4>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <div className="grid grid-cols-2 gap-2 mb-4">
                        {(['option1a','option1b','option2a','option2b'] as ColorTheme[]).map(t => (
                            <button key={t} onClick={() => onUpdate({ ...preferences, color_theme: t })} className={`p-2 text-xs border rounded ${preferences.color_theme === t ? 'border-leaf-500 bg-white ring-1 ring-leaf-500 font-bold text-leaf-700' : 'border-slate-200 text-slate-600'}`}>{t}</button>
                        ))}
                    </div>
                    <div className="border border-slate-200 rounded-md overflow-hidden">
                        <div className="flex flex-col">{PREVIEW_SEQUENCE.map((item, idx) => (<div key={idx} className={`px-4 py-2 text-xs border-b border-slate-100 last:border-0 ${getColor(preferences.color_theme, item.role)}`}>{item.label}</div>))}</div>
                    </div>
                </div>
            </div>
            <div>
                <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-2"><AlertTriangle size={14}/> Maintenance</h4>
                <div className="space-y-4">
                    <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                        <button onClick={() => setShowPurgeConfirm(true)} disabled={isPurging || isWiping} className="w-full flex items-center justify-center gap-2 py-2 bg-red-600 text-white rounded-lg text-xs font-bold">{isPurging ? <Loader2 size={14} className="animate-spin"/> : <Trash2 size={14} />} Purge Non-WCVP</button>
                    </div>
                    <div className="bg-amber-50 p-4 rounded-lg border border-amber-100">
                        <button onClick={() => setShowWipeConfirm(true)} disabled={isPurging || isWiping} className="w-full flex items-center justify-center gap-2 py-2 bg-amber-600 text-white rounded-lg text-xs font-bold">{isWiping ? <Loader2 size={14} className="animate-spin"/> : <RefreshCw size={14} />} Wipe Details</button>
                    </div>
                </div>
            </div>
        </div>
        <div className="mt-8 flex justify-end"><button onClick={onClose} className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 font-medium text-sm">Done</button></div>
        {showPurgeConfirm && (<ConfirmDialog isOpen={true} title="Confirm Taxa Purge" message="Are you sure? This deletes manual entries and cultivars. This cannot be undone." confirmLabel="Yes, Purge" isDestructive={true} onConfirm={handlePurgeNonWCVP} onCancel={() => setShowPurgeConfirm(false)} />)}
        {showWipeConfirm && (<ConfirmDialog isOpen={true} title="Wipe Horticultural Details" message="This deletes all descriptions, traits, and links. scientific names remain." confirmLabel="Yes, Wipe" isDestructive={true} onConfirm={handleWipeAllDetails} onCancel={() => setShowWipeConfirm(false)} />)}
      </div>
    </div>
  );
};

export default SettingsModal;