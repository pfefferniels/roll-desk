import { Box, List, ListItem, ListItemButton, ListItemText, ListSubheader, Stack, Typography } from "@mui/material"
import { AnyCommand, CarriageProblem, ConstraintProblem, Path, PlacementRelation, isCommand, copyIn, symbolIn, pathIn } from "linked-rolls"
import { ReactNode, useContext, useMemo } from "react"
import { EditionContext } from "../../providers/EditionContext"
import { useSnapshot } from "../../hooks/useSnapshot"
import {
    constraintsOf, describeCommand, describePlacement, pairsIn,
    placementsIn, problemLabel, problemsByVersion, relationLabel
} from "../../helpers/constraints"
import { Arguable } from "./Arguable"
import { LegendPopover } from "./Legend"
import { ConstraintLegend } from "./ConstraintLegend"
import { nameOf, whichCopy } from "../../helpers/names"

const Section = ({ title, empty, children }: { title: string; empty: string; children: ReactNode[] }) => (
    <List dense subheader={<ListSubheader disableSticky>{title}</ListSubheader>}>
        {children.length > 0
            ? children
            : <ListItem><ListItemText secondary={empty} /></ListItem>}
    </List>
)

interface ConstraintItemProps {
    text: string
    /** Where the statement sits in the edition, for its belief. */
    path?: Path
    onClick: () => void
}

const ConstraintItem = ({ text, path, onClick }: ConstraintItemProps) => (
    <ListItem disablePadding secondaryAction={path && <Arguable path={path}>{null}</Arguable>}>
        <ListItemButton onClick={onClick}>
            <ListItemText primary={text} />
        </ListItemButton>
    </ListItem>
)

type ShowConstraint = (versionId: string, symbolIds: string[]) => void

interface ProblemListProps {
    problems: readonly ConstraintProblem[]
    onShow: ShowConstraint
}

/** Every problem of the edition under the version it holds in. */
const ProblemList = ({ problems, onShow }: ProblemListProps) => {
    const { edition } = useContext(EditionContext)
    if (!edition || !edition) return null

    const groups = problemsByVersion(problems, edition.versions)
    const describe = (id: string) => {
        const symbol = symbolIn(edition, id)
        return isCommand(symbol) ? describeCommand(symbol, edition) : id
    }

    return (
        <List dense subheader={<ListSubheader disableSticky>Problems</ListSubheader>}>
            {groups.length === 0 && (
                <ListItem><ListItemText secondary='No problems in the versions.' /></ListItem>
            )}
            {groups.flatMap(({ version, problems }) => [
                <ListSubheader key={version.id} disableSticky sx={{ lineHeight: 2 }}>{nameOf(edition, version.id)}</ListSubheader>,
                ...problems.map(problem => (
                    <ListItemButton
                        key={`${problem.version}-${problem.symbol}-${problem.problem}`}
                        onClick={() => onShow(problem.version, [problem.symbol])}
                    >
                        <ListItemText
                            primary={problemLabel(problem.problem)}
                            secondary={describe(problem.symbol)}
                        />
                    </ListItemButton>
                ))
            ])}
        </List>
    )
}

const carriageLabels: Record<CarriageProblem['problem'], string> = {
    'stated-beside-carriers': 'states what it carries, though its features carry symbols already',
    'version-missing': 'states that it carries a version the edition lacks'
}

/** The copies whose statements of the versions they carry cannot stand, or nothing where none is. */
const CarriageList = ({ problems }: { problems: readonly CarriageProblem[] }) => {
    const { edition } = useContext(EditionContext)
    if (!edition || problems.length === 0) return null

    const copyNamed = (id: string) => {
        const copy = copyIn(edition, id)
        return copy ? whichCopy(copy) : id
    }

    return (
        <List dense subheader={<ListSubheader disableSticky>Copies</ListSubheader>}>
            {problems.map(problem => (
                <ListItem key={`${problem.copy}-${problem.version}-${problem.problem}`}>
                    <ListItemText
                        primary={`The copy ${copyNamed(problem.copy)} ${carriageLabels[problem.problem]}`}
                        secondary={nameOf(edition, problem.version) ?? problem.version}
                    />
                </ListItem>
            ))}
        </List>
    )
}

