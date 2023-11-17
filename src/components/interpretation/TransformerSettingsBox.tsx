import { Box, MenuItem, Select, TextField, Typography } from "@mui/material"
import { useEffect, useState } from "react"
import { BeatLengthBasis, TempoApproximation, TransformerSettings } from "mpmify"

interface TransformerSettingsProps {
    onChange: (newSettings: TransformerSettings) => void
}

export const TransformerSettingsBox = ({ onChange }: TransformerSettingsProps) => {
    const [minimumArpeggioSize, setMinimumArpeggioSize] = useState(2)
    const [beatLength, setBeatLength] = useState<BeatLengthBasis>('denominator')
    const [epsilon, setEpsilon] = useState(2)
    const [rubatoLength, setRubatoLength] = useState<BeatLengthBasis>('everything')
    const [tempoApproximation, setTempoApproximation] = useState<TempoApproximation>('constant')

    useEffect(() => {
        onChange({
            tempoApproximation,
            minimumArpeggioSize,
            beatLength,
            epsilon,
            rubatoLength
        })
    }, [onChange, minimumArpeggioSize, beatLength, epsilon, rubatoLength, tempoApproximation])

    return (
        <>
            <Box>
                <Typography>How should the tempo be approximated?</Typography>
                <Select
                    sx={{ m: 1 }}
                    size='small'
                    label='Tempo Approximation'
                    value={tempoApproximation}
                    onChange={(e) => setTempoApproximation(e.target.value as TempoApproximation)}>
                    <MenuItem value='constant'>Constant</MenuItem>
                    <MenuItem value='linear'>Linear</MenuItem>
                    <MenuItem value='curved'>Curved</MenuItem>
                </Select>
            </Box>
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
            <Box>
                <Typography>How much may the tempo curve be smoothed?</Typography>
                <TextField
                    sx={{ m: 1 }}
                    size='small'
                    label='Epsilon'
                    type='number'
                    value={epsilon}
                    onChange={(e) => setEpsilon(+e.target.value)} />
            </Box>
            <Box>
                <Typography>
                    On which basis should the rubato elements be calculated?
                </Typography>
                <i>
                    Note: when specifing 'everything', the transformer will
                    attempt to compensate the remaining onset times from the
                    tempo interpolation.
                </i>
                <Select
                    sx={{ m: 1 }}
                    size='small'
                    label='Rubato Length'
                    type='number'
                    value={rubatoLength}
                    onChange={(e) => setRubatoLength(e.target.value as BeatLengthBasis)}>
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