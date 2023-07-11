import { RDF } from "@inrupt/vocab-common-rdf"

/**
 * Pretty-print a URL. Use this only if for whatever 
 * reason you cannot access a proper label or if it
 * does not exist.
 * @param url URL of an entity
 * @returns string
 */
export const urlAsLabel = (url?: string | null) => {
    if (!url) return null
    if (!url.length) return ''
    if (url === RDF.type) return 'a'

    return url.split(/(#|\/)/).at(-1)
}
