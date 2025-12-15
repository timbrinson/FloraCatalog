
import React from 'react';
import { Sprout, Database, Settings } from 'lucide-react';

interface EmptyStateProps {
    isOffline?: boolean;
    onOpenSettings?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ isOffline, onOpenSettings }) => {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center h-full">
      <div className={`p-6 rounded-full mb-6 ${isOffline ? 'bg-slate-100' : 'bg-leaf-50 animate-bounce-slow'}`}>
        {isOffline ? <Database size={48} className="text-slate-400" /> : <Sprout size={48} className="text-leaf-500" />}
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
      ) : (
          <>
            <h3 className="text-2xl font-serif text-slate-800 mb-2">Your Garden is Empty</h3>
            <p className="text-slate-500 max-w-md mx-auto">
                Start cataloging your botanical collection. Enter a plant name above to let our AI curator standardize and file it for you.
            </p>
          </>
      )}
    </div>
  );
};

export default EmptyState;
