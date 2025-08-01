import { Belief, EditorialAssumption, Person } from 'linked-rolls';
export interface EditBeliefProps {
    belief: Belief;
    onChange: (belief: Belief) => void;
}
export declare const EditBelief: ({ belief, onChange }: EditBeliefProps) => JSX.Element;
interface PersonEditProps {
    person: Person;
    onChange: (person: Person) => void;
}
export declare const PersonEdit: ({ person, onChange }: PersonEditProps) => JSX.Element;
export declare const MotivationEdit: ({ motivation, onChange }: {
    motivation: string;
    onChange: (motivation: string) => void;
}) => JSX.Element;
interface EditAssumptionProps<Name, Type> {
    open: boolean;
    onClose: () => void;
    assumption: EditorialAssumption<Name, Type>;
    onChange: (assumption: EditorialAssumption<Name, Type>) => void;
}
export declare function EditAssumption<Name, Type>({ assumption, onChange, open, onClose }: EditAssumptionProps<Name, Type>): JSX.Element;
export {};
