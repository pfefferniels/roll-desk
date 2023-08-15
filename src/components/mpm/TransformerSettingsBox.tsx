import { Box, MenuItem, Select, Stack, TextField, Typography } from "@mui/material"
import { useEffect, useState } from "react"
import { BeatLengthBasis } from "../../lib/transformers/BeatLengthBasis"

export interface TransformerSettings {
    minimumArpeggioSize: number
    beatLength: BeatLengthBasis
}

interface TransformerSettingsProps {
    onChange: (newSettings: TransformerSettings) => void
}

export const TransformerSettingsBox = ({ onChange }: TransformerSettingsProps) => {
    const [minimumArpeggioSize, setMinimumArpeggioSize] = useState(2)
    const [beatLength, setBeatLength] = useState<BeatLengthBasis>('denominator')

    useEffect(() => {
        onChange({
            minimumArpeggioSize,
            beatLength
        })
    }, [onChange, minimumArpeggioSize])

    return (
        <>
            <Box>
                <Typography>How many notes must an arpeggio at least contain?</Typography>
                <TextField
                    sx={{ m: 1 }}
                    size='small'
                    label='Minimum arpeggio size'
                    type='number'
                    value={minimumArpeggioSize}
                    onChange={(e) => setMinimumArpeggioSize(+e.target.value)} />
            </Box>
            <Box>
                <Typography>On which tempo values should the tempo interpolation be based?</Typography>
                <Select
                    sx={{ m: 1 }}
                    size='small'
                    label='Beat Length'
                    type='number'
                    value={beatLength}
                    onChange={(e) => setBeatLength(e.target.value as BeatLengthBasis)}>
                    <MenuItem value='everything'>Everything</MenuItem>
                    <MenuItem value='denominator'>Denominator</MenuItem>
                    <MenuItem value='halfbar'>Half bar</MenuItem>
                    <MenuItem value='thirdbar'>Third of bar (for triple measures)</MenuItem>
                    <MenuItem value='bar'>Bar</MenuItem>
                </Select>
            </Box>
        </>
    )
}