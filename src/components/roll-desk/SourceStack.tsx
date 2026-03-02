import { useContext } from 'react'
import { PaperStretch } from 'linked-rolls'
import { EditionContext } from '../../providers/EditionContext'
import { SourcePreview } from './SourcePreview'

interface SourceStackProps {
    activeId?: string
    onClick: (copyId: string) => void
}

export const SourceStack = ({ activeId, onClick }: SourceStackProps) => {
    const { edition } = useContext(EditionContext)
    if (!edition || edition.copies.length === 0) return null

    // Compute global bounds across all copies (union of collated + original extents)
    let globalMinX = Infinity
    let globalMaxX = -Infinity

    for (const copy of edition.copies) {
        const shift = copy.measurements.shift?.horizontal || 0
        const stretchCondition = copy.conditions.find(c => c.type === 'paper-stretch')
        const stretch = stretchCondition ? (stretchCondition as PaperStretch).factor : 1

        for (const feature of copy.features) {
            // Collated positions
            globalMinX = Math.min(globalMinX, feature.horizontal.from)
            globalMaxX = Math.max(globalMaxX, feature.horizontal.to)

            // Original positions (undo transform)
            const origFrom = (feature.horizontal.from - shift) / stretch
            const origTo = (feature.horizontal.to - shift) / stretch
            globalMinX = Math.min(globalMinX, origFrom)
            globalMaxX = Math.max(globalMaxX, origTo)
        }
    }

    // Fallback if no features anywhere
    if (!isFinite(globalMinX) || !isFinite(globalMaxX)) {
        globalMinX = 0
        globalMaxX = 100
    }

    // Add padding to bounds
    const rangePad = (globalMaxX - globalMinX) * 0.02
    const bounds = {
        minX: globalMinX - rangePad,
        maxX: globalMaxX + rangePad
    }

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
                />
            ))}
        </div>
    )
}
