import { SmuflSymbol } from "../score/SmuflSymbol";
import { StaffLikeGrid } from "../score/Grid";
import { System } from "../score/System";
import { GridDimensions } from "./GridDimensions";
import { basePitchOfNote, MeiNote } from "../../lib/Score";
import { useEffect, useState } from "react";
import { GraphicalScoreNote } from "../score/GraphicalScoreNote";

interface MEIGridProps {
    notes: MeiNote[]
    activeNote?: MeiNote
    setActiveNote: (note: MeiNote) => void
}

export const MEIGrid: React.FC<MEIGridProps> = ({ notes, activeNote, setActiveNote }): JSX.Element => {
    const [dimensions, setDimensions] = useState<GridDimensions>({
        shift: 60,
        stretch: 60,
        staffSize: 7,
        areaHeight: 280
    })

    useEffect(() => {
        document.addEventListener('keydown', (e) => {
            e.preventDefault()
            if (e.key === 'ArrowLeft') {
                setDimensions(prev => {
                    const copy = { ...prev }
                    copy.shift -= 10
                    return copy
                })
            }
            else if (e.key === 'ArrowRight') {
                setDimensions(prev => {
                    const copy = { ...prev }
                    copy.shift += 10
                    return copy
                })
            }
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
                        missing={false}
                        staffSize={dimensions.staffSize}
                        onClick={() => setActiveNote(n)}
                    />
                )
            })
    }

    const maxWidth = Math.max(...notes.map(n => n.qstamp)) * dimensions.stretch + dimensions.shift

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

