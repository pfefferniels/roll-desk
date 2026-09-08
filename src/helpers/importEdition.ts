import { Edition, importJsonLd, migrate, validate } from "linked-rolls"

/** A document in the current format, with what the schema still finds wrong with it. */
export type CheckedDocument = {
    document: unknown
    errors: string[]
}

/** What was read, or why nothing was. */
export type Reading<T> = { value: T } | { refusal: string }

const reasonOf = (error: unknown): string =>
    error instanceof Error ? error.message : String(error)

/** What the call yields, or, where it throws, its reason worded as a refusal. */
const attempted = <T>(call: () => T, refusedAs: (reason: string) => string): Reading<T> => {
    try {
        return { value: call() }
    } catch (error) {
        return { refusal: refusedAs(reasonOf(error)) }
    }
}

const jsonExtensions = new Set(['json', 'jsonld'])

const extensionOf = (fileName: string): string =>
    fileName.split('.').pop()?.toLowerCase() ?? ''

/** Why no edition can be read from the file, or nothing if one can. */
export const refusalToOpen = (fileName: string): string | undefined =>
    jsonExtensions.has(extensionOf(fileName))
        ? undefined
        : `${fileName} is not a .json or .jsonld file. An edition is saved as one of those.`

/** A non-object is nothing to migrate: the schema turns it down as it stands. */
const migrated = (json: unknown): unknown =>
    json !== null && typeof json === 'object' ? migrate(json) : json

/**
 * A document read as `importJsonLd` will read it: migrated first, then
 * held against the schema. Judging the file as it stands would report an
 * older format as broken, although the import brings it up to date.
 */
export const checkedDocument = (json: unknown): CheckedDocument => {
    const document = migrated(json)
    return {
        document,
        errors: validate(document)
            ? []
            : (validate.errors || []).map(error => `${error.instancePath} ${error.message}`)
    }
}

const parsed = (text: string): Reading<unknown> =>
    attempted(() => JSON.parse(text), reason => `This file could not be read as JSON: ${reason}`)

/** The checked document a file's text holds, or why the desk takes none from it. */
export const readDocument = (text: string): Reading<CheckedDocument> => {
    const json = parsed(text)
    return 'refusal' in json
        ? json
        : attempted(
            () => checkedDocument(json.value),
            reason => `This file could not be brought up to the current format: ${reason}`
        )
}

/** The edition the document states, or why the library refuses to read one from it. */
export const importedEdition = (document: CheckedDocument['document']): Reading<Edition> =>
    attempted(
        () => importJsonLd(document),
        reason => `This document could not be read as an edition: ${reason}`
    )
