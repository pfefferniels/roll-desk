import { Thing, UrlString, getUrl } from "@inrupt/solid-client"
import { Pair } from "./Pair"
import { urlAsLabel } from "../../helpers/urlAsLabel"
import React, { useEffect, useState } from "react"
import { mer } from "../../helpers/namespaces"

export const findDOMElementFor = (url: UrlString) => {
    const id = urlAsLabel(url)
    if (!id) return null
    return document.querySelector(`*[data-id="${id}"]`)
}

interface PairContainerProps {
    pairs: Thing[]
    parentRef: Element | null
    color?: string
    onRemove?: (pair: Thing) => void
    onSelect?: (pair: Thing) => void
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
                const midiId = getUrl(pair, mer('has_midi_note'))?.split('#').at(-1)
                const noteId = getUrl(pair, mer('has_score_note'))?.split('#').at(-1)
                if (!midiId || !noteId) return null

                const midiEl = findDOMElementFor(midiId)
                const noteEl = findDOMElementFor(noteId)
                if (!midiEl || !noteEl) return null

                return (
                    <g key={`connection_${midiId}_${noteId}`}>
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