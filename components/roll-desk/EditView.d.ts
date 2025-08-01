import { Edit } from 'linked-rolls';
import { MouseEventHandler } from 'react';
import { PinchZoomContextProps } from '../../hooks/usePinchZoom';
export type Translation = Pick<PinchZoomContextProps, 'translateX' | 'trackToY' | 'trackHeight'>;
export declare const getEditBBoxes: (edit: Edit, translation: Translation) => {
    x: number;
    y: number;
    width: number;
    height: number;
}[];
interface EditViewProps {
    edit: Edit;
    onClick?: MouseEventHandler;
}
export declare const EditView: ({ edit, onClick }: EditViewProps) => JSX.Element;
export {};
