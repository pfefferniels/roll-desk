import { AnyEditorialAssumption } from "linked-rolls";
import { RefObject } from "react";

export interface AssumptionProps<T extends AnyEditorialAssumption> {
    assumption: T;
    svgRef: RefObject<SVGGElement>;
    onClick: (assumption: T) => void;
}

