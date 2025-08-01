interface EditType<T extends string> {
    open: boolean;
    onClose: () => void;
    onSave: (type: T) => void;
    value: T;
    readonly types: readonly T[];
}
export declare const EditType: <T extends string>({ open, onClose, onSave, value, types }: EditType<T>) => JSX.Element;
export {};