interface ConstraintsPanelProps {
    /** The version whose constraints are shown, absent while none is chosen. */
    versionId?: string
    /** The problems of the whole edition. */
    problems: readonly ConstraintProblem[]
    /** What the copies state about the versions they carry, where it cannot stand. */
    carriage: readonly CarriageProblem[]
    onShow: ShowConstraint
}

/**
 * The problems of every version, then the alignments and pairs of the
 * shown version, each with its belief. An entry opens its version and
 * marks its symbols.
 */
export const ConstraintsPanel = ({ versionId, problems, carriage, onShow }: ConstraintsPanelProps) => {
    const { edition } = useContext(EditionContext)
    const snapshot = useSnapshot(versionId)
    const placements = useMemo(() => placementsIn(snapshot), [snapshot])
    const pairs = useMemo(() => pairsIn(snapshot), [snapshot])

    if (!edition || !edition) return null

    const version = edition.versions.find(v => v.id === versionId)
    const describe = (symbol: AnyCommand) => describeCommand(symbol, edition)
    const pathTo = (symbol: AnyCommand, key: PlacementRelation | 'pairedWith'): Path | undefined => {
        const path = pathIn(edition, symbol.id)
        return path && [...path, key]
    }

    return (
        <Box sx={{ width: 320, maxHeight: '70vh', overflow: 'auto' }}>
            <ProblemList problems={problems} onShow={onShow} />
            <CarriageList problems={carriage} />

            <Stack direction='row' alignItems='center' justifyContent='space-between' sx={{ pl: 2 }}>
                <Typography variant='subtitle2'>
                    {version ? `Constraints in ${nameOf(edition, version.id)}` : 'Constraints'}
                </Typography>
                <LegendPopover><ConstraintLegend /></LegendPopover>
            </Stack>

            {!version && (
                <Typography variant='body2' color='text.secondary' sx={{ px: 2, py: 1 }}>
                    Select a version to see its constraints.
                </Typography>
            )}

            {version && (
                <>
                    <Section title='Placements' empty={`No placements in ${nameOf(edition, version.id)}.`}>
                        {placements.map(placement => (
                            <ConstraintItem
                                key={placement.follower.id}
                                text={describePlacement(placement, edition)}
                                path={pathTo(placement.follower, placement.relation)}
                                onClick={() => onShow(version.id, [placement.follower.id, placement.reference.id])}
                            />
                        ))}
                    </Section>
                    <Section title='Pairs' empty={`No pairs in ${nameOf(edition, version.id)}.`}>
                        {pairs.map(({ stating, partner }) => (
                            <ConstraintItem
                                key={stating.id}
                                text={`${describe(stating)} ⟷ ${describe(partner)}`}
                                path={pathTo(stating, 'pairedWith')}
                                onClick={() => onShow(version.id, [stating.id, partner.id])}
                            />
                        ))}
                    </Section>
                </>
            )}
        </Box>
    )
}

interface ConstraintSummaryProps {
    symbol: AnyCommand
    versionId: string
}

/** What binds a selected command, in a line or two. */
export const ConstraintSummary = ({ symbol, versionId }: ConstraintSummaryProps) => {
    const { edition } = useContext(EditionContext)
    const snapshot = useSnapshot(versionId)
    if (!edition) return null

    const { placement, pairedWith } = constraintsOf(symbol, snapshot)
    if (!placement && !pairedWith) return null

    return (
        <div style={{ color: 'gray', fontSize: '8pt' }}>
            {placement && <div>{relationLabel[placement.relation]} {describeCommand(placement.reference, edition)}</div>}
            {pairedWith && <div>paired with {describeCommand(pairedWith, edition)}</div>}
        </div>
    )
}
