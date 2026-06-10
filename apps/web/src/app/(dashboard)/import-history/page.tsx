'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { History, Loader2, RotateCcw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { importApi, type SupplierImportJob } from '@/features/import/api/import.api';
import { usePermissions } from '@/hooks/use-permissions';
import { Permission } from '@ethos/shared';
import { notify } from '@/lib/toast';

const STATUS_BADGE: Record<
  SupplierImportJob['status'],
  { label: string; variant: 'success' | 'destructive' | 'warning' | 'default' }
> = {
  completed: { label: 'Aplicada', variant: 'success' },
  reverted: { label: 'Revertida', variant: 'warning' },
  failed: { label: 'Falló', variant: 'destructive' },
  pending: { label: 'Pendiente', variant: 'default' },
  processing: { label: 'Procesando', variant: 'default' },
  preview: { label: 'En preview', variant: 'default' },
};

export default function ImportHistoryPage() {
  const qc = useQueryClient();
  const { hasPermission } = usePermissions();
  const canRevert = hasPermission(Permission.IMPORT_EXECUTE);

  const { data: jobs, isLoading } = useQuery({
    queryKey: ['import-history-supplier'],
    queryFn: importApi.getSupplierHistory,
  });

  const [confirmJob, setConfirmJob] = useState<SupplierImportJob | null>(null);

  const revertMutation = useMutation({
    mutationFn: (jobId: string) => importApi.revertSupplier(jobId),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['import-history-supplier'] });
      qc.invalidateQueries({ queryKey: ['supplier-products'] });
      qc.invalidateQueries({ queryKey: ['unified-products'] });
      notify.success(
        `Reversión OK · ${result.restored} restaurado(s), ${result.deleted} borrado(s)`,
      );
      setConfirmJob(null);
    },
    onError: (err: any) => {
      notify.error(err.response?.data?.message || 'Error al revertir');
    },
  });

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <History className="h-6 w-6" />
          Historial de listas
        </h1>
        <p className="text-muted-foreground">
          Registro de todas las listas de proveedor importadas. Permite revertir una importación para restaurar precios y eliminar productos que fueron creados por esa lista.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !jobs || jobs.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          Aún no hay importaciones de proveedor registradas.
        </div>
      ) : (
        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Archivo</TableHead>
                <TableHead className="text-right">Filas</TableHead>
                <TableHead className="text-right">Creados</TableHead>
                <TableHead className="text-right">Actualizados</TableHead>
                <TableHead>Subido por</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((j) => {
                const supplier = typeof j.supplierId === 'object' ? j.supplierId : undefined;
                const uploader = typeof j.uploadedBy === 'object' ? j.uploadedBy : undefined;
                const reverter = typeof j.revertedBy === 'object' ? j.revertedBy : undefined;
                const badge = STATUS_BADGE[j.status] ?? STATUS_BADGE.completed;
                const canRevertThis = canRevert && j.status === 'completed';

                return (
                  <TableRow key={j._id}>
                    <TableCell className="text-xs whitespace-nowrap">
                      {formatDate(j.createdAt)}
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {supplier?.name ?? '—'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                      {j.originalName}
                    </TableCell>
                    <TableCell className="text-sm text-right">{j.totalRows}</TableCell>
                    <TableCell className="text-sm text-right text-emerald-600">
                      {j.result?.supplierProductsCreated ?? 0}
                    </TableCell>
                    <TableCell className="text-sm text-right text-blue-600">
                      {j.result?.supplierProductsUpdated ?? 0}
                    </TableCell>
                    <TableCell className="text-xs">
                      {uploader ? `${uploader.firstName} ${uploader.lastName}` : '—'}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                        {j.status === 'reverted' && reverter && j.revertedAt && (
                          <p className="text-[10px] text-muted-foreground">
                            por {reverter.firstName} el {formatDate(j.revertedAt)}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {canRevertThis && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                          onClick={() => setConfirmJob(j)}
                        >
                          <RotateCcw className="h-4 w-4 mr-1" />
                          Revertir
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!confirmJob} onOpenChange={(o) => !o && setConfirmJob(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Revertir importación
            </DialogTitle>
            <DialogDescription className="pt-2 space-y-2">
              <span className="block">
                Vas a revertir la importación de{' '}
                <strong>
                  {typeof confirmJob?.supplierId === 'object'
                    ? confirmJob.supplierId.name
                    : 'proveedor'}
                </strong>{' '}
                del {confirmJob && formatDate(confirmJob.createdAt)}.
              </span>
              <span className="block">
                • Los productos del proveedor que existían antes serán <strong>restaurados</strong> a su precio y descuento previos.
              </span>
              <span className="block">
                • Los productos del proveedor que fueron <strong>creados</strong> por esta importación serán <strong>eliminados</strong>.
              </span>
              <span className="block pt-2 text-amber-700">
                Atención: si ya impactaste esta lista en Productos+Stock, esos productos del catálogo general <em>no</em> se revierten — quedan como están.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmJob(null)}
              disabled={revertMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="default"
              className="bg-amber-600 hover:bg-amber-700"
              onClick={() => confirmJob && revertMutation.mutate(confirmJob._id)}
              disabled={revertMutation.isPending}
            >
              {revertMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Confirmar reversión
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
