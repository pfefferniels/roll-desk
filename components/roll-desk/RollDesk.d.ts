import { HorizontalSpan, VerticalSpan, Edition } from 'linked-rolls';
import { VersionSelection } from './VersionMenu';
import { FacsimileSelection } from './CopyFacsimileMenu';
export type EventDimension = {
    vertical: VerticalSpan;
    horizontal: HorizontalSpan;
};
export type UserSelection = (VersionSelection | FacsimileSelection);
/**
 * Working on piano rolls is imagined like working on a
 * massive desk (with light from below). There are different
 * piano rolls lying on top of each other. We are working
 * with clones of these copies, since we do not want to
 * destroy the originals when e. g. stretching them.
 * The collation result and other editing processes are noted on
 * a thin transparent paper roll.
 */
interface DeskProps {
    edition?: Edition;
    viewOnly?: boolean;
    versionId?: string;
}
export declare const Desk: ({ edition, viewOnly, versionId }: DeskProps) => JSX.Element;
export {};
