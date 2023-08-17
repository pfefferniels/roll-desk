import { UrlString } from "@inrupt/solid-client"
import { Pair } from "./Pair"
import { urlAsLabel } from "../../helpers/urlAsLabel"
import React, { useEffect, useState } from "react"
import { PairT } from "./AlignmentEditor"
import { InsertReadingOverlay } from "./InsertReadingOverlay"

export const findDOMElementFor = (url: UrlString) => {
    const id = urlAsLabel(url)
    if (!id) return null
    return document.querySelector(`*[data-id="${id}"]`)
}

interface PairContainerProps {
    pairs: PairT[]
    parentRef: Element | null
    color?: string
    onRemove?: (pair: PairT) => void
    onSelect?: (pair: PairT) => void
}

export const PairContainer = ({ pairs, parentRef, color, onRemove, onSelect }: PairContainerProps) => {
    const [rerender, setRerender] = useState(0)

    useEffect(() => {
        if (!parentRef) return

        const roll = document.querySelector('#roll')
        const score = parentRef.querySelector('.verovioCanvas svg')
        if (!roll || !score) return

        const observer = new MutationObserver(() => setRerender(prev => prev + 1))
        observer.observe(roll, {
            attributes: true
        })

        return () => observer.disconnect()
    }, [parentRef])

    if (!parentRef) return null

    return (
        <>
            {pairs.map(pair => {
                if (!pair.midiEventUrl || !pair.meiId) return null

                const midiEl = findDOMElementFor(pair.midiEventUrl)
                const noteEl = findDOMElementFor(pair.meiId)

                if (!midiEl || !noteEl) return null

                let action: JSX.Element | null = null
                if (pair.type === 'alteration') {
                    action = (
                        <InsertReadingOverlay
                            parent={parentRef}
                            attachTo={pair.meiId} />
                    )
                }

                return (
                    <g key={`connection_${pair.midiEventUrl}_${pair.meiId}`}>
                        {action}
                        <Pair
                            parent={parentRef}
                            from={midiEl.querySelector('.notehead') || midiEl}
                            to={noteEl.querySelector('.notehead') || noteEl}
                            color={color || 'gray'}
                            onAltShiftClick={() => onRemove && onRemove(pair)}
                            onClick={() => onSelect && onSelect(pair)}
                        />
                    </g>
                )
            }
            )}
        </>
    )
}