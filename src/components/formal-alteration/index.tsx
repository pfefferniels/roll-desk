import { Thing } from "@inrupt/solid-client"
import { PlayArrowRounded } from "@mui/icons-material"
import { Button, IconButton, Typography } from "@mui/material"
import { useState } from "react"
import { FindEntity } from "../network-overview/FindEntity"

type SelectionMode = 'score' | 'midi'

export const FormalAlterationEditor = () => {
    const [entityFinderOpen, setEntityFinderOpen] = useState(false)
    const [selectionMode, setSelectionMode] = useState<SelectionMode>()

    const handleFindEntity = (type: SelectionMode) => {
        setSelectionMode(type)
        setEntityFinderOpen(true)
    }

    return (
        <div>
            <Typography>
                Here you can encode a particular structure of formal alterations
                which a performer applied to a given score.
            </Typography>

            <div>
                <Button onClick={() => handleFindEntity('score')}>Choose Score</Button>
                <Button onClick={() => handleFindEntity('midi')}>Choose MIDI</Button>
            </div>

            <IconButton>
                <PlayArrowRounded />
            </IconButton>

            <div>
                Score
            </div>

            <div>
                <h3>Alterations Overview</h3>
            </div>

            <FindEntity
                type='http://www.cidoc-crm.org/cidoc-crm/E31_Document'
                open={entityFinderOpen}
                onClose={() => setEntityFinderOpen(false)}
                onFound={(thing: Thing) => {
                    if (selectionMode === 'midi') {
                        // Use thing to play it
                    }
                    else if (selectionMode === 'score') {
                        // Use thing to display score
                    }
                }} />
        </div>
    )
}