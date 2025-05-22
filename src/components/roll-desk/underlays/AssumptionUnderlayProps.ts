import { AnyEditorialAssumption } from "linked-rolls";
import { RefObject } from "react";

export interface AssumptionUnderlayProps<T extends AnyEditorialAssumption> {
    assumption: T;
    svgRef: RefObject<SVGGElement>;
    onClick: (r: T) => void;
}

