import React from 'react';
import { Sprout } from 'lucide-react';

const EmptyState: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="bg-leaf-50 p-6 rounded-full mb-6 animate-bounce-slow">
        <Sprout size={48} className="text-leaf-500" />
      </div>
      <h3 className="text-2xl font-serif text-slate-800 mb-2">Your Garden is Empty</h3>
      <p className="text-slate-500 max-w-md mx-auto">
        Start cataloging your botanical collection. Enter a plant name above to let our AI curator standardize and file it for you.
      </p>
    </div>
  );
};

export default EmptyState;