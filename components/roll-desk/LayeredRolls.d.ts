import { Motivation, Version } from 'linked-rolls';
import { Layer } from './StackList';
import { UserSelection } from './RollDesk';
interface LayeredRollsProps {
    stack: Layer[];
    active?: Layer;
    currentVersion?: Version;
    currentMotivation?: Motivation<string>;
    selection: UserSelection[];
    onChangeSelection: (userSelection: UserSelection[]) => void;
}
export declare const LayeredRolls: ({ stack, active, currentVersion, currentMotivation, selection, onChangeSelection }: LayeredRollsProps) => JSX.Element;
export {};
