import { Dispatch, SetStateAction, useState } from 'react'

/**
 * A draft of `value` which the field editing it owns, so that typing
 * redraws the field alone. Whenever `value` moves elsewhere the draft
 * follows it, which happens while rendering rather than in an effect, so
 * that no pass is spent showing what has just been superseded.
 *
 * @see https://react.dev/learn/you-might-not-need-an-effect
 */
export const useDraft = <T>(value: T): [T, Dispatch<SetStateAction<T>>] => {
    const [draft, setDraft] = useState(value)
    const [seen, setSeen] = useState(value)

    if (value !== seen) {
        setSeen(value)
        setDraft(value)
    }

    return [draft, setDraft]
}
