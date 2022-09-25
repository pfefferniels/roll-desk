import { TextField, Select, MenuItem } from "@mui/material";
import { FC, useState } from "react";
import { beatLengthBasis, BeatLengthBasis, InterpolateTempoMapOptions } from "../../../../lib/transformers";
import { OptionsProp, optionsStyle } from "./Options";

export const TempoOptions: FC<OptionsProp<InterpolateTempoMapOptions>> = ({ options, setOptions }) => {
    const [beatLength, setBeatLength] = useState<BeatLengthBasis>(options?.beatLength || 'denominator');
    const [epsilon, setEpsilon] = useState(options?.epsilon || 4);

    return (
        <div>
            <Select
                sx={optionsStyle}
                value={beatLength}
                onChange={e => {
                    setBeatLength(e.target.value as BeatLengthBasis);
                    setOptions({ beatLength, epsilon });
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
                    setOptions({ beatLength, epsilon });
                }}
                type='number' />
        </div>
    );
};
