import { MenuItem, Select, TextField } from "@mui/material";
import { FC, useState } from "react";
import { Part } from "../../../../lib/Mpm";
import { InterpolatePhysicalOrnamentationOptions } from "../../../../lib/transformers";
import { OptionsProp, optionsStyle } from "./Options";

export const PhysicalOrnamentationOptions: FC<OptionsProp<InterpolatePhysicalOrnamentationOptions>> = ({ options, setOptions }) => {
    const [minimumArpeggioSize, setMinimumArpeggioSize] = useState(options?.minimumArpeggioSize || 2);
    const [durationThreshold, setDurationThreshold] = useState(options?.durationThreshold || 30);
    const [part, setPart] = useState<Part>('global')

    return (
        <div>
            <TextField
                sx={optionsStyle}
                label='Minimum arpeggio size'
                size='small'
                value={minimumArpeggioSize}
                onChange={(e) => {
                    setMinimumArpeggioSize(+e.target.value);
                    setOptions({
                        minimumArpeggioSize,
                        durationThreshold,
                        part
                    });
                }}
                type='number' />
            <TextField
                sx={optionsStyle}
                label='Duration threshold'
                size='small'
                value={durationThreshold}
                onChange={(e) => {
                    setDurationThreshold(+e.target.value);
                    setOptions({
                        minimumArpeggioSize,
                        durationThreshold,
                        part
                    });
                }}
                type='number' />
            <Select
                value={part}
                onChange={(e) => {
                    setPart(e.target.value as Part)
                    setOptions({
                        minimumArpeggioSize,
                        durationThreshold,
                        part
                    })
                }}>
                <MenuItem value={0}>Right Hand</MenuItem>
                <MenuItem value={1}>Left Hand</MenuItem>
                <MenuItem value={'global'}>Both Hands</MenuItem>
            </Select>
        </div>
    );
};
