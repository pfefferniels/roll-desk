import { Selection as SelectionType } from "./RollDesk";

type ArrayElement<ArrayType extends readonly unknown[]> =
    ArrayType extends readonly (infer ElementType)[] ? ElementType : never;

interface SelectionProps {
    pins: SelectionType
    remove: (pin: ArrayElement<SelectionType>) => void
}

export const SelectionFilter = ({ pins, remove }: SelectionProps) => {
    return (
        <g className="selection">
            {pins.map(pin => {
                return (
                    <use
                        key={`selected_${pin.id}`}
                        filter="url(#purple-glow)"
                        href={'#' + pin.id}
                        onClick={() => remove(pin)} />
                )
            })}
        </g>
    )
}
