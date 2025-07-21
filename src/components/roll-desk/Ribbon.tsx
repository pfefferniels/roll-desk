import { Stack } from "@mui/material"

interface RibbonProps {
    title: string
    children: React.ReactNode
    visible?: boolean
}

export const Ribbon = ({ children, title, visible }: RibbonProps) => {
    // do not show only if visible is explicitly set to false
    if (visible !== undefined && !visible) return null

    return (
        <Stack p={1}>
            <span style={{ textAlign: 'center' }}>{title}</span>
            <Stack direction='row'>
                {children}
            </Stack>
        </Stack>
    )
}