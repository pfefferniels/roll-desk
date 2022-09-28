import { AlignedPerformance } from "../AlignedPerformance";
import { RawPerformance } from "../Performance";

export interface Visitor {
    visitPerformance(element: RawPerformance): void;
    visitAlignment(element: AlignedPerformance): void;
}
