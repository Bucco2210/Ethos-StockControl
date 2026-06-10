'use client';

import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';

export interface ServerPaginationConfig {
  pageIndex: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (pageIndex: number) => void;
  search: string;
  onSearchChange: (search: string) => void;
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  /** Single column key to filter (legacy). Use searchKeys for multi-column. */
  searchKey?: string;
  /** Multiple column keys to search across simultaneously. */
  searchKeys?: string[];
  searchPlaceholder?: string;
  toolbar?: React.ReactNode;
  /** When provided, pagination + search are driven by the server. */
  serverPagination?: ServerPaginationConfig;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchKeys,
  searchPlaceholder = 'Buscar...',
  toolbar,
  serverPagination,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const isServerMode = !!serverPagination;
  const effectiveKeys = searchKeys || (searchKey ? [searchKey] : []);
  const showSearchInput = isServerMode || effectiveKeys.length > 0;
  const useGlobalSearch = !isServerMode && effectiveKeys.length > 1;

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    ...(isServerMode ? {} : { getPaginationRowModel: getPaginationRowModel() }),
    getSortedRowModel: getSortedRowModel(),
    ...(isServerMode ? {} : { getFilteredRowModel: getFilteredRowModel() }),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: useGlobalSearch ? setGlobalFilter : undefined,
    globalFilterFn: useGlobalSearch
      ? (row, _columnId, filterValue) => {
          const search = (filterValue as string).toLowerCase();
          return effectiveKeys.some((key) => {
            const value = row.getValue(key);
            return String(value ?? '').toLowerCase().includes(search);
          });
        }
      : undefined,
    manualPagination: isServerMode,
    pageCount: isServerMode
      ? Math.max(1, Math.ceil(serverPagination!.totalCount / serverPagination!.pageSize))
      : undefined,
    state: {
      sorting,
      columnFilters,
      ...(useGlobalSearch ? { globalFilter } : {}),
      ...(isServerMode
        ? {
            pagination: {
              pageIndex: serverPagination!.pageIndex,
              pageSize: serverPagination!.pageSize,
            },
          }
        : {}),
    },
    ...(isServerMode ? {} : { initialState: { pagination: { pageSize: 10 } } }),
  });

  const searchValue = isServerMode
    ? serverPagination!.search
    : useGlobalSearch
      ? globalFilter
      : effectiveKeys.length === 1
        ? (table.getColumn(effectiveKeys[0])?.getFilterValue() as string) ?? ''
        : '';

  const onSearchChange = (value: string) => {
    if (isServerMode) {
      serverPagination!.onSearchChange(value);
    } else if (useGlobalSearch) {
      setGlobalFilter(value);
    } else if (effectiveKeys.length === 1) {
      table.getColumn(effectiveKeys[0])?.setFilterValue(value);
    }
  };

  const goToPage = (next: number) => {
    if (isServerMode) {
      serverPagination!.onPageChange(next);
    } else {
      table.setPageIndex(next);
    }
  };

  const currentPageIndex = isServerMode
    ? serverPagination!.pageIndex
    : table.getState().pagination.pageIndex;
  const pageCount = table.getPageCount();
  const canPrev = currentPageIndex > 0;
  const canNext = currentPageIndex < pageCount - 1;
  const resultsLabel = isServerMode
    ? `${serverPagination!.totalCount} resultado(s)`
    : `${table.getFilteredRowModel().rows.length} resultado(s)`;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        {showSearchInput && (
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>
        )}
        {toolbar && <div className="flex items-center gap-2">{toolbar}</div>}
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const meta = header.column.columnDef.meta as
                    | { headerClassName?: string }
                    | undefined;
                  return (
                    <TableHead key={header.id} className={meta?.headerClassName}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No se encontraron resultados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{resultsLabel}</p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => goToPage(currentPageIndex - 1)}
            disabled={!canPrev}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Pág. {currentPageIndex + 1} de {pageCount}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => goToPage(currentPageIndex + 1)}
            disabled={!canNext}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
