import { useState } from "react"
import { usePair } from "../../providers/PairData"
import { findDOMElementFor } from "./PairContainer"
import { InsertReadingDialog } from "./InsertReadingDialog"
import { useMEI } from "../../providers/MEIContext"

interface InsertReadingProps {
    parent: Element
    attachTo: string
}

export const InsertReadingOverlay = ({ parent, attachTo }: InsertReadingProps) => {
    const { midiEvents } = usePair(attachTo)
    const { mei, updateMEI } = useMEI()

    const [insertReadingDialogOpen, setInsertReadingDialogOpen] = useState(false)

    const parentBox = parent.getBoundingClientRect()
    const parentX = parentBox.x
    const parentY = parentBox.y

    const targetEl = findDOMElementFor(attachTo)
    if (!targetEl) return null

    const x = targetEl.getBoundingClientRect().x - parentX
    const y = targetEl.getBoundingClientRect().y - parentY

    const handleClick = () => {
        setInsertReadingDialogOpen(true)
    }

    return (
        <>
            <circle
                cx={x}
                cy={y}
                r={7}
                fill="blue"
                fillOpacity={0.1}
                stroke='black'
                strokeWidth={0.5}
                onClick={handleClick} />

            <foreignObject>
                {mei && <InsertReadingDialog
                    open={insertReadingDialogOpen}
                    onClose={() => setInsertReadingDialogOpen(false)}
                    meiId={attachTo}
                    midiEvents={midiEvents}
                    mei={mei}
                    updateMEI={updateMEI} />}
            </foreignObject>

        </>
    )
}