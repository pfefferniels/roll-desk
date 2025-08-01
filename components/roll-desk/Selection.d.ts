import { UserSelection } from './RollDesk';
interface SelectionProps {
    items: UserSelection[];
    remove: (item: UserSelection) => void;
}
export declare const SelectionFilter: ({ items: items, remove }: SelectionProps) => JSX.Element;
export {};
