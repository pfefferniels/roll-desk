import { SmuflSymbol } from "../score/SmuflSymbol";
import { StaffLikeGrid } from "../score/Grid";
import { System } from "../score/System";
import { GridDimensions } from "./GridDimensions";
import { basePitchOfNote, MeiNote } from "../../lib/mei";
import { useContext, useEffect, useState } from "react";
import { GraphicalScoreNote } from "../score/GraphicalScoreNote";
import { MidiOutputContext } from "../../providers";
import { playNote } from "../../lib/midi-player";
import { okzoomer } from "../alignment/gestures";

interface MEIGridProps {
    notes: MeiNote[]
    missingNotes: MeiNote[]
    activeNote?: MeiNote
    setActiveNote: (note: MeiNote) => void
}

export const MEIGrid: React.FC<MEIGridProps> = ({ notes, activeNote, setActiveNote, missingNotes }): JSX.Element => {
    const { postSynthMessage } = useContext(MidiOutputContext)

    const [dimensions, setDimensions] = useState<GridDimensions>({
        shift: 60,
        stretch: 60,
        staffSize: 7,
        areaHeight: 280
    })

    useEffect(() => {
        const container = document.querySelector('svg#alignment')
        if (!container) {
            console.log('no container found to attach event listeners to')
            return
        }

        let initialStretch = dimensions.stretch

        okzoomer(container as SVGElement, {
            startGesture: (g) => {
                initialStretch = dimensions.stretch
            },
            doGesture: (g) => {
                setDimensions(prev => {
                    const copy = { ...prev }
                    copy.shift += g.translation.x / 10
                    copy.stretch = g.scale * initialStretch
                    return copy
                })
            },
            endGesture: (g) => {
                initialStretch = g.scale * initialStretch
            },
        })
    }, [])

    const fillStaffForPart = (part: number, getVerticalPosition: (pitch: number) => number) => {
        return notes
            .filter(n => n.part === part)
            .map(n => {
                const x = n.qstamp * dimensions.stretch + dimensions.shift
                const y = getVerticalPosition(
                    basePitchOfNote(n.pname || 'c', n.octave || 0.0))

                return (
                    <GraphicalScoreNote
                        key={`graphicalScoreNote_${n.id}`}
                        scoreNote={n}
                        x={x}
                        y={y}
                        active={n === activeNote}
                        missing={missingNotes.includes(n)}
                        staffSize={dimensions.staffSize}
                        onClick={() => {
                            if (postSynthMessage) playNote(n.pnum, 70, postSynthMessage)
                            setActiveNote(n)
                        }}
                    />
                )
            })
    }

    const maxWidth = Math.max(...notes.map(n => n.qstamp + n.duration)) * dimensions.stretch + dimensions.shift

    return (
        <g>
            <System spacing={9} staffSize={dimensions.staffSize}>
                <StaffLikeGrid clef='G' staffSize={dimensions.staffSize} width={maxWidth}>
                    {(getVerticalPosition) => (
                        <g>
                            <SmuflSymbol name='gClef' x={10} y={getVerticalPosition(65)} staffSize={7} />
                            {fillStaffForPart(1, getVerticalPosition)}
                        </g>
                    )}
                </StaffLikeGrid>
                <StaffLikeGrid clef='F' staffSize={dimensions.staffSize} width={maxWidth}>
                    {(getVerticalPosition) => (
                        <g>
                            <SmuflSymbol name='fClef' x={10} y={getVerticalPosition(53)} staffSize={7} />
                            {fillStaffForPart(2, getVerticalPosition)}
                        </g>
                    )}
                </StaffLikeGrid>
            </System>

        </g>
    )
}

