import { Drawer } from "@mui/material"
import { Thing, getUrlAll, thingAsMarkdown } from "@inrupt/solid-client"
import { RDF } from "@inrupt/vocab-common-rdf"
import { crm, midi } from "../../helpers/namespaces"
import { NoteDetails } from "./NoteDetails"

interface DetailsProps {
    thing: Thing
    onChange: (e13: Thing) => void
}

export const Details = ({ thing, onChange }: DetailsProps) => {
    const renderDetails = () => {
        if (!thing) {
            return <span>nothing selected</span>
        }
        else if (getUrlAll(thing, crm('P2_has_type')).includes(midi('NoteEvent'))) {
            return <NoteDetails onChange={onChange} thing={thing} />
        }
        else {
            return thingAsMarkdown(thing)
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
