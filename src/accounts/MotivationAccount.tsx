import { ChevronLeft, ChevronRight, Clear } from "@mui/icons-material"
import { Stack, Typography } from "@mui/material"
import { useContext, useMemo, useState } from "react"
import { versionIn } from "linked-rolls"
import { EditionContext } from "../edition/EditionContext"
import { editsAlongRoll, HeldMotivation } from "../edition/motivation"
import { editCount } from "../stemma/SlicedBalloon"
import { spotlight } from "../desk/spotlight"
import { ToolButton } from "../desk/ToolButton"

/** How long an edit stepped to stays lit, as long as one a link brings the reader to. */
const stepMark = 1500

interface MotivationAccountProps {
    held: HeldMotivation
    /** Lets go of the motivation, which leaves its edits among the others. */
    onLetGo: () => void
}

/**
 * What a held motivation says and where its edits are: the reason in
 * full, which its slice tells only under the pointer, and a way along
 * the roll from one of its edits to the next.
 */
export const MotivationAccount = ({ held, onLetGo }: MotivationAccountProps) => {
    const { edition } = useContext(EditionContext)
    // Holding the motivation brought the roll to its first edit.
    const [at, setAt] = useState(0)
    const edits = useMemo(() => edition ? editsAlongRoll(edition, held) : [], [edition, held])

    // Read off the edition rather than the selection, which keeps the
    // motivation as it was when it was held, before any renaming.
    const motivation = edition && versionIn(edition, held.versionId)
        ?.motivations.find(m => m.id === held.motivation.id)
    if (!motivation) return null

    // The edits may have become fewer since the last step.
    const standing = Math.min(at, edits.length - 1)

    const stepTo = (index: number) => {
        const edit = edits[index]
        if (!edit) return
        setAt(index)
        spotlight(edit.id, stepMark)
    }

    return (
        <Stack spacing={0.5}>
            <Stack direction='row' alignItems='center'>
                <Typography variant='overline' color='text.secondary' sx={{ lineHeight: 1.5, flexGrow: 1 }}>
                    Motivation
                </Typography>
                <ToolButton
                    label='Let go of the motivation'
                    hint='Let go of the motivation (Escape)'
                    aria-keyshortcuts='Escape'
                    size='small'
                    onClick={onLetGo}
                >
                    <Clear fontSize='small' />
                </ToolButton>
            </Stack>

            <Typography variant='body2' sx={{ whiteSpace: 'pre-line' }}>
                {motivation.note || <i>No description</i>}
            </Typography>

            {edits.length > 1
                ? (
                    <Stack direction='row' alignItems='center' spacing={0.5}>
                        <ToolButton
                            label='Previous edit'
                            size='small'
                            disabled={standing <= 0}
                            onClick={() => stepTo(standing - 1)}
                        >
                            <ChevronLeft fontSize='small' />
                        </ToolButton>
                        <Typography variant='caption' color='text.secondary' aria-live='polite'>
                            Edit {standing + 1} of {edits.length}
                        </Typography>
                        <ToolButton
                            label='Next edit'
                            size='small'
                            disabled={standing >= edits.length - 1}
                            onClick={() => stepTo(standing + 1)}
                        >
                            <ChevronRight fontSize='small' />
                        </ToolButton>
                    </Stack>
                )
                : (
                    <Typography variant='caption' color='text.secondary'>
                        {editCount(edits.length)}
                    </Typography>
                )}
        </Stack>
    )
}
