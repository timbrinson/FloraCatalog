
import React from 'react';
import { X, Settings, Layout, Zap } from 'lucide-react';
import { UserPreferences } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  preferences: UserPreferences;
  onUpdate: (newPrefs: UserPreferences) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, preferences, onUpdate }) => {
  if (!isOpen) return null;

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
