import { TextField, Select, MenuItem } from "@mui/material";
import { FC, useEffect, useState } from "react";
import { Part } from "../../../../lib/mpm";
import { InterpolateArticulationOptions } from "../../../../lib/transformers";
import { OptionsProp, optionsStyle } from "./Options";

export const ArticulationOptions: FC<OptionsProp<InterpolateArticulationOptions>> = ({ options, setOptions }) => {
    const [relativeDurationTolerance, setRelativeDurationTolerance] = useState(options?.relativeDurationTolerance || 0)
    const [relativeDurationPrecision, setRelativeDurationPrecision] = useState(options?.relativeDurationPrecision || 20);
    const [part, setPart] = useState<Part>(options?.part || 'global');

    // propagate changes to the internal pipeline settings
    useEffect(() => setOptions({ part, relativeDurationTolerance, relativeDurationPrecision }))

    return (
        <div>
            <TextField
                sx={optionsStyle}
                label='Precision'
                value={relativeDurationPrecision}
                onChange={e => setRelativeDurationPrecision(+e.target.value)}
                type='number' />
            <TextField
                sx={optionsStyle}
                label='Tolerance'
                value={relativeDurationTolerance}
                onChange={e => setRelativeDurationTolerance(+e.target.value)}
                type='number' />
            <Select
                value={part}
                onChange={e => setPart(e.target.value as Part)}>
                <MenuItem value={0}>Right Hand</MenuItem>
                <MenuItem value={1}>Left Hand</MenuItem>
                <MenuItem value={'global'}>Both Hands</MenuItem>
            </Select>
        </div>
    );
};
