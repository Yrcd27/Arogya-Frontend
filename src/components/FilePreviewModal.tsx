import { useEffect } from 'react';
import { X, Download } from 'lucide-react';
import { BUTTON_PRIMARY, MODAL_CLOSE } from './dialogs/modalStyles';

interface FilePreviewModalProps {
  fileName: string;
  fileType: string;
  url: string;
  onClose: () => void;
  onDownload: () => void;
}

export function FilePreviewModal({ fileName, fileType, url, onClose, onDownload }: FilePreviewModalProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  useEffect(() => () => window.URL.revokeObjectURL(url), [url]);

  const isImage = fileType.startsWith('image/');
  const isPdf = fileType === 'application/pdf';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/70 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={`Preview ${fileName}`} className="flex h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 sm:px-5">
          <p translate="no" className="notranslate text-sm font-medium text-gray-900 truncate pr-4">{fileName}</p>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={onDownload}
              className={`${BUTTON_PRIMARY} h-9 px-3`}
            >
              <Download className="w-4 h-4" />
              Download
            </button>
            <button onClick={onClose} aria-label="Close preview" className={MODAL_CLOSE}>
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-gray-100 flex items-center justify-center p-4">
          {isImage ? (
            <img src={url} alt={fileName} translate="no" className="max-w-full max-h-full object-contain" />
          ) : isPdf ? (
            <iframe src={url} title={fileName} translate="no" className="w-full h-full border-0 bg-white" />
          ) : (
            <div className="text-center text-gray-600">
              <p>Preview isn't available for this file type.</p>
              <p className="text-sm mt-1">Use Download to view it.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
