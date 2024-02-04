import { Cutout } from "linked-rolls/lib/.ldo/rollo.typings";
import { roundedHull } from "../../helpers/roundedHull";
import { useState } from "react";

interface CutoutViewerProps {
    cutout: Cutout
    onRemove: () => void
}

const CutoutViewer = ({ cutout, onRemove }: CutoutViewerProps) => {
    const [active, setActive] = useState(false)

    const points: [number, number][] = []
    for (const iri of cutout.P106IsComposedOf) {
        const corresp = document.getElementById(iri["@id"]) as SVGGraphicsElement | null
        if (!corresp) continue
        const bbox = corresp.getBBox()
        points.push([bbox.x, bbox.y])
        points.push([bbox.x, bbox.y + bbox.height])
        points.push([bbox.x + bbox.width, bbox.y])
        points.push([bbox.x + bbox.width, bbox.y + bbox.height])
    }
    const hull = roundedHull(points, 0.5)

    return (
        <path
            className='selection'
            filter={active ? 'url(#purple-glow)' : ''}
            fill='gray'
            fillOpacity={0.3}
            d={hull}
            onClick={(e) => {
                if (e.altKey && e.shiftKey) {
                    onRemove()
                    return
                }
                setActive(!active)
            }} />
    )
}

interface CutoutContainerProps {
    cutouts: Cutout[]
    setCutouts: (cutouts: Cutout[]) => void
}

export const CutoutContainer = ({ cutouts, setCutouts }: CutoutContainerProps) => {
    return (
        <>
            {cutouts.map((cutout, i) => (
                <CutoutViewer
                    cutout={cutout}
                    key={`cutout_${i}`}
                    onRemove={() => {
                        cutouts.splice(i, 1)
                        setCutouts([...cutouts])
                    }} />
            ))}
        </>
    )
}