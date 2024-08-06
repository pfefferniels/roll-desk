import { Button, Drawer, Stack } from "@mui/material"
import { CollatedEvent, Reading, Relation } from "linked-rolls/lib/types"
import { useState } from "react"
import { v4 } from "uuid"

interface RelateProps {
    open: boolean
    selection: CollatedEvent[]
    clearSelection: () => void
    onDone: (relation: Relation) => void
}

export const Relate = ({ selection, clearSelection, onDone, open }: RelateProps) => {
    const [readings, setReadings] = useState<Reading[]>([])

    return (
        <Drawer open={open} variant='persistent'>
            <Stack direction='column'>
                <div>
                    Identified readings: {readings.length}
                </div>
                <Button
                    disabled={selection.length === 0}
                    onClick={() => {
                        setReadings((prev) => {
                            prev.push({
                                contains: selection
                            })
                            return prev
                        })
                        clearSelection()
                    }}>
                    Mark Reading ({selection.length})
                </Button>

                <Button
                    onClick={() => {
                        onDone({
                            type: 'relation',
                            carriedOutBy: '#np',
                            id: v4(),
                            relates: readings
                        })

                        setReadings([])
                    }}
                    variant='contained'>
                    Done
                </Button>
            </Stack>
        </Drawer>
    )
}
