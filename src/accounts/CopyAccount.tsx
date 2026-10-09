import { Link, Stack, Typography } from "@mui/material"
import { alignmentProblems, Edition, FeatureSource, paperOf, Path, Perforator, referenceCopyOf, RollCopy, sourceLabels, pathIn } from "linked-rolls"
import { alignmentStatement, problemStatement, strainStatement } from "../copy/alignment"
import { useContext } from "react"
import { EditionContext } from "../edition/EditionContext"
import { copyAccount } from "../edition/account"
import { dateStatement } from "../edition/dateStatement"
import { heldBy } from "../edition/heldBy"
import { perforatorStatements } from "./perforatorStatements"
import { webAddressOf } from "../edition/reasons"
import { AccountSection, HeldStatement } from "./Account"
import { Arguable } from "./Arguable"
import { EntityLink } from "./EntityLink"
import { Name } from "./Name"
import { NoteText } from "./NoteText"
import { ReservationNotes } from "./Reservations"

/** What a copy's features were read from, and who read it, with what and when. */
const SourceAccount = ({ source }: { source: FeatureSource }) => (
    <>
        <HeldStatement>{sourceLabels[source.kind]}</HeldStatement>
        {source.actor && (
            <HeldStatement belief={source.actor['@annotation']?.belief}>by <Name named={source.actor} /></HeldStatement>
        )}
        {source.device && <HeldStatement>with {source.device.name}</HeldStatement>}
        {source.instrument && (
            <HeldStatement belief={source.instrument['@annotation']?.belief}>on <Name named={source.instrument} /></HeldStatement>
        )}
        {(source.software ?? []).map(software => (
            <HeldStatement key={`${software.name}-${software.version}`}>
                using {[software.name, software.version].filter(Boolean).join(' ')}
            </HeldStatement>
        ))}
        {source.date && (
            <HeldStatement belief={source.date['@annotation']?.belief}>
                {dateStatement(source.date)}
            </HeldStatement>
        )}
        {source.output && (
            <HeldStatement>
                {webAddressOf(source.output)
                    ? <Link href={source.output} target='_blank' rel='noreferrer' sx={{ overflowWrap: 'anywhere' }}>{source.output}</Link>
                    : source.output}
            </HeldStatement>
        )}
        {source.note && (
            <Typography variant='body2' sx={{ whiteSpace: 'pre-line', overflowWrap: 'anywhere' }}>
                <NoteText note={source.note} />
            </Typography>
        )}
    </>
)

/**
 * How the perforator that punched the copy was driven and set, as far
 * as the perforations show it, each statement open to a belief.
 */
const PerforatorAccount = ({ perforator, path }: { perforator: Perforator, path: Path }) => (
    <>
        {perforatorStatements(perforator).map(({ at, statement, detail }) => (
            <div key={statement}>
                <Typography variant='body2' component='div'>
                    <Arguable path={[...path, ...at]}>{statement}</Arguable>
                </Typography>
                {detail && (
                    <Typography variant='caption' color='text.secondary' component='div' sx={{ pl: 1.5 }}>
                        {detail}
                    </Typography>
                )}
            </div>
        ))}
        {perforator.condition?.description && (
            <Typography variant='body2' sx={{ whiteSpace: 'pre-line', overflowWrap: 'anywhere' }}>
                <NoteText note={perforator.condition.description} />
            </Typography>
        )}
    </>
)

/**
 * Where the copy stands on the edition's axis, and what the alignments
 * of all the copies say about its paper.
 */
const AlignmentAccount = ({ copy, edition }: { copy: RollCopy, edition: Edition }) => {
    const isReference = referenceCopyOf(edition)?.id === copy.id
    const alignment = copy.measurements.alignment
    const paper = paperOf(edition)?.copies.find(entry => entry.copy === copy.id)
    const problems = alignmentProblems(edition).filter(entry => entry.copy === copy.id)
    if (!isReference && !alignment && !paper && problems.length === 0) return null

    return (
        <AccountSection title='Alignment'
            hint="How this copy's measurements are laid onto the reference copy, whose millimetres are the edition's axis."
        >
            {isReference && (
                <Typography variant='body2'>The reference copy: its millimetres are the edition&apos;s axis.</Typography>
            )}
            {alignment && (
                <Typography variant='body2'>Aligned with the reference copy: {alignmentStatement(alignment)}.</Typography>
            )}
            {paper && (
                <Typography variant='body2'>
                    Its paper has stretched by {strainStatement(paper.along)} along the roll
                    {paper.measured ? ', as measured on it.' : ', as the alignments tell.'}
                </Typography>
            )}
            {problems.map(problem => (
                <Typography key={problem.problem} variant='body2' color='warning.main'>{problemStatement(problem)}</Typography>
            ))}
        </AccountSection>
    )
}

/** What the edition states of a copy and why: where its features come from, and which versions it carries. */
export const CopyAccount = ({ copyId }: { copyId: string }) => {
    const { edition } = useContext(EditionContext)
    const account = edition && copyAccount(edition, copyId)
    if (!edition || !account) return null

    const { copy, carriages, reservations } = account
    const copyPath = pathIn(edition, copyId) ?? []
    const perforator = copy.production?.perforator
    const statesPerforator = perforator && (perforatorStatements(perforator).length > 0 || perforator.condition?.description)

    return (
        <Stack spacing={1}>
            <Typography variant='caption' color='text.secondary'>
                {copy.keeper
                    ? (
                        <Arguable path={[...copyPath, 'keeper']}>
                            held by {copy.keeper.name.trim() ? <Name named={copy.keeper} /> : heldBy(copy)}
                        </Arguable>
                    )
                    : 'keeper unknown'}
            </Typography>

            {copy.readFrom && (
                <AccountSection title='Read from'
                    hint="What the copy's features were taken from: the paper itself, a scan, a roll reader, or something made of it."
                >
                    <SourceAccount source={copy.readFrom} />
                </AccountSection>
            )}

            <AccountSection title='Carries'
                hint="The versions this copy bears, by its perforations or by a statement about it."
            >
                {carriages.length === 0 && (
                    <Typography variant='body2' color='text.secondary'>Nothing is known of what it carries.</Typography>
                )}
                {carriages.map(carriage => (
                    <HeldStatement key={carriage.version} belief={carriage.belief}>
                        <EntityLink id={carriage.version} />
                        {carriage.by === 'statement' && ', by statement'}
                        {carriage.by === 'carriers' && (carriage.through
                            ? <>, through <EntityLink id={carriage.through} /></>
                            : ', by its perforations')}
                    </HeldStatement>
                ))}
            </AccountSection>

            <AlignmentAccount copy={copy} edition={edition} />

            {statesPerforator && (
                <AccountSection title='Perforator'
                    hint='What is known of the machine that punched the copy: its drive, its setting and its condition.'
                >
                    <PerforatorAccount perforator={perforator} path={[...copyPath, 'production', 'perforator']} />
                </AccountSection>
            )}

            {reservations.length > 0 && (
                <AccountSection title='Reservations'
                    hint='What the edition cannot vouch for about this copy, left open for want of evidence.'
                >
                    <ReservationNotes reservations={reservations} />
                </AccountSection>
            )}
        </Stack>
    )
}
