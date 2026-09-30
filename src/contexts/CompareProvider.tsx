import React, { useState } from 'react';
import { Scheme } from '../types';
import { CompareContext } from './CompareContext';

export const CompareProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [comparedSchemes, setComparedSchemes] = useState<Scheme[]>([]);

  const addToCompare = (scheme: Scheme) => {
    if (comparedSchemes.find(s => s.id === scheme.id)) {
      return { success: false, message: 'Scheme is already added to comparison.' };
    }
    if (comparedSchemes.length >= 3) {
      return { success: false, message: 'You can compare a maximum of 3 schemes.' };
    }
    setComparedSchemes(prev => [...prev, scheme]);
    return { success: true, message: 'Scheme added to comparison.' };
  };

  const removeFromCompare = (id: string) => {
    setComparedSchemes(prev => prev.filter(s => s.id !== id));
  };

  const isInCompare = (id: string) => {
    return comparedSchemes.some(s => s.id === id);
  };

  const clearCompare = () => {
    setComparedSchemes([]);
  };

  return (
    <CompareContext.Provider
      value={{
        comparedSchemes,
        addToCompare,
        removeFromCompare,
        isInCompare,
        clearCompare
      }}
    >
      {children}
    </CompareContext.Provider>
  );
};
