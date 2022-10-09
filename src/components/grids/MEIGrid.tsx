import { SmuflSymbol } from "../score/SmuflSymbol";
import { StaffLikeGrid } from "../score/Grid";
import { System } from "../score/System";
import { GridDimensions } from "./GridDimensions";
import { basePitchOfNote, MeiNote } from "../../lib/Score";
import { useState } from "react";
import { GraphicalScoreNote } from "../score/GraphicalScoreNote";

interface MEIGridProps {
    notes: MeiNote[]
    activeNote?: MeiNote
    setActiveNote: (note: MeiNote) => void
}

export const MEIGrid: React.FC<MEIGridProps> = ({ notes, activeNote, setActiveNote }): JSX.Element => {
    const [scoreDimensions, setScoreDimensions] = useState<GridDimensions>({
        shift: 60,
        stretch: 60,
        staffSize: 7,
        areaHeight: 280
    })

    const fillStaffForPart = (part: number, getVerticalPosition: (pitch: number) => number) => {
        return notes
            .filter(n => n.part === part)
            .map(n => {
                const x = n.qstamp * scoreDimensions.stretch + scoreDimensions.shift
                const y = getVerticalPosition(
                    basePitchOfNote(n.pname || 'c', n.octave || 0.0))

                return (
                    <GraphicalScoreNote
                        scoreNote={n}
                        x={x}
                        y={y}
                        active={n === activeNote}
                        missing={false}
                        staffSize={scoreDimensions.staffSize}
                        onClick={() => setActiveNote(n)}
                    />
                )
            })
    }

    const maxWidth = Math.max(...notes.map(n => n.qstamp)) * scoreDimensions.stretch + scoreDimensions.shift

    return (
        <g>
            <System spacing={9} staffSize={scoreDimensions.staffSize}>
                <StaffLikeGrid clef='G' staffSize={scoreDimensions.staffSize} width={maxWidth}>
                    {(getVerticalPosition) => (
                        <g>
                            <SmuflSymbol name='gClef' x={10} y={getVerticalPosition(65)} staffSize={7} />
                            {fillStaffForPart(1, getVerticalPosition)}
                        </g>
                    )}
                </StaffLikeGrid>
                <StaffLikeGrid clef='F' staffSize={scoreDimensions.staffSize} width={maxWidth}>
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

