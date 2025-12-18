
import React from 'react';
import { Sprout, Database, Settings, AlertCircle, RefreshCcw } from 'lucide-react';
import { LoadingState } from '../types';

interface EmptyStateProps {
    isOffline?: boolean;
    loadingState?: LoadingState;
    errorDetails?: string | null;
    onOpenSettings?: () => void;
    onRetry?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ 
  isOffline, 
  loadingState, 
  errorDetails, 
  onOpenSettings, 
  onRetry 
}) => {
  const isError = loadingState === LoadingState.ERROR;

  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center h-full">
      <div className={`p-6 rounded-full mb-6 ${
        isOffline ? 'bg-slate-100' : 
        isError ? 'bg-red-50' : 
        'bg-leaf-50 animate-bounce-slow'
      }`}>
        {isOffline ? (
          <Database size={48} className="text-slate-400" />
        ) : isError ? (
          <AlertCircle size={48} className="text-red-500" />
        ) : (
          <Sprout size={48} className="text-leaf-500" />
        )}
      </div>
      
      {isOffline ? (
          <>
            <h3 className="text-2xl font-serif text-slate-800 mb-2">Database Disconnected</h3>
            <p className="text-slate-500 max-w-md mx-auto mb-6">
                The application cannot connect to the botanical database. Please configure your Supabase credentials.
            </p>
            <button 
                onClick={onOpenSettings}
                className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors shadow-lg"
            >
                <Settings size={18} />
                Configure Connection
            </button>
          </>
      ) : isError ? (
          <>
            <h3 className="text-2xl font-serif text-red-800 mb-2">Connection Error</h3>
            <div className="bg-red-50 border border-red-100 p-4 rounded-lg mb-6 max-w-lg">
                <p className="text-xs font-mono text-red-600 text-left overflow-auto max-h-32">
                    {errorDetails || "An unknown error occurred while communicating with Postgres."}
                </p>
            </div>
            <div className="flex gap-3">
                <button 
                    onClick={onRetry}
                    className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors shadow-lg"
                >
                    <RefreshCcw size={18} />
                    Try Again
                </button>
                <button 
                    onClick={onOpenSettings}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                    <Settings size={18} />
                    Check Keys
                </button>
            </div>
            <p className="mt-6 text-sm text-slate-400 max-w-md">
                Hint: Make sure you have run the schema script in your Supabase SQL editor (`scripts/wcvp_schema.sql.txt`) and the table 'app_taxa' exists.
            </p>
          </>
      ) : (
          <>
            <h3 className="text-2xl font-serif text-slate-800 mb-2">Your Garden is Empty</h3>
            <p className="text-slate-500 max-w-md mx-auto">
                Start cataloging your botanical collection. Enter a plant name above to let our AI curator standardize and file it for you.
            </p>
            <p className="mt-4 text-xs text-slate-400 italic">
                If you have imported the WCVP data, ensure you have run the "Populate" step (Step 4) to move data from 'wcvp_import' to 'app_taxa'.
            </p>
          </>
      )}
    </div>
  );
};

export default EmptyState;
