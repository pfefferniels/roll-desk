import { migrate, validate } from "linked-rolls"

/** A document in the current format, with what the schema still finds wrong with it. */
export type CheckedDocument = {
    document: unknown
    errors: string[]
}

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
