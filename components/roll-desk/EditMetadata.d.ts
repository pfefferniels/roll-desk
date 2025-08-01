import { EditionMetadata } from 'linked-rolls';
interface EditMetadataProps {
    metadata: EditionMetadata;
    open: boolean;
    onClose: () => void;
    onDone: (metadata: EditionMetadata) => void;
}
declare const EditMetadata: ({ metadata: edition, onDone, open, onClose }: EditMetadataProps) => JSX.Element;
export default EditMetadata;
