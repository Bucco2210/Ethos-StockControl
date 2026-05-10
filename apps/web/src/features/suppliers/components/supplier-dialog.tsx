'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useCreateSupplier, useUpdateSupplier } from '../api/use-suppliers';
import {
  supplierSchema,
  SUPPLIER_PARSER_OPTIONS,
  type SupplierFormData,
  type Supplier,
} from '../schemas/supplier.schema';

interface SupplierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier?: Supplier;
  onCreated?: (supplier: Supplier) => void;
}

export function SupplierDialog({ open, onOpenChange, supplier, onCreated }: SupplierDialogProps) {
  const isEditing = !!supplier;
  const createMutation = useCreateSupplier();
  const updateMutation = useUpdateSupplier();
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name: '',
      code: '',
      contactName: '',
      email: '',
      phone: '',
      address: '',
      notes: '',
      isActive: true,
      parserKey: '',
    },
  });

  const isActive = watch('isActive');

  useEffect(() => {
    if (supplier) {
      reset({
        name: supplier.name,
        code: supplier.code ?? '',
        contactName: supplier.contactName ?? '',
        email: supplier.email ?? '',
        phone: supplier.phone ?? '',
        address: supplier.address ?? '',
        notes: supplier.notes ?? '',
        isActive: supplier.isActive,
        parserKey: supplier.parserKey ?? '',
      });
    } else {
      reset({
        name: '',
        code: '',
        contactName: '',
        email: '',
        phone: '',
        address: '',
        notes: '',
        isActive: true,
        parserKey: '',
      });
    }
  }, [supplier, reset]);

  const onSubmit = (data: SupplierFormData) => {
    setServerError('');

    // Clean empty strings
    const cleanedData = {
      ...data,
      email: data.email || undefined,
      parserKey: data.parserKey ? data.parserKey : undefined,
    };

    const mutation = isEditing
      ? updateMutation.mutateAsync({ id: supplier._id, data: cleanedData })
      : createMutation.mutateAsync(cleanedData);

    mutation
      .then((result) => {
        if (!isEditing && onCreated && result) onCreated(result);
        reset();
        onOpenChange(false);
      })
      .catch((err: any) => {
        setServerError(err.response?.data?.message || 'Error al guardar');
      });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar proveedor' : 'Nuevo proveedor'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Modifica los datos del proveedor' : 'Agrega un nuevo proveedor al sistema'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {serverError && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {serverError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre *</Label>
              <Input id="name" placeholder="Ej: Proveedor ABC" {...register('name')} />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">Código</Label>
              <Input
                id="code"
                disabled
                readOnly
                className="bg-muted text-muted-foreground cursor-not-allowed"
                placeholder={isEditing ? '' : 'Se genera automáticamente'}
                {...register('code')}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactName">Nombre de contacto</Label>
            <Input id="contactName" placeholder="Nombre del contacto" {...register('contactName')} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="email@ejemplo.com" {...register('email')} />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                type="tel"
                inputMode="tel"
                placeholder="+54 11 1234-5678"
                {...register('phone')}
              />
              {errors.phone && (
                <p className="text-sm text-destructive">{errors.phone.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Dirección</Label>
            <Input id="address" placeholder="Dirección del proveedor" {...register('address')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="parserKey">Formato de lista de precios</Label>
            <select
              id="parserKey"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              {...register('parserKey')}
            >
              <option value="">Genérico (mapeo manual)</option>
              {SUPPLIER_PARSER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Si el proveedor envía su lista en un formato conocido, elegilo aquí y la importación será automática.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea id="notes" placeholder="Notas adicionales..." {...register('notes')} rows={2} />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="isActive">Activo</Label>
            <Switch
              id="isActive"
              checked={isActive}
              onCheckedChange={(checked) => setValue('isActive', checked)}
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {(createMutation.isPending || updateMutation.isPending)
              ? 'Guardando...'
              : isEditing
                ? 'Guardar cambios'
                : 'Crear proveedor'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
