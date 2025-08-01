import { ArrowOptions } from 'curved-arrows';
import { MouseEventHandler, SVGProps } from 'react';
type BBox = {
    x: number;
    y: number;
    width: number;
    height: number;
};
type ArrowProps = {
    from: BBox;
    to: BBox;
} & ArrowOptions & {
    arrowHeadSize?: number;
    onClick?: MouseEventHandler;
} & {
    svgProps: SVGProps<SVGPathElement>;
};
export declare const Arrow: ({ from, to, arrowHeadSize: headSize, onClick, svgProps, ...options }: ArrowProps) => JSX.Element;
export {};
