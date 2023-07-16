import * as rdf from "rdflib";

export const crm = (name: string) => `http://www.cidoc-crm.org/cidoc-crm/${name}`
export const dcterms = (name: string) => `http://purl.org/dc/terms/${name}`
export const crmdig = (name: string) => `http://www.ics.forth.gr/isl/CRMdig/${name}`
export const frbroo = (name: string) => `http://iflastandards.info/ns/fr/frbr/frbroo/${name}`
export const nivers = (name: string) => `https://raw.githubusercontent.com/digimuwi/cadence-parfaite/main/ontologies/nivers1667.ttl#${name}`
export const crminf = (name: string) => `http://www.cidoc-crm.org/cidoc-crm/CRMinf/${name}`
export const midi = (name: string) => `http://purl.org/midi-ld/midi#${name}`
export const mer = (name: string) => `https://measuring-early-records.org/${name}`
export const oa = (name: string) => `http://www.w3.org/ns/oa#${name}`

// TODO: get rid of the following declarations
export const OA = new (rdf.Namespace as any)('http://www.w3.org/ns/oa#');
export const ME = new (rdf.Namespace as any)('https://measuring-early-records.org/');
export const RDF = new (rdf.Namespace as any)('http://www.w3.org/1999/02/22-rdf-syntax-ns#');
export const DC = new (rdf.Namespace as any)('http://purl.org/dc/terms/');
export const LA = new (rdf.Namespace as any)('https://measuring-early-records.org/linked_alignment#');
