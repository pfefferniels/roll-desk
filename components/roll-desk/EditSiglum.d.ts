interface EditSiglumProps {
    open: boolean;
    siglum: string;
    onDone: (newSiglum: string) => void;
    onClose: () => void;
}
export declare const EditSiglum: ({ open, siglum: siglum_, onDone, onClose }: EditSiglumProps) => JSX.Element;
export {};
