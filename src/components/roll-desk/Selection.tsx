import { UserSelection } from "./RollDesk";

type ArrayElement<ArrayType extends readonly unknown[]> =
    ArrayType extends readonly (infer ElementType)[] ? ElementType : never;

interface SelectionProps {
    pins: UserSelection
    remove: (pin: ArrayElement<UserSelection>) => void
}

export const Selection = ({ pins, remove }: SelectionProps) => {
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
