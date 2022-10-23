import { AlignedPerformance } from "../AlignedPerformance";
import { RawPerformance } from "../midi/RawPerformance";

export interface Visitor {
    visitPerformance(element: RawPerformance): void;
    visitAlignment(element: AlignedPerformance): void;
}
