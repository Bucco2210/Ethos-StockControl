'use client';

import { Package, DollarSign, TrendingUp, Layers } from 'lucide-react';
import type { KardexSummary as KardexSummaryType } from '../api/kardex.api';

interface KardexSummaryProps {
  summary: KardexSummaryType | undefined;
  isLoading: boolean;
}

function formatCurrency(value: number) {
  return value.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
}

export function KardexSummary({ summary, isLoading }: KardexSummaryProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-lg border p-4 animate-pulse">
            <div className="h-4 bg-muted rounded w-24 mb-2" />
            <div className="h-8 bg-muted rounded w-16" />
          </div>
        ))}
      </div>
    );
  }

  const cards = [
    {
      label: 'Saldo (unidades)',
      value: summary?.balanceQuantity ?? 0,
      icon: Package,
      format: (v: number) => v.toLocaleString('es-AR'),
    },
    {
      label: 'Saldo (importe)',
      value: summary?.balanceAmount ?? 0,
      icon: DollarSign,
      format: formatCurrency,
    },
    {
      label: 'Costo promedio FIFO',
      value: summary?.averageCost ?? 0,
      icon: TrendingUp,
      format: formatCurrency,
    },
    {
      label: 'Lotes activos',
      value: summary?.activeLots ?? 0,
      icon: Layers,
      format: (v: number) => v.toString(),
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div key={card.label} className="rounded-lg border p-4">
          <div className="flex items-center gap-2 mb-1">
            <card.icon className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{card.label}</p>
          </div>
          <p className="text-2xl font-bold">{card.format(card.value)}</p>
        </div>
      ))}
    </div>
  );
}
