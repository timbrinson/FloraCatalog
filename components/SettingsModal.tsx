
import React, { useState } from 'react';
import { X, Settings, Layout, Zap, Palette, Database, Save } from 'lucide-react';
import { UserPreferences, ColorTheme } from '../types';
import { reloadClient, MANUAL_URL, MANUAL_KEY } from '../services/supabaseClient';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  preferences: UserPreferences;
  onUpdate: (newPrefs: UserPreferences) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, preferences, onUpdate }) => {
  if (!isOpen) return null;

  // Default to LocalStorage, fallback to constants from file
  const [dbUrl, setDbUrl] = useState(localStorage.getItem('supabase_url') || MANUAL_URL);
  const [dbKey, setDbKey] = useState(localStorage.getItem('supabase_anon_key') || MANUAL_KEY);

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

            {/* Automation Section */}
            <div>
                <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <Zap size={14}/> Automation
                </h4>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <label className="flex items-center justify-between cursor-pointer">
                        <div>
                            <span className="text-sm font-medium text-slate-800 block">Auto-Enrichment</span>
                            <span className="text-xs text-slate-500">Automatically fetch details (description, links) when adding plants.</span>
                        </div>
                        <input 
                            type="checkbox" 
                            checked={preferences.autoEnrichment}
                            onChange={(e) => onUpdate({ ...preferences, autoEnrichment: e.target.checked })}
                            className="w-5 h-5 text-leaf-600 rounded focus:ring-leaf-500 accent-leaf-600"
                        />
                    </label>
                </div>
            </div>

            {/* Hybrid Formatting Section */}
            <div>
                <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3">Formatting</h4>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <label className="text-sm font-medium text-slate-700 mb-2 block">Hybrid Symbol Spacing</label>
                    <p className="text-xs text-slate-500 mb-3">Choose how hybrid names are displayed (Intergeneric and Interspecific).</p>
                    
                    <div className="flex flex-col gap-3">
                        <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-white rounded border border-transparent hover:border-slate-200 transition-colors">
                            <input 
                                type="radio" 
                                name="hybridSpacing"
                                checked={preferences.hybridSpacing === 'nospace'}
                                onChange={() => onUpdate({ ...preferences, hybridSpacing: 'nospace' })}
                                className="text-leaf-600 focus:ring-leaf-500"
                            />
                            <div className="flex flex-col">
                                <span className="text-sm text-slate-800 font-medium">No Space</span>
                                <span className="text-xs text-slate-500 font-serif italic">×Mangave</span>
                                <span className="text-xs text-slate-500 font-serif italic">Salvia ×jamensis</span>
                            </div>
                        </label>
                        
                        <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-white rounded border border-transparent hover:border-slate-200 transition-colors">
                            <input 
                                type="radio" 
                                name="hybridSpacing"
                                checked={preferences.hybridSpacing === 'space'}
                                onChange={() => onUpdate({ ...preferences, hybridSpacing: 'space' })}
                                className="text-leaf-600 focus:ring-leaf-500"
                            />
                            <div className="flex flex-col">
                                <span className="text-sm text-slate-800 font-medium">With Space</span>
                                <span className="text-xs text-slate-500 font-serif italic">× Mangave</span>
                                <span className="text-xs text-slate-500 font-serif italic">Salvia × jamensis</span>
                            </div>
                        </label>
                    </div>
                </div>
            </div>

            {/* Grid Layout Section */}
            <div>
                <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <Layout size={14}/> Grid Layout
                </h4>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4">
                    
                    {/* Auto Fit Limit */}
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="text-sm font-medium text-slate-700">Auto Fit Limit</label>
                            <span className="text-xs font-mono text-slate-500">{preferences.autoFitMaxWidth || 400}px</span>
                        </div>
                        <p className="text-xs text-slate-500 mb-2">Maximum width for columns when using "Auto Fit".</p>
                        <input 
                            type="range" 
                            min="200" 
                            max="800" 
                            step="50"
                            value={preferences.autoFitMaxWidth || 400}
                            onChange={(e) => onUpdate({ ...preferences, autoFitMaxWidth: parseInt(e.target.value) })}
                            className="w-full accent-leaf-600"
                        />
                    </div>

                    <div className="h-px bg-slate-200"></div>

                    {/* Fit Screen Weight */}
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="text-sm font-medium text-slate-700">Fit Screen Max Ratio</label>
                            <span className="text-xs font-mono text-slate-500">{preferences.fitScreenMaxRatio || 4.0}x</span>
                        </div>
                        <p className="text-xs text-slate-500 mb-2">
                            When fitting to screen, prevent columns from being wider than X times the smallest column.
                        </p>
                        <input 
                            type="range" 
                            min="1.0" 
                            max="10.0" 
                            step="0.5"
                            value={preferences.fitScreenMaxRatio || 4.0}
                            onChange={(e) => onUpdate({ ...preferences, fitScreenMaxRatio: parseFloat(e.target.value) })}
                            className="w-full accent-leaf-600"
                        />
                        <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                            <span>Uniform Width (1x)</span>
                            <span>Allow Wide (10x)</span>
                        </div>
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
      </div>
    </div>
  );
};

export default SettingsModal;
