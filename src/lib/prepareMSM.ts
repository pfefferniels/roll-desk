import { MSM } from "./Msm";
import { AlignedPerformance } from "./AlignedPerformance";
import { Mei } from "./Score";
import { RawPerformance } from "./Performance";
import { loadVerovio, loadDomParser } from './globals';

export const prepareMSM = async (mei: string, midi: ArrayLike<number>, alignment?: string): Promise<MSM> => {
    let { read } = await import("midifile-ts");

    const arr = Uint8Array.from(midi);

    const score = new Mei(mei, await loadVerovio(), await loadDomParser());
    const performance = new RawPerformance(read(arr));
    const alignedPerformance = new AlignedPerformance(score, performance);
    if (alignment) {
        await alignedPerformance.loadAlignment(alignment);
    }
    else {
        // if no alignment is given, perform an automatic alignment
        alignedPerformance.performAlignment();
    }
    return new MSM(alignedPerformance);
};
