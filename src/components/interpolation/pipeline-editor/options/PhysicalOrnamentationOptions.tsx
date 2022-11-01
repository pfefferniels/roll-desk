import { MenuItem, Select, TextField } from "@mui/material";
import { FC, useEffect, useState } from "react";
import { Part } from "../../../../lib/mpm";
import { ArpeggioPlacement, InterpolatePhysicalOrnamentationOptions } from "../../../../lib/transformers";
import { OptionsProp, optionsStyle } from "./Options";

export const PhysicalOrnamentationOptions: FC<OptionsProp<InterpolatePhysicalOrnamentationOptions>> = ({ options, setOptions }) => {
    const [minimumArpeggioSize, setMinimumArpeggioSize] = useState(options?.minimumArpeggioSize || 2);
    const [durationThreshold, setDurationThreshold] = useState(options?.durationThreshold || 30);
    const [noteOffShiftTolerance, setNoteOffShiftTolerance] = useState(options?.noteOffShiftTolerance || 15);
    const [placement, setPlacement] = useState<ArpeggioPlacement>(options?.placement || 'estimate')
    const [part, setPart] = useState<Part>(options?.part || 'global')

    // propagate changes to the internal pipeline settings
    useEffect(() => setOptions({ minimumArpeggioSize, durationThreshold, placement, noteOffShiftTolerance, part }))

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
                sx={optionsStyle}
                size='small'
                value={placement}
                onChange={e => setPlacement(e.target.value as ArpeggioPlacement)}>
                <MenuItem value={'on-beat'}>on the beat</MenuItem>
                <MenuItem value={'before-beat'}>before the beat</MenuItem>
                <MenuItem value={'estimate'}>estimate</MenuItem>
            </Select>
            <Select
                sx={optionsStyle}
                size='small'
                value={part}
                onChange={e => setPart(e.target.value as Part)}>
                <MenuItem value={0}>Right Hand</MenuItem>
                <MenuItem value={1}>Left Hand</MenuItem>
                <MenuItem value={'global'}>Both Hands</MenuItem>
            </Select>
        </div>
    );
};
