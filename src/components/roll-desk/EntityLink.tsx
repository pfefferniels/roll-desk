import { Link } from "@mui/material"
import { MouseEvent, useContext } from "react"
import { EditionContext } from "../../providers/EditionContext"
import { OpenContext } from "../../providers/OpenContext"
import { pathOf } from "../../helpers/addresses"
import { nameOf } from "../../helpers/names"

interface EntityLinkProps {
    id: string
    /**
     * Stands in where the entity has no name a reader calls it by, as an
     * edit and a command have none. The name wins where the edition
     * gives one, so a siglum written out cannot outlive the stemma.
     */
    label?: string
}

/** Whether the reader asked for the link to open beside what they are reading. */
const opensBeside = (event: MouseEvent) =>
    event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0

/**
 * An entity of the edition named in running text. A plain click opens it
 * on the desk, which closes whatever the link was read in. The link
 * carries the entity's address as well, so that a reader who wants to
 * keep their place can open it in a tab of its own, and so that the
 * address can be copied out of a note.
 */
export const EntityLink = ({ id, label }: EntityLinkProps) => {
    const { view } = useContext(EditionContext)
    const open = useContext(OpenContext)

    // Only a published edition has addresses; an edition being edited has none.
    const href = view?.edition.base ? pathOf(id) : undefined

    return (
        <Link
            component={href ? 'a' : 'button'}
            href={href}
            onClick={(event: MouseEvent) => {
                if (href && opensBeside(event)) return
                event.preventDefault()
                open(id)
            }}
            sx={{ font: 'inherit', verticalAlign: 'baseline', textAlign: 'left' }}
        >
            {(view && nameOf(view, id)) ?? label ?? id}
        </Link>
    )
}
