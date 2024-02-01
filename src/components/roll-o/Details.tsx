import { Drawer } from "@mui/material"
import { Thing, thingAsMarkdown } from "@inrupt/solid-client"
import { NoteOnOffDetails } from "./NoteOnOffDetails"
import { PedalDetails } from "./PedalDetails"
import { typeOf } from "../../helpers/typeOfEvent"

interface DetailsProps {
    thing: Thing
    e13s?: Thing[]
    onChange: (e13: Thing) => void
}

export const Details = ({ thing, e13s, onChange }: DetailsProps) => {
    const renderDetails = () => {
        if (!thing) {
            return <span>nothing selected</span>
        }
        else if (typeOf(thing) === 'noteOn' || typeOf(thing) === 'noteOff') {
            return <NoteOnOffDetails onChange={onChange} thing={thing} e13s={e13s} />
        }
        else if (typeOf(thing) === 'pedal') {
            return <PedalDetails onChange={onChange} thing={thing} e13s={e13s} />
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
