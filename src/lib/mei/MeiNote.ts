
export type MeiNote = {
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

export function basePitchOfNote(pname: string, oct: number): number {
    const diatonic = new Map<string, number>([
        ['c', 60],
        ['d', 62],
        ['e', 64],
        ['f', 65],
        ['g', 67],
        ['a', 69],
        ['b', 71]
    ]).get(pname.toLowerCase());
    return (diatonic || 0) + (oct - 4) * 12;
}
