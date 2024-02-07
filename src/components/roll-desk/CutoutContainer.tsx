import { Cutout } from "linked-rolls/lib/.ldo/rollo.typings";
import { roundedHull } from "../../helpers/roundedHull";
import { useContext, useEffect, useRef, useState } from "react";
import { InterpretationNode } from "../works/InterpretationNode";
import { DatasetContext, useSession } from "@inrupt/solid-ui-react";
import { Thing, getThingAll, getUrl, getUrlAll } from "@inrupt/solid-client";
import { crmdig } from "../../helpers/namespaces";
import * as d3 from 'd3';

export interface Node extends d3.SimulationNodeDatum {
    type: 'interpretation' | 'cutout'
    thing: Thing
}

interface CutoutViewerProps {
    cutout: Cutout
    active: boolean
    onActivate: () => void
    onRemove: () => void
}

const CutoutViewer = ({ cutout, onRemove, active, onActivate }: CutoutViewerProps) => {
    const { solidDataset } = useContext(DatasetContext)

    const [nodes, setNodes] = useState<Node[]>([])
    const [width, height] = [1200, 800]

    const ref = useRef<SVGSVGElement | null>(null);

    useEffect(() => {
        if (!solidDataset || !ref.current) return

        // Find annotations referring to this particular 
        // cutout.
        const things = getThingAll(solidDataset)
        console.log('searching for', cutout["@id"])
        setNodes(things
            .filter(thing => {
                return getUrl(thing, crmdig('L43_annotates')) === cutout["@id"]
            })
            .map(thing => ({
                thing,
                type: 'interpretation'
            } as Node))
        )
    }, [cutout, solidDataset, height, width, active])

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
    const hull = roundedHull(points, 2.5)

    return (
        <g ref={ref}>
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
                    onActivate()
                }} />
            {active && (
                <g id='nodes'>
                    {nodes.map(((node, i) => (
                        <g key={`node_${i}`}>
                            <InterpretationNode
                                size='small'
                                x={points[0][0]}
                                y={points[0][1] + i * 10}
                                thing={node.thing} />
                        </g>
                    )))}
                </g>

            )}
        </g>
    )
}

interface CutoutContainerProps {
    cutouts: Cutout[]
    setCutouts: (cutouts: Cutout[]) => void
    active?: Cutout
    onActivate: (cutout: Cutout) => void
}

export const CutoutContainer = ({ cutouts, setCutouts, active, onActivate }: CutoutContainerProps) => {
    return (
        <>
            {cutouts.map((cutout, i) => (
                <CutoutViewer
                    cutout={cutout}
                    key={`cutout_${i}`}
                    active={cutout === active}
                    onRemove={() => {
                        cutouts.splice(i, 1)
                        setCutouts([...cutouts])
                    }}
                    onActivate={() => onActivate(cutout)} />
            ))}
        </>
    )
}