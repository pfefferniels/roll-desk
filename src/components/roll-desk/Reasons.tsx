import { Delete } from "@mui/icons-material"
import { IconButton, Link, List, ListItem, Stack, Typography } from "@mui/material"
import { AnyArgumentation, AnyFeature, Belief, MeaningComprehension } from "linked-rolls"
import { ReactNode, useContext } from "react"
import { EditionContext } from "../../providers/EditionContext"
import { actorOf, Citation, citationOf, reasonLabels } from "../../helpers/reasons"
import { CertaintyIcon } from "./CertaintyIcon"
import { EntityLink } from "./EntityLink"
import { NoteText } from "./NoteText"

const CitationLink = ({ citation }: { citation: Citation }) => {
    if (citation.kind === 'web') {
        return <Link href={citation.href} target='_blank' rel='noreferrer'>{citation.label}</Link>
    }
    if (citation.kind === 'entity') {
        return <EntityLink id={citation.id} label={citation.label} />
    }
    return <span>{citation.label}</span>
}

/** What a reason cites, under a heading, or nothing where it cites none. */
const Cited = ({ heading, ids }: { heading: string, ids: readonly string[] }) => {
    const { view } = useContext(EditionContext)
    if (!view || ids.length === 0) return null

    return (
        <Typography variant='caption' component='div' color='text.secondary' sx={{ overflowWrap: 'anywhere' }}>
            {heading}:{' '}
            {ids.map((id, index) => (
                <span key={id}>
                    {index > 0 && ', '}
                    <CitationLink citation={citationOf(view, id)} />
                </span>
            ))}
        </Typography>
    )
}

/** The symbols a meaning comprehension interprets, each with the feature it was read from. */
const Comprehended = ({ reason }: { reason: MeaningComprehension }) => {
    const { view } = useContext(EditionContext)

    return reason.comprehends.map((subject: string) => {
        const target = view?.symbol(subject)
        const key = `comprehends-${subject}`

        if (!target) {
            return <span key={key}>{subject}</span>
        }

        const featurePath = view?.getPath(subject)?.slice(0, -1)
        const feature = featurePath && view?.atPath<AnyFeature>(featurePath)

        return (
            <div key={key}>
                <div>{'text' in target ? target.text : 'no text'}</div>
                <img src={feature?.depiction} width={200} />
            </div>
        )
    })
}

const Reason = ({ reason }: { reason: AnyArgumentation }) => {
    const actor = actorOf(reason)
    const heading = [reasonLabels[reason.type], actor && `by ${actor}`].filter(Boolean).join(' ')

    return (
        <Stack spacing={0.25} sx={{ minWidth: 0 }}>
            {heading && <Typography variant='caption' color='text.secondary'>{heading}</Typography>}
            {reason.note && (
                <Typography variant='body2' sx={{ whiteSpace: 'pre-line', overflowWrap: 'anywhere' }}>
                    <NoteText note={reason.note} />
                </Typography>
            )}
            {reason.type === 'meaningComprehension' && <Comprehended reason={reason} />}
            {(reason.type === 'inference' || reason.type === 'measurement') && <Cited heading='Used' ids={reason.used ?? []} />}
            {reason.type === 'inference' && <Cited heading='Premises' ids={reason.premises} />}
        </Stack>
    )
}

interface ReasonsProps {
    reasons: readonly AnyArgumentation[]
    /** Where given, each reason can be taken back. */
    onRemove?: (index: number) => void
}

/** A belief's reasons, each written out with what it cites. */
export const Reasons = ({ reasons, onRemove }: ReasonsProps) => (
    <List dense disablePadding>
        {reasons.map((reason, index) => (
            <ListItem
                key={`reason_${index}`}
                disableGutters
                alignItems='flex-start'
                secondaryAction={onRemove && (
                    <IconButton size='small' onClick={() => onRemove(index)}>
                        <Delete />
                    </IconButton>
                )}
            >
                <Reason reason={reason} />
            </ListItem>
        ))}
    </List>
)

interface BeliefAccountProps {
    belief: Belief
    /** Where given, each reason can be taken back. */
    onRemove?: (index: number) => void
    /** What can be done to the belief, set beside how certainly it is held. */
    actions?: ReactNode
}

/** How certainly a statement is held and why, written out in full for reading. */
export const BeliefAccount = ({ belief, onRemove, actions }: BeliefAccountProps) => (
    <Stack spacing={0.25}>
        <Stack direction='row' spacing={0.5} alignItems='center' color='text.secondary'>
            <CertaintyIcon certainty={belief.certainty} />
            <Typography variant='caption'>held {belief.certainty}</Typography>
            {actions}
        </Stack>
        <Reasons reasons={belief.reasons} onRemove={onRemove} />
    </Stack>
)
