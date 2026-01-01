import React, { useState } from 'react';
import { X, Settings, Layout, Zap, Palette, Database, Save, Search as SearchIcon, Cpu, AlertTriangle, RefreshCw, Loader2, Trash2 } from 'lucide-react';
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
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, preferences, onUpdate, onMaintenanceComplete }) => {
  if (!isOpen) return null;

  // Default to LocalStorage, fallback to constants from file
  const [dbUrl, setDbUrl] = useState(localStorage.getItem('supabase_url') || MANUAL_URL);
  const [dbKey, setDbKey] = useState(localStorage.getItem('supabase_anon_key') || MANUAL_KEY);
  
  const [isPurging, setIsPurging] = useState(false);
  const [isWiping, setIsWiping] = useState(false);
  
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);
  const [showWipeConfirm, setShowWipeConfirm] = useState(false);

  // Pattern for preview: Genus -> Species -> Infraspecies -> Cultivar -> Repeat
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
          'option2a': { genus: 'green', species: 'amber', variety: 'orange', cultivar: 'blue' },
          'option2b': { genus: 'blue', species: 'orange', variety: 'amber', cultivar: 'green' }
      };
      const c = colors[theme][role] || 'slate';
      return `bg-${c}-50 border-${c}-200 text-${c}-900`;
  };

  const saveConnection = () => {
      // Trim inputs to avoid copy-paste errors (newlines, spaces)
      const cleanUrl = dbUrl.trim();
      const cleanKey = dbKey.trim();

      if (cleanUrl && cleanKey) {
          localStorage.setItem('supabase_url', cleanUrl);
          localStorage.setItem('supabase_anon_key', cleanKey);
          
          // Re-initialize the client immediately
          reloadClient();
          
          // Optional: Force reload to be 100% sure, but dynamic client should handle it
          if (confirm("Connection saved. The app will reload to connect.")) {
              window.location.reload();
          } else {
              onClose(); // Close modal if they cancel reload (client is already reloaded in memory)
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
          alert("Manual entries and cultivars removed. The grid will refresh.");
          if (onMaintenanceComplete) {
              onMaintenanceComplete();
          } else {
              window.location.reload();
          }
      } catch (e: any) {
          const msg = e.message?.includes('timeout') 
            ? "The purge timed out on the server, but may still be processing. Please wait a minute and refresh the page manually."
            : `Purge failed: ${e.message}`;
          alert(msg);
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
          alert("Knowledge Layer (Details) successfully wiped. All plant records preserved. Grid will refresh.");
          if (onMaintenanceComplete) {
              onMaintenanceComplete();
          } else {
              window.location.reload();
          }
      } catch (e: any) {
          alert(`Wipe failed: ${e.message}`);
      } finally {
          setIsWiping(false);
      }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
          <X size={20} />
        </button>
        
        <div className="flex items-center gap-2 mb-6">
            <Settings className="text-slate-700" size={24} />
            <h3 className="text-xl font-bold text-slate-800">Settings</h3>
        </div>

        <div className="space-y-8">
            
            {/* Database Connection */}
            <div>
                <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <Database size={14}/> Database Connection
                </h4>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
                    <p className="text-xs text-slate-500">
                        Connect to your Supabase project. Keys are stored locally in your browser.
                    </p>
                    <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">Project URL</label>
                        <input 
                            type="text" 
                            className="w-full text-xs p-2 border border-slate-300 rounded focus:ring-2 ring-leaf-200 outline-none font-mono"
                            placeholder="https://xyz.supabase.co"
                            value={dbUrl}
                            onChange={(e) => setDbUrl(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">Anon / Public Key</label>
                        <input 
                            type="password" 
                            className="w-full text-xs p-2 border border-slate-300 rounded focus:ring-2 ring-leaf-200 outline-none font-mono"
                            placeholder="eyJh..."
                            value={dbKey}
                            onChange={(e) => setDbKey(e.target.value)}
                        />
                    </div>
                    <button 
                        onClick={saveConnection}
                        className="w-full flex items-center justify-center gap-2 py-2 bg-leaf-600 text-white rounded hover:bg-leaf-700 text-xs font-bold"
                    >
                        <Save size={14} /> Save & Connect
                    </button>
                </div>
            </div>

            {/* Search Optimization Section */}
            <div>
                <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <SearchIcon size={14}/> Search Engine (Experimental)
                </h4>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <p className="text-xs text-slate-500 mb-4">Choose how the Plant Name filter interacts with the database.</p>
                    
                    <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg border border-slate-200">
                        <button 
                            onClick={() => onUpdate({ ...preferences, searchMode: 'prefix' })}
                            className={`p-2 text-[11px] rounded-md transition-all flex flex-col items-center gap-1 ${preferences.searchMode === 'prefix' ? 'bg-white shadow-sm font-bold text-leaf-700 border border-leaf-200' : 'text-slate-500 hover:bg-slate-200/50'}`}
                        >
                            <span>Prefix (Standard)</span>
                            <span className="text-[9px] font-normal opacity-70">Starts with "Aga..."</span>
                        </button>
                        <button 
                            onClick={() => onUpdate({ ...preferences, searchMode: 'fuzzy' })}
                            className={`p-2 text-[11px] rounded-md transition-all flex flex-col items-center gap-1 ${preferences.searchMode === 'fuzzy' ? 'bg-white shadow-sm font-bold text-indigo-700 border border-indigo-200' : 'text-slate-500 hover:bg-slate-200/50'}`}
                        >
                            <span>Fuzzy (Flexible)</span>
                            <span className="text-[9px] font-normal opacity-70">Matches "...marine..."</span>
                        </button>
                    </div>

                    <div className="mt-4 flex items-start gap-2 p-2 bg-white/50 rounded border border-dashed border-slate-200">
                        <Cpu size={14} className="text-slate-400 mt-0.5" />
                        <div className="text-[10px] text-slate-500 leading-relaxed">
                            {preferences.searchMode === 'prefix' 
                                ? "Prefix mode uses optimized B-Tree indexing. Best for large-scale browsing and instant infinite scroll."
                                : "Fuzzy mode uses Trigram GIN indexing. Allows mid-string matches and case-insensitivity at the cost of higher CPU usage."
                            }
                        </div>
                    </div>
                </div>
            </div>

            {/* Color Theme Section */}
            <div>
                <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <Palette size={14}/> Color Rhythm Tester
                </h4>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <p className="text-xs text-slate-500 mb-4">Select a pattern to visualize the taxonomic hierarchy flow.</p>
                    
                    <div className="grid grid-cols-2 gap-2 mb-4">
                        <button 
                            onClick={() => onUpdate({ ...preferences, colorTheme: 'option1a' })}
                            className={`p-2 text-xs border rounded text-center ${preferences.colorTheme === 'option1a' ? 'border-leaf-500 bg-white ring-1 ring-leaf-500 font-bold text-leaf-700' : 'border-slate-200 text-slate-600 hover:bg-white'}`}
                        >
                            1a: Warm → Cool
                        </button>
                         <button 
                            onClick={() => onUpdate({ ...preferences, colorTheme: 'option1b' })}
                            className={`p-2 text-xs border rounded text-center ${preferences.colorTheme === 'option1b' ? 'border-leaf-500 bg-white ring-1 ring-leaf-500 font-bold text-leaf-700' : 'border-slate-200 text-slate-600 hover:bg-white'}`}
                        >
                            1b: Cool → Warm
                        </button>
                         <button 
                            onClick={() => onUpdate({ ...preferences, colorTheme: 'option2a' })}
                            className={`p-2 text-xs border rounded text-center ${preferences.colorTheme === 'option2a' ? 'border-leaf-500 bg-white ring-1 ring-leaf-500 font-bold text-leaf-700' : 'border-slate-200 text-slate-600 hover:bg-white'}`}
                        >
                            2a: Green Start
                        </button>
                         <button 
                            onClick={() => onUpdate({ ...preferences, colorTheme: 'option2b' })}
                            className={`p-2 text-xs border rounded text-center ${preferences.colorTheme === 'option2b' ? 'border-leaf-500 bg-white ring-1 ring-leaf-500 font-bold text-leaf-700' : 'border-slate-200 text-slate-600 hover:bg-white'}`}
                        >
                            2b: Blue Start
                        </button>
                    </div>

                    {/* Live Pattern Preview */}
                    <div className="border border-slate-200 rounded-md overflow-hidden">
                        <div className="bg-slate-100 px-3 py-1 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-200">Pattern Preview</div>
                        <div className="flex flex-col">
                            {PREVIEW_SEQUENCE.map((item, idx) => (
                                <div key={idx} className={`px-4 py-2 text-xs border-b border-slate-100 last:border-0 ${getColor(preferences.colorTheme, item.role)}`}>
                                    {item.label}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Maintenance & Danger Zone */}
            <div>
                <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <AlertTriangle size={14}/> Maintenance & Danger Zone
                </h4>
                <div className="space-y-4">
                    {/* Operation A: Purge Cultivars */}
                    <div className="bg-red-50 p-4 rounded-lg border border-red-100 space-y-3">
                        <div className="space-y-1">
                            <span className="text-xs font-bold text-red-800 block">Purge Cultivars & Manual Entries</span>
                            <p className="text-[10px] text-red-600 leading-relaxed">
                                Removes all plants NOT part of the standard WCVP core. This action will also delete the associated details for these specific plants.
                            </p>
                        </div>
                        <button 
                            onClick={() => setShowPurgeConfirm(true)}
                            disabled={isPurging || isWiping}
                            className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-colors ${isPurging ? 'bg-red-200 text-red-400' : 'bg-red-600 text-white hover:bg-red-700 shadow-sm'}`}
                        >
                            {isPurging ? <Loader2 size={14} className="animate-spin"/> : <Trash2 size={14} />}
                            {isPurging ? "Purging..." : "Purge Non-WCVP Taxa"}
                        </button>
                    </div>

                    {/* Operation B: Wipe Details */}
                    <div className="bg-amber-50 p-4 rounded-lg border border-amber-100 space-y-3">
                        <div className="space-y-1">
                            <span className="text-xs font-bold text-amber-800 block">Wipe Knowledge Layer (Details)</span>
                            <p className="text-[10px] text-amber-600 leading-relaxed">
                                Clears ALL descriptions, traits, and links for ALL plants. The nomenclature (names) will remain intact. 
                                <span className="font-bold block mt-1">Warning: Large tables may take significant time.</span>
                            </p>
                        </div>
                        <button 
                            onClick={() => setShowWipeConfirm(true)}
                            disabled={isPurging || isWiping}
                            className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-colors ${isWiping ? 'bg-amber-200 text-amber-400' : 'bg-amber-600 text-white hover:bg-amber-700 shadow-sm'}`}
                        >
                            {isWiping ? <Loader2 size={14} className="animate-spin"/> : <RefreshCw size={14} />}
                            {isWiping ? "Wiping Details..." : "Wipe All Horticultural Details"}
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <div className="mt-8 flex justify-end">
            <button 
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 font-medium text-sm"
            >
                Done
            </button>
        </div>

        {showPurgeConfirm && (
            <ConfirmDialog 
                isOpen={showPurgeConfirm}
                title="Confirm Taxa Purge"
                message="Are you sure? This will permanently delete all manual entries and cultivars. Only the 1.4M WCVP records will remain. This cannot be undone."
                confirmLabel="Yes, Purge Cultivars"
                isDestructive={true}
                onConfirm={handlePurgeNonWCVP}
                onCancel={() => setShowPurgeConfirm(false)}
            />
        )}

        {showWipeConfirm && (
            <ConfirmDialog 
                isOpen={showWipeConfirm}
                title="Wipe Knowledge Layer"
                message="Are you sure? This will delete ALL descriptions, traits, and links for every plant in your database. All scientific names are preserved, but AI enrichments will be lost. This may take some time."
                confirmLabel="Yes, Wipe Details"
                isDestructive={true}
                onConfirm={handleWipeAllDetails}
                onCancel={() => setShowWipeConfirm(false)}
            />
        )}
      </div>
    </div>
  );
};

export default SettingsModal;