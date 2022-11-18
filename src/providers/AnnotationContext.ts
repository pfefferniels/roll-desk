import { createContext } from 'react';

export interface AnnotationContextInterface {
  targets: string[]
  setTargets: (targets: string[]) => void
}

export const AnnotationContext = createContext<AnnotationContextInterface>({
  targets: [],
  setTargets: () => {}
});
