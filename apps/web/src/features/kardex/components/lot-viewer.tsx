'use client';

import type { StockLot } from '@ethos/shared';

function formatCurrency(value: number) {
  return value.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
}

interface LotViewerProps {
  lots: StockLot[];
  isLoading: boolean;
}

export function LotViewer({ lots, isLoading }: LotViewerProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (lots.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No hay lotes FIFO activos para este producto.
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-4 py-2 text-left font-medium">Fecha ingreso</th>
            <th className="px-4 py-2 text-left font-medium">Proveedor</th>
            <th className="px-4 py-2 text-left font-medium">Documento</th>
            <th className="px-4 py-2 text-left font-medium">Ubicacion</th>
            <th className="px-4 py-2 text-right font-medium">Costo unit.</th>
            <th className="px-4 py-2 text-right font-medium">Cant. inicial</th>
            <th className="px-4 py-2 text-right font-medium">Cant. restante</th>
            <th className="px-4 py-2 text-right font-medium">Valor restante</th>
          </tr>
        </thead>
        <tbody>
          {lots.map((lot) => {
            const supplier = lot.supplierId as any;
            return (
              <tr key={lot._id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-4 py-2">{formatDate(lot.createdAt)}</td>
                <td className="px-4 py-2">{supplier?.name || '-'}</td>
                <td className="px-4 py-2 font-mono">{lot.documentNumber || '-'}</td>
                <td className="px-4 py-2">{lot.location || '-'}</td>
                <td className="px-4 py-2 text-right">{formatCurrency(lot.unitCost)}</td>
                <td className="px-4 py-2 text-right">{lot.initialQuantity}</td>
                <td className="px-4 py-2 text-right font-bold">{lot.remainingQuantity}</td>
                <td className="px-4 py-2 text-right font-bold">
                  {formatCurrency(lot.remainingQuantity * lot.unitCost)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
