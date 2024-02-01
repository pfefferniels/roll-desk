import { Divider, Paper, Stack } from "@mui/material"
import { Children, isValidElement } from "react"

interface RibbonGroupProps {
    children: React.ReactNode
}

export const RibbonGroup = ({ children }: RibbonGroupProps) => {
    return (
        <Paper>
            <Stack direction='row'>
                {Children.map(children, child => (
                    isValidElement(child) ? (
                        <>
                            {child}
                            <Divider orientation="vertical" flexItem />
                        </>) : null
                ))}
            </Stack>
        </Paper>
    )
}