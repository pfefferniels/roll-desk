import { Button, Drawer, Stack } from "@mui/material"
import { CollatedEvent, Lemma } from "linked-rolls/lib/types"
import { useState } from "react"
import { v4 } from "uuid"

interface LemmatizeProps {
    open: boolean
    selection: CollatedEvent[]
    clearSelection: () => void
    onDone: (lemma: Lemma) => void
}

export const Lemmatize = ({ selection, clearSelection, onDone, open }: LemmatizeProps) => {
    const [lemma, setLemma] = useState<CollatedEvent[]>([])
    const [otherReading, setOtherReading] = useState<CollatedEvent[]>([])

    return (
        <Drawer open={open} variant='persistent'>
            <Stack direction='column'>
                <Button
                    onClick={() => {
                        setLemma(selection)
                        clearSelection()
                    }}>
                    Mark Lemma
                </Button>
                <div>
                    {lemma.map(e => e.id).join(' ')}
                </div>
                <Button onClick={() => {
                    setOtherReading(selection)
                    clearSelection()
                }}>
                    Mark Other Reading
                </Button>
                <div>
                    {otherReading.map(e => e.id).join(' ')}
                </div>
                <Button
                    onClick={() => {
                        onDone({
                            type: 'lemma',
                            carriedOutBy: 'abc',
                            id: v4(),
                            preferred: lemma,
                            over: otherReading
                        })

                        setLemma([])
                        setOtherReading([])
                    }}
                    variant='contained'>
                    Done
                </Button>
            </Stack>
        </Drawer>
    )
}