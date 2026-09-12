import { useContext } from 'react'
import { barOf, Edition, mm, RollCopy } from 'linked-rolls'
import { EditionContext } from '../../providers/EditionContext'
import { asRead, SourcePreview } from './SourcePreview'
import { padded, Span, spanning } from '../../helpers/scale'

interface SourceStackProps {
    activeId?: string
    onClick: (copyId: string) => void
}

/** The stretch a stack of previews shares where no copy has been measured. */
const nothingMeasured: Span = { from: mm(0), to: mm(100) }

/** How far a copy reaches, both where it was collated to and where it was read. */
const reachOf = (copy: RollCopy): (Span | undefined)[] => {
    const place = asRead(copy)
    return copy.features.flatMap(feature => [
        { from: feature.horizontal.from, to: feature.horizontal.to },
        { from: place(feature.horizontal.from), to: place(feature.horizontal.to) }
    ])
}

/** The axis every preview in the stack is drawn against, so they can be compared. */
const boundsOf = (edition: Edition): Span => {
    const covered = spanning(edition.copies.flatMap(reachOf))
    return covered ? padded(covered, 0.02) : nothingMeasured
}

export const SourceStack = ({ activeId, onClick }: SourceStackProps) => {
    const { edition } = useContext(EditionContext)
    if (!edition || edition.copies.length === 0) return null

    const bounds = boundsOf(edition)

    return (
        <div>
            {edition.copies.map((copy, index) => (
                <SourcePreview
                    key={copy.id}
                    copy={copy}
                    copyIndex={index}
                    active={copy.id === activeId}
                    onClick={() => onClick(copy.id)}
                    globalBounds={bounds}
                    bar={barOf(copy)}
                />
            ))}
        </div>
    )
}
