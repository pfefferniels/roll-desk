import { Drawer } from "@mui/material"
import { useNoteContext } from "../../providers/NoteContext"
import { getUrlAll, thingAsMarkdown } from "@inrupt/solid-client"
import { RDF } from "@inrupt/vocab-common-rdf"
import { crm, midi } from "../../helpers/namespaces"
import { NoteDetails } from "./NoteDetails"

export const Details = () => {
    const { selectedNote } = useNoteContext()

    const renderDetails = () => {
        if (!selectedNote) {
            return <span>nothing selected</span>
        }
        else if (getUrlAll(selectedNote, crm('P2_has_type')).includes(midi('NoteEvent'))) {
            return <NoteDetails thing={selectedNote} />
        }
        else {
            return thingAsMarkdown(selectedNote)
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
