'use client';

import { useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/shared/data-table';
import { MovementType } from '@ethos/shared';
import type { KardexEntry } from '@ethos/shared';

function formatCurrency(value: number) {
  if (value === 0) return '-';
  return value.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const TYPE_BADGE = {
  [MovementType.IN]: { label: 'Entrada', variant: 'default' as const, className: 'bg-emerald-600' },
  [MovementType.OUT]: { label: 'Salida', variant: 'destructive' as const, className: '' },
  [MovementType.ADJUSTMENT]: { label: 'Ajuste', variant: 'secondary' as const, className: '' },
};

interface KardexTableProps {
  data: KardexEntry[];
  isLoading: boolean;
}

export function KardexTable({ data, isLoading }: KardexTableProps) {
  const columns = useMemo<ColumnDef<KardexEntry, unknown>[]>(
    () => [
      {
        accessorKey: 'createdAt',
        header: 'Fecha',
        cell: ({ row }) => (
          <span className="text-sm whitespace-nowrap">{formatDate(row.original.createdAt)}</span>
        ),
      },
      {
        accessorKey: 'type',
        header: 'Tipo',
        cell: ({ row }) => {
          const cfg = TYPE_BADGE[row.original.type];
          return (
            <Badge variant={cfg.variant} className={cfg.className}>
              {cfg.label}
            </Badge>
          );
        },
      },
      {
        accessorKey: 'documentNumber',
        header: 'Documento',
        cell: ({ row }) => (
          <span className="text-sm font-mono">
            {row.original.documentNumber || '-'}
          </span>
        ),
      },
      {
        accessorKey: 'supplierId',
        header: 'Proveedor',
        cell: ({ row }) => {
          const supplier = row.original.supplierId as any;
          return <span className="text-sm">{supplier?.name || '-'}</span>;
        },
      },
      {
        id: 'entryQty',
        header: () => <span className="text-xs uppercase tracking-wide">Cant.</span>,
        meta: {
          headerClassName:
            'bg-emerald-50 text-emerald-800 border-l-4 border-l-emerald-400',
        },
        cell: ({ row }) => {
          const qty = row.original.entryQuantity;
          return qty > 0 ? (
            <span className="text-sm font-semibold text-emerald-700 tabular-nums">{qty}</span>
          ) : (
            <span className="text-muted-foreground">-</span>
          );
        },
      },
      {
        id: 'entryAmount',
        header: () => <span className="text-xs uppercase tracking-wide">Importe</span>,
        meta: { headerClassName: 'bg-emerald-50 text-emerald-800' },
        cell: ({ row }) => {
          const amt = row.original.entryAmount;
          return amt > 0 ? (
            <span className="text-sm text-emerald-700 tabular-nums">{formatCurrency(amt)}</span>
          ) : (
            <span className="text-muted-foreground">-</span>
          );
        },
      },
      {
        id: 'exitQty',
        header: () => <span className="text-xs uppercase tracking-wide">Cant.</span>,
        meta: {
          headerClassName: 'bg-red-50 text-red-800 border-l-4 border-l-red-400',
        },
        cell: ({ row }) => {
          const qty = row.original.exitQuantity;
          return qty > 0 ? (
            <span className="text-sm font-semibold text-red-700 tabular-nums">{qty}</span>
          ) : (
            <span className="text-muted-foreground">-</span>
          );
        },
      },
      {
        id: 'exitAmount',
        header: () => <span className="text-xs uppercase tracking-wide">Importe</span>,
        meta: { headerClassName: 'bg-red-50 text-red-800' },
        cell: ({ row }) => {
          const amt = row.original.exitAmount;
          return amt > 0 ? (
            <span className="text-sm text-red-700 tabular-nums">{formatCurrency(amt)}</span>
          ) : (
            <span className="text-muted-foreground">-</span>
          );
        },
      },
      {
        id: 'balanceQty',
        header: () => <span className="text-xs uppercase tracking-wide font-bold">Cant.</span>,
        meta: {
          headerClassName:
            'bg-slate-100 text-slate-900 border-l-4 border-l-slate-400',
        },
        cell: ({ row }) => (
          <span className="text-sm font-bold tabular-nums">{row.original.balanceQuantity}</span>
        ),
      },
      {
        id: 'balanceAmount',
        header: () => <span className="text-xs uppercase tracking-wide font-bold">Importe</span>,
        meta: { headerClassName: 'bg-slate-100 text-slate-900' },
        cell: ({ row }) => (
          <span className="text-sm font-bold tabular-nums">{formatCurrency(row.original.balanceAmount)}</span>
        ),
      },
      {
        accessorKey: 'reason',
        header: 'Motivo',
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground truncate max-w-[120px] block">
            {row.original.reason}
          </span>
        ),
      },
      {
        accessorKey: 'performedBy',
        header: 'Usuario',
        cell: ({ row }) => {
          const user = row.original.performedBy as any;
          return (
            <span className="text-sm text-muted-foreground">
              {user?.firstName ? `${user.firstName} ${user.lastName}` : '-'}
            </span>
          );
        },
      },
    ],
    [],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <DataTable
      columns={columns}
      data={data}
      searchKeys={['documentNumber', 'reason']}
      searchPlaceholder="Buscar por documento o motivo..."
    />
  );
}
