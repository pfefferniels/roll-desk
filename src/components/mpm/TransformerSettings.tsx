import { Box, TextField } from "@mui/material"
import { useEffect, useState } from "react"

export interface TransformerSettings {
    minimumArpeggioSize: number
}

interface TransformerSettingsProps {
    onChange: (newSettings: TransformerSettings) => void
}

export const TransformerSettings = ({ onChange }: TransformerSettingsProps) => {
    const [minimumArpeggioSize, setMinimumArpeggioSize] = useState(2)

    useEffect(() => {
        onChange({
            minimumArpeggioSize
        })
    }, [onChange, minimumArpeggioSize])

    return (
        <Box>
            <TextField
                label='Minimum arpeggio size'
                type='number'
                value={minimumArpeggioSize}
                onChange={(e) => setMinimumArpeggioSize(+e.target.value)} />
        </Box>
    )
}