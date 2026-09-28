import { RollCopy } from "linked-rolls"

/** Who holds the copy, as a sentence can name them. */
export const heldBy = (copy: RollCopy): string => copy.keeper?.name.trim() || 'an unnamed keeper'
