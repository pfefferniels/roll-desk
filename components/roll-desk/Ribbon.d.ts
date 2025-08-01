interface RibbonProps {
    title: string;
    children: React.ReactNode;
    visible?: boolean;
}
export declare const Ribbon: ({ children, title, visible }: RibbonProps) => JSX.Element | null;
export {};
