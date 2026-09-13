import { Link } from "@mui/material"
import { useContext } from "react"
import { EditionContext } from "../../providers/EditionContext"
import { OpenContext } from "../../providers/OpenContext"
import { nameOf } from "../../helpers/names"

interface EntityLinkProps {
    id: string
    /** Given where the entity has no name a reader calls it by, as an edit has none. */
    label?: string
}

/** An entity of the edition named in running text, opening it on the desk. */
export const EntityLink = ({ id, label }: EntityLinkProps) => {
    const { view } = useContext(EditionContext)
    const open = useContext(OpenContext)

    return (
        <Link component='button' onClick={() => open(id)} sx={{ font: 'inherit', verticalAlign: 'baseline', textAlign: 'left' }}>
            {label ?? (view && nameOf(view, id)) ?? id}
        </Link>
    )
}
