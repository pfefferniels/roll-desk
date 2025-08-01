import { ProductionEvent } from 'linked-rolls';
interface ProductionEventDialog {
    open: boolean;
    event?: ProductionEvent;
    onClose: () => void;
    onDone: (event: ProductionEvent) => void;
}
export declare const ProductionEventDialog: ({ open, event, onClose, onDone }: ProductionEventDialog) => JSX.Element;
export {};
