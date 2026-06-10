'use client';

import { useState, useMemo } from 'react';
import { Search, Truck, Loader2, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useSuppliers } from '@/features/suppliers/api/use-suppliers';
import { useSupplierProducts } from '@/features/supplier-products/api/use-supplier-products';

const PAGE_SIZE = 50;

type MappedFilter = 'all' | 'mapped' | 'unmapped';

export default function SupplierProductsPage() {
  const { data: suppliers } = useSuppliers();
  const [supplierId, setSupplierId] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [mapped, setMapped] = useState<MappedFilter>('all');
  const [page, setPage] = useState(1);

  const query = useMemo(
    () => ({
      supplierId: supplierId === 'all' ? undefined : supplierId,
      search: search.trim() || undefined,
      unmapped: mapped === 'unmapped' ? ('true' as const) : mapped === 'mapped' ? ('false' as const) : undefined,
      page,
      limit: PAGE_SIZE,
    }),
    [supplierId, search, mapped, page],
  );

  const { data, isLoading, isFetching } = useSupplierProducts(query);

  const resetPageAnd = (fn: () => void) => {
    setPage(1);
    fn();
  };

  const fmt = (n: number, currency = 'ARS') =>
    new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Truck className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Lista por Proveedor</h1>
          <p className="text-muted-foreground">
            Productos tal como vienen en la lista de cada proveedor, con sus códigos, precios y descuentos originales. Punto de partida para unificar y comparar.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Buscá por proveedor, SKU o nombre</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Proveedor</label>
              <Select
                value={supplierId}
                onValueChange={(v) => resetPageAnd(() => setSupplierId(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos los proveedores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los proveedores</SelectItem>
                  {suppliers?.map((s) => (
                    <SelectItem key={s._id} value={s._id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Buscar</label>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="SKU o nombre..."
                  value={search}
                  onChange={(e) => resetPageAnd(() => setSearch(e.target.value))}
                  className="pl-8"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Estado de mapeo</label>
              <Select value={mapped} onValueChange={(v) => resetPageAnd(() => setMapped(v as MappedFilter))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="unmapped">Sin mapear</SelectItem>
                  <SelectItem value="mapped">Mapeados</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Productos</CardTitle>
            <CardDescription>
              {data ? `${data.total} productos · página ${data.page} de ${Math.max(1, data.totalPages)}` : '—'}
            </CardDescription>
          </div>
          {(isLoading || isFetching) && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !data || data.data.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Truck className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>No hay productos para los filtros seleccionados.</p>
              <p className="text-xs mt-1">
                Importá una lista desde <Link href="/import" className="text-primary underline">Importar</Link>.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[180px]">SKU</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Proveedor</TableHead>
                      <TableHead className="text-right">Precio base</TableHead>
                      <TableHead className="text-right">Dto %</TableHead>
                      <TableHead className="text-right">Costo neto</TableHead>
                      <TableHead className="text-center">Mon.</TableHead>
                      <TableHead className="text-center">Mapeo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.data.map((p) => {
                      const supplierName =
                        typeof p.supplierId === 'object' ? p.supplierId.name : '';
                      const currency = p.currency ?? 'ARS';
                      const discount = Number(p.discountPercent ?? 0);
                      const net = p.netCost ?? p.basePrice * (1 - discount / 100);
                      return (
                        <TableRow key={p._id}>
                          <TableCell className="font-mono text-xs">{p.supplierSku}</TableCell>
                          <TableCell className="max-w-[400px] truncate" title={p.supplierName}>
                            {p.supplierName}
                            {p.color && <span className="text-muted-foreground"> · {p.color}</span>}
                          </TableCell>
                          <TableCell className="text-xs">{supplierName}</TableCell>
                          <TableCell className="text-right tabular-nums">{fmt(p.basePrice, currency)}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {discount > 0 ? `${discount}%` : '—'}
                          </TableCell>
                          <TableCell className="text-right tabular-nums font-medium">
                            {fmt(net, currency)}
                          </TableCell>
                          <TableCell className="text-center text-xs">{currency}</TableCell>
                          <TableCell className="text-center">
                            {p.unifiedProductId ? (
                              <Badge variant="success" className="text-[10px]">Mapeado</Badge>
                            ) : (
                              <Link
                                href="/unified-products"
                                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                              >
                                Mapear <ExternalLink className="h-3 w-3" />
                              </Link>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between mt-4">
                <span className="text-xs text-muted-foreground">
                  Mostrando {(data.page - 1) * data.limit + 1}–
                  {Math.min(data.page * data.limit, data.total)} de {data.total}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={data.page <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={data.page >= data.totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
