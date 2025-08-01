import { EditorialAssumption, FeatureCondition, GeneralRollCondition, PaperStretch } from 'linked-rolls';
type ConditionMap = {
    roll: PaperStretch | GeneralRollCondition;
    feature: FeatureCondition;
};
interface ConditionStateProps<S extends keyof ConditionMap> {
    open: boolean;
    subject: S;
    condition?: EditorialAssumption<'conditionAssignment', ConditionMap[S]>;
    onClose: () => void;
    onDone: (condition: EditorialAssumption<'conditionAssignment', ConditionMap[S]>) => void;
}
export declare function ConditionStateDialog<T extends keyof ConditionMap>({ open, subject, condition, onClose, onDone }: ConditionStateProps<T>): JSX.Element;
export {};
