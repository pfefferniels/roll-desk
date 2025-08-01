import { default as React } from 'react';
import { Edition } from 'linked-rolls';
interface DownloadDialogProps {
    open: boolean;
    onClose: () => void;
    edition: Edition;
}
declare const DownloadDialog: React.FC<DownloadDialogProps>;
export default DownloadDialog;
