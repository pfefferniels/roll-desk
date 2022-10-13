import { createContext } from 'react';
import { Store } from 'rdflib';

export interface RDFStoreInterface {
  rdfStore: Store;
}

export const RdfStoreContext = createContext<RDFStoreInterface | null>(null);
