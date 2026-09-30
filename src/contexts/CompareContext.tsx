import { createContext, useContext } from 'react';
import { Scheme } from '../types';

export interface CompareContextProps {
  comparedSchemes: Scheme[];
  addToCompare: (scheme: Scheme) => { success: boolean; message: string };
  removeFromCompare: (id: string) => void;
  isInCompare: (id: string) => boolean;
  clearCompare: () => void;
}

export const CompareContext = createContext<CompareContextProps | undefined>(undefined);

export const useCompare = () => {
  const context = useContext(CompareContext);
  if (!context) {
    throw new Error('useCompare must be used within a CompareProvider');
  }
  return context;
};
