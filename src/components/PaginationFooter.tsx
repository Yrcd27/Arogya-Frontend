interface PaginationFooterProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  loading?: boolean;
}

export function PaginationFooter({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50],
  loading = false,
}: PaginationFooterProps) {
  const safePage = Math.min(Math.max(currentPage, 1), totalPages);
  const startIndex = (safePage - 1) * pageSize;

  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    const windowSize = 1;
    for (let p = 1; p <= totalPages; p++) {
      if (
        p === 1 ||
        p === totalPages ||
        (p >= safePage - windowSize && p <= safePage + windowSize)
      ) {
        pages.push(p);
      } else if (pages[pages.length - 1] !== 'ellipsis') {
        pages.push('ellipsis');
      }
    }
    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-gray-200 bg-gray-50">
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <span>
          Showing <span className="font-medium text-gray-900">{totalItems === 0 ? 0 : startIndex + 1}</span>–
          <span className="font-medium text-gray-900">{Math.min(startIndex + pageSize, totalItems)}</span> of{' '}
          <span className="font-medium text-gray-900">{totalItems}</span>
        </span>
        {onPageSizeChange && (
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            disabled={loading}
            className="ml-2 border border-gray-300 rounded-lg px-2 py-1 text-sm text-gray-700 focus:ring-2 focus:ring-[#38A3A5] focus:border-transparent disabled:opacity-60"
          >
            {pageSizeOptions.map(size => (
              <option key={size} value={size}>{size} / page</option>
            ))}
          </select>
        )}
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(Math.max(1, safePage - 1))}
          disabled={loading || safePage === 1}
          className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Prev
        </button>
        {getPageNumbers().map((p, idx) =>
          p === 'ellipsis' ? (
            <span key={`ellipsis-${idx}`} className="px-2 text-gray-400 select-none">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              disabled={loading}
              className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors disabled:opacity-60 ${
                p === safePage
                  ? 'bg-[#38A3A5] text-white'
                  : 'text-gray-600 hover:bg-gray-100 border border-gray-300'
              }`}
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => onPageChange(Math.min(totalPages, safePage + 1))}
          disabled={loading || safePage === totalPages}
          className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
}
