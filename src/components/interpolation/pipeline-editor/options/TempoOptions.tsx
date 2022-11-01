import { TextField, Select, MenuItem } from "@mui/material";
import { FC, useEffect, useState } from "react";
import { beatLengthBasis, BeatLengthBasis } from "../../../../lib/transformers/BeatLengthBasis";
import { InterpolateTempoMapOptions } from "../../../../lib/transformers";
import { OptionsProp, optionsStyle } from "./Options";

export const TempoOptions: FC<OptionsProp<InterpolateTempoMapOptions>> = ({ options, setOptions }) => {
    const [beatLength, setBeatLength] = useState<BeatLengthBasis>(options?.beatLength || 'denominator');
    const [epsilon, setEpsilon] = useState(options?.epsilon || 4);
    const [precision, setPrecision] = useState(options?.precision || 0);

    // propagate changes to the internal pipeline settings
    useEffect(() => setOptions({ beatLength, epsilon, precision }))

    return (
        <div>
            <Select
                sx={optionsStyle}
                value={beatLength}
                onChange={e => setBeatLength(e.target.value as BeatLengthBasis)}>
                {beatLengthBasis.map(basis => {
                    return (
                        <MenuItem value={basis}>{basis}</MenuItem>
                    );
                })}
            </Select>
            {beatLength === 'halfbar' &&
                <i className='note'>
                    Careful: in a triple time or any odd time signature taking
                    halfbars as tempo reference is not recommended.
                </i>
            }
            <TextField
                sx={optionsStyle}
                label='Epsilon'
                value={epsilon}
                onChange={e => setEpsilon(+e.target.value)}
                type='number' />
            <TextField
                sx={optionsStyle}
                label='Precision'
                value={precision}
                onChange={e => setPrecision(+e.target.value)}
                type='number' />
        </div>
    );
};
