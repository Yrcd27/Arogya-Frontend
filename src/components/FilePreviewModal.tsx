import { useEffect } from 'react';
import { X, Download } from 'lucide-react';

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
      window.URL.revokeObjectURL(url);
    };
  }, [onClose, url]);

  const isImage = fileType.startsWith('image/');
  const isPdf = fileType === 'application/pdf';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-70 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={`Preview ${fileName}`} className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center px-4 py-3 border-b">
          <p className="text-sm font-medium text-gray-900 truncate pr-4">{fileName}</p>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={onDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#38A3A5] text-white rounded-lg hover:bg-[#2d8284] transition-colors text-sm"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
            <button onClick={onClose} aria-label="Close preview" className="text-gray-500 hover:text-gray-700 p-1.5">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-gray-100 flex items-center justify-center p-4">
          {isImage ? (
            <img src={url} alt={fileName} className="max-w-full max-h-full object-contain" />
          ) : isPdf ? (
            <iframe src={url} title={fileName} className="w-full h-full border-0 bg-white" />
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
