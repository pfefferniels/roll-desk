import { partsOfNote } from "linked-rolls"
import { EntityLink } from "./EntityLink"

/**
 * A note as it reads. Where it refers to a version or a copy, the name
 * the edition gives that entity now stands in its place, so that prose
 * written once follows the stemma as it changes. Where it refers to a
 * command or an edit, which the edition names nothing, the note's own
 * words stand there and open it on the desk.
 */
export const NoteText = ({ note }: { note: string }) => (
    <>
        {partsOfNote(note).map((part, index) => part.type === 'text'
            ? <span key={index}>{part.text}</span>
            : <EntityLink key={index} id={part.id} label={part.label} />)}
    </>
)
