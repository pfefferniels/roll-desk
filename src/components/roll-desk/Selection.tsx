import { UserSelection } from "./RollDesk";

interface SelectionProps {
    items: UserSelection[]
    remove: (item: UserSelection) => void
}

export const SelectionFilter = ({ items: items, remove }: SelectionProps) => {
    return (
        <g className="selection">
            {items.map((item, i) => {
                const id = 'id' in item ? item.id : `selection_${i}`;
                return (
                    <use
                        key={`selected_${id}`}
                        filter="url(#purple-glow)"
                        href={'#' + id}
                        onClick={() => remove(item)} />
                )
            })}
        </g>
    )
}
