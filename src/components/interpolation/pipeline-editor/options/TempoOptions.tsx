import { TextField, Select, MenuItem } from "@mui/material";
import { FC, useState } from "react";
import { beatLengthBasis, BeatLengthBasis } from "../../../../lib/transformers/BeatLengthBasis";
import { InterpolateTempoMapOptions } from "../../../../lib/transformers";
import { OptionsProp, optionsStyle } from "./Options";

export const TempoOptions: FC<OptionsProp<InterpolateTempoMapOptions>> = ({ options, setOptions }) => {
    const [beatLength, setBeatLength] = useState<BeatLengthBasis>(options?.beatLength || 'denominator');
    const [epsilon, setEpsilon] = useState(options?.epsilon || 4);
    const [precision, setPrecision] = useState(options?.precision || 0);

    return (
        <div>
            <Select
                sx={optionsStyle}
                value={beatLength}
                onChange={e => {
                    setBeatLength(e.target.value as BeatLengthBasis);
                    setOptions({ beatLength, epsilon, precision });
                }}>
                {beatLengthBasis.map(basis => {
                    return (
                        <MenuItem value={basis}>{basis}</MenuItem>
                    );
                })}
            </Select>
            <TextField
                sx={optionsStyle}
                label='Epsilon'
                value={epsilon}
                onChange={e => {
                    setEpsilon(+e.target.value);
                    setOptions({ beatLength, epsilon, precision });
                }}
                type='number' />
            <TextField
                sx={optionsStyle}
                label='Precision'
                value={precision}
                onChange={e => {
                    setPrecision(+e.target.value);
                    setOptions({ beatLength, epsilon, precision });
                }}
                type='number' />
        </div>
    );
};
