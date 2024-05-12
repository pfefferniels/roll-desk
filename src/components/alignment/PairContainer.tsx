import { Thing, UrlString, getUrl } from "@inrupt/solid-client"
import { Pair } from "./Pair"
import { urlAsLabel } from "../../helpers/urlAsLabel"
import React, { useEffect, useState } from "react"
import { mer } from "../../helpers/namespaces"

export const findDOMElementFor = (url: UrlString) => {
    return document.querySelector(`*[data-id="${url}"]`)
}

interface PairContainerProps {
    pairs: Thing[]
    parentRef: Element | null
    ready: boolean
    color?: string
    onRemove?: (pair: Thing) => void
    onSelect?: (pair: Thing) => void
}

export const PairContainer = ({ ready, pairs, parentRef, color, onRemove, onSelect }: PairContainerProps) => {
    const [, setRerender] = useState(0)

    useEffect(() => {
        if (!parentRef) return

        const roll = document.querySelector('#roll')
        const score = document.querySelector('.verovioCanvas svg')

        if (!roll || !score) return

        const rollObserver = new MutationObserver(() => setRerender(prev => prev + 1))
        rollObserver.observe(roll, {
            attributes: true
        })

        const scoreObserver = new MutationObserver(() => setRerender(prev => prev + 1))
        scoreObserver.observe(score, {
            attributes: true
        })


        return () => {
            rollObserver.disconnect()
            scoreObserver.disconnect()
        }
    }, [ready, parentRef])

    if (!parentRef) return null

    return (
        <>
            {pairs.map(pair => {
                const midiId = getUrl(pair, mer('has_event'))
                const noteId = getUrl(pair, mer('has_score_note'))?.split('#').at(-1)
                if (!midiId || !noteId) return null

                const midiEl = findDOMElementFor(midiId)
                const noteEl = findDOMElementFor(noteId)
                console.log(midiId, midiEl, noteEl)
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