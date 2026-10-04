import { Named } from "linked-rolls"

/** The authorities an edition links its names to, told apart by the shape of their URIs. */
const authorities = [
    { name: 'GND', uri: /^https?:\/\/d-nb\.info\/gnd\/([^/]+)$/ },
    { name: 'Wikidata', uri: /^https?:\/\/www\.wikidata\.org\/(?:entity|wiki)\/(Q\d+)$/ },
    { name: 'GeoNames', uri: /^https?:\/\/sws\.geonames\.org\/(\d+)\/?$/ },
    { name: 'LCNAF', uri: /^https?:\/\/id\.loc\.gov\/authorities\/names\/([^/]+)$/ },
    { name: 'ORCID', uri: /^https?:\/\/orcid\.org\/([\dX-]+)$/ }
]

/** Where a record is kept: by an authority, under a number there, or else on a page of its own. */
export interface AuthorityRecord {
    /** The authority, "GND"; for a page no authority keeps, its host, "nettheim.com". */
    keeper: string
    /** The number the authority keeps the record under. */
    id?: string
}

/** Where the record at the URI is kept. */
export const recordAt = (uri: string): AuthorityRecord => {
    for (const { name, uri: shape } of authorities) {
        const [, id] = shape.exec(uri) ?? []
        if (id) return { keeper: name, id }
    }
    return { keeper: URL.canParse(uri) ? new URL(uri).host.replace(/^www\./, '') : uri }
}

/** The record named by its authority and number, "GND 300145322", or else by its URI. */
export const recordLabel = (uri: string): string => {
    const { keeper, id } = recordAt(uri)
    return id ? `${keeper} ${id}` : uri
}

/** The records the edition links to the name, leaving out those it writes blank. */
export const recordsOf = (named: Named): string[] =>
    named.sameAs.map(uri => uri.trim()).filter(Boolean)
