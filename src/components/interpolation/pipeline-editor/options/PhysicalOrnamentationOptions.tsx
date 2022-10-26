import { MenuItem, Select, TextField } from "@mui/material";
import { FC, useEffect, useState } from "react";
import { Part } from "../../../../lib/mpm";
import { InterpolatePhysicalOrnamentationOptions } from "../../../../lib/transformers";
import { OptionsProp, optionsStyle } from "./Options";

export const PhysicalOrnamentationOptions: FC<OptionsProp<InterpolatePhysicalOrnamentationOptions>> = ({ options, setOptions }) => {
    const [minimumArpeggioSize, setMinimumArpeggioSize] = useState(options?.minimumArpeggioSize || 2);
    const [durationThreshold, setDurationThreshold] = useState(options?.durationThreshold || 30);
    const [noteOffShiftTolerance, setNoteOffShiftTolerance] = useState(options?.noteOffShiftTolerance || 15);
    const [part, setPart] = useState<Part>(options?.part || 'global')

    // propagate changes to the internal pipeline settings
    useEffect(() => setOptions({ minimumArpeggioSize, durationThreshold, noteOffShiftTolerance, part }))

    return (
        <div>
            <TextField
                sx={optionsStyle}
                label='Minimum arpeggio size'
                size='small'
                value={minimumArpeggioSize}
                onChange={e => setMinimumArpeggioSize(+e.target.value)}
                type='number' />
            <TextField
                sx={optionsStyle}
                label='Duration threshold'
                size='small'
                value={durationThreshold}
                onChange={e => setDurationThreshold(+e.target.value)}
                type='number' />
            <TextField
                sx={optionsStyle}
                label='Note off shift tolerance'
                size='small'
                value={noteOffShiftTolerance}
                onChange={e => setNoteOffShiftTolerance(+e.target.value)}
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
