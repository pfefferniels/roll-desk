import { Drawer } from "@mui/material"
import { useNoteContext } from "../../providers/NoteContext"
import { getUrlAll, thingAsMarkdown } from "@inrupt/solid-client"
import { RDF } from "@inrupt/vocab-common-rdf"
import { crm, midi } from "../../helpers/namespaces"
import { NoteDetails } from "./NoteDetails"

export const Details = () => {
    const { currentSelection } = useNoteContext()

    const renderDetails = () => {
        if (!currentSelection) {
            return <span>nothing selected</span>
        }
        else if (getUrlAll(currentSelection, crm('P2_has_type')).includes(midi('NoteEvent'))) {
            return <NoteDetails thing={currentSelection} />
        }
        else {
            return thingAsMarkdown(currentSelection)
        }
    }

    return (
        <Drawer
            PaperProps={{
                sx: { width: '20vw' },
            }} anchor='right'
            open={true}
            variant='persistent'
        >
            {renderDetails()}
        </Drawer>
    )
}
