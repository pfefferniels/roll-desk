import { Delete } from "@mui/icons-material"
import { IconButton, Link, List, ListItem, Stack, Typography } from "@mui/material"
import { AnyArgumentation, AnyFeature, Belief, isSymbol, MeaningComprehension } from "linked-rolls"
import { useContext } from "react"
import { EditionContext } from "../../providers/EditionContext"
import { actorOf, Citation, citationOf, reasonLabels } from "../../helpers/reasons"
import { CertaintyIcon } from "./CertaintyIcon"
import { EntityLink } from "./EntityLink"

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
        const target = view?.get(subject)
        const key = `comprehends-${subject}`

        if (!target) {
            return <span key={key}>{subject}</span>
        }

        if (!isSymbol(target)) {
            // Meaning Comprehension can only target symbols
            // (E73 Information Object, to be more precise)
            return <span key={key}>unknown type</span>
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
                    {reason.note}
                </Typography>
            )}
            {reason.type === 'meaningComprehension' && <Comprehended reason={reason} />}
            {reason.type === 'inference' && (
                <>
                    <Cited heading='Used' ids={reason.used ?? []} />
                    <Cited heading='Premises' ids={reason.premises} />
                </>
            )}
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

/** How certainly a statement is held and why, written out in full for reading. */
export const BeliefAccount = ({ belief }: { belief: Belief }) => (
    <Stack spacing={0.25}>
        <Stack direction='row' spacing={0.5} alignItems='center' color='text.secondary'>
            <CertaintyIcon certainty={belief.certainty} />
            <Typography variant='caption'>held {belief.certainty}</Typography>
        </Stack>
        <Reasons reasons={belief.reasons} />
    </Stack>
)
