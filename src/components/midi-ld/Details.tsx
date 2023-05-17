import { Drawer } from "@mui/material"
import { useNoteContext } from "../../providers/NoteContext"
import { thingAsMarkdown } from "@inrupt/solid-client"

export const Details = () => {
    const { currentSelection } = useNoteContext()

    return (
        <Drawer
            PaperProps={{
                sx: { width: '20vw' },
            }} anchor='right'
            open={true}
            variant='persistent'
        >
            {currentSelection && thingAsMarkdown(currentSelection)}
        </Drawer>
    )
}
