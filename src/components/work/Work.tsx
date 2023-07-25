import { FormControl, InputLabel, MenuItem, Select, Stack } from "@mui/material"
import Grid2 from "@mui/material/Unstable_Grid2/Grid2"
import { useState } from "react"

interface WorkProps {
    url: string
}

export const Work = ({ url }: WorkProps) => {
    const [selectedExpression, setSelectedExpression] = useState<string>()
    const [selectedInterpretation, setSelectedInterpretation] = useState<string>()

    return (
        <Grid2 container>
            <Grid2 xs={6}>
                <Stack m={1} spacing={2} direction='row'>
                    <FormControl fullWidth>
                        <InputLabel id="select-expression-label">
                            Expression
                        </InputLabel>
                        <Select
                            labelId="select-expression-label"
                            value={selectedExpression}
                            label="Expression"
                            onChange={e => setSelectedExpression(e.target.value)}
                        >
                            <MenuItem value={'10'}>Ten</MenuItem>
                            <MenuItem value={'20'}>Twenty</MenuItem>
                            <MenuItem value={'30'}>Thirty</MenuItem>
                        </Select>
                    </FormControl>

                    {/* i.e. select MPM */}
                    <FormControl fullWidth>
                        <InputLabel id="select-interpretation-label">
                            Interpretation
                        </InputLabel>
                        <Select
                            labelId="select-interpretation-label"
                            value={selectedInterpretation}
                            label="Interpretation"
                            onChange={e => setSelectedInterpretation(e.target.value)}
                        >
                            <MenuItem value={'10'}>Ten</MenuItem>
                            <MenuItem value={'20'}>Twenty</MenuItem>
                            <MenuItem value={'30'}>Thirty</MenuItem>
                        </Select>
                    </FormControl>
                </Stack>
            </Grid2>
            <Grid2 xs={12}>
                Verovio with overlays
            </Grid2>
            <Grid2 xs={12}>
                Annotation display.
            </Grid2>
        </Grid2>
    )
}