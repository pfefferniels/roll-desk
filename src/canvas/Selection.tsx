import { useSelection } from "../desk/SelectionContext";
import { UserSelection } from "../desk/RollDesk";

export const SelectionFilter = () => {
    const { selection, setSelection } = useSelection();

    const remove = (item: UserSelection) => {
        setSelection(selection.filter(x => x !== item));
    }

    return (
        <g className="selection">
            {selection.map((item, i) => {
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
