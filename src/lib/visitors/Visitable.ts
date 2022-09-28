import { Visitor } from "./Visitor";

export interface Visitable {
    accept(visitor: Visitor): void
}
