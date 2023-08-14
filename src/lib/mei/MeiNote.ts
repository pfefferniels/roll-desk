
export type MEINote = {
    index: number;
    id: string;
    qstamp: number;
    pnum: number;
    duration: number;
    part: number;

    // the following parameters are optional:
    // they are useful for visualizing and 
    // further processing an alignment, but not
    // strictly necessary
    pname?: string;
    accid?: number;
    octave?: number;
};

