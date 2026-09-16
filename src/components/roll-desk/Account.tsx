import { Box, Stack, Typography } from "@mui/material"
import { Belief } from "linked-rolls"
import { ReactNode } from "react"
import { CertaintyMark } from "./CertaintyMark"
import { BeliefAccount } from "./Reasons"

/**
 * What a tab holds, kept within the window so that an account in it
 * scrolls instead of running off the page. The rest keeps its height,
 * a flex item not shrinking below its content.
 */
export const TabColumn = ({ children }: { children: ReactNode }) => (
    <Box sx={{ display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 7rem)' }}>
        {children}
    </Box>
)

/** The sheet an account is written on, scrolling where it runs longer than the room it is given. */
export const AccountPanel = ({ children }: { children: ReactNode }) => (
    <Box sx={{
        width: 300,
        minHeight: 0,
        overflow: 'auto',
        mt: 1,
        p: 1.5,
        bgcolor: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: 1
    }}>
        {children}
    </Box>
)

/** One part of an account, under its title. */
export const AccountSection = ({ title, children }: { title: string, children: ReactNode }) => (
    <Stack spacing={0.75} sx={{ pt: 1, borderTop: '1px solid #f3f4f6' }}>
        <Typography variant='overline' color='text.secondary' sx={{ lineHeight: 1.5 }}>
            {title}
        </Typography>
        {children}
    </Stack>
)

interface HeldStatementProps {
    /** Left out where the statement is made without a belief, and so held true. */
    belief?: Belief
    children: ReactNode
}

/** A statement, with the mark of the belief it is held under, which opens the reasons for it. */
export const HeldStatement = ({ belief, children }: HeldStatementProps) => (
    <Typography variant='body2' component='div'>
        {children}
        {belief && (
            <CertaintyMark certainty={belief.certainty}>
                <BeliefAccount belief={belief} />
            </CertaintyMark>
        )}
    </Typography>
)
