import { createContext, useContext } from 'react';

export const WorksWorldModeContext = createContext(false);

export function useWorksWorldMode(): boolean {
  return useContext(WorksWorldModeContext);
}
