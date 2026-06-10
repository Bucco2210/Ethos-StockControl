import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';
import { StockMovement, StockMovementDocument } from '../stock/schemas/stock-movement.schema';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import { UnifiedProduct, UnifiedProductDocument } from '../unified-products/schemas/unified-product.schema';
import { MovementType } from '../../common/constants';
import { QuerySalesDto } from './dto/query-sales.dto';

export interface SalesByProductRow {
  productId: string;
  sku: string;
  name: string;
  currency: 'ARS' | 'USD';
  quantitySold: number;
  unitCost: number;
  unitSalePrice: number | null;
  marginPercent: number | null;
  marginAmount: number | null;
  totalRevenue: number | null;
  firstSaleAt: string | null;
  lastSaleAt: string | null;
}

@Injectable()
export class SalesService {
  constructor(
    @InjectModel(StockMovement.name)
    private movementModel: Model<StockMovementDocument>,
    @InjectModel(Product.name)
    private productModel: Model<ProductDocument>,
    @InjectModel(UnifiedProduct.name)
    private unifiedProductModel: Model<UnifiedProductDocument>,
  ) {}

  async getSalesByProduct(query: QuerySalesDto): Promise<SalesByProductRow[]> {
    const filter: FilterQuery<StockMovement> = { type: MovementType.OUT };
    if (query.from || query.to) {
      filter.createdAt = {};
      if (query.from) (filter.createdAt as any).$gte = new Date(query.from);
      if (query.to) (filter.createdAt as any).$lte = new Date(query.to);
    }

    const grouped = await this.movementModel.aggregate<{
      _id: any;
      quantitySold: number;
      firstSaleAt: Date;
      lastSaleAt: Date;
    }>([
      { $match: filter },
      {
        $group: {
          _id: '$productId',
          quantitySold: { $sum: '$quantity' },
          firstSaleAt: { $min: '$createdAt' },
          lastSaleAt: { $max: '$createdAt' },
        },
      },
    ]);

    if (grouped.length === 0) return [];

    const productIds = grouped.map((g) => g._id);
    const products = await this.productModel
      .find({ _id: { $in: productIds } })
      .select('sku name basePrice discountPercent finalPrice currency');

    const productMap = new Map(products.map((p) => [p._id.toString(), p]));
    const skus = products.map((p) => p.sku);

    // Lookup UnifiedProducts by sku (uppercase) to get the configured salePrice
    const unifieds = await this.unifiedProductModel
      .find({ sku: { $in: skus.map((s) => s.toUpperCase()) } })
      .select('sku salePrice profitMarginPercent');
    const unifiedBySku = new Map(unifieds.map((u) => [u.sku, u]));

    let rows: SalesByProductRow[] = grouped.map((g) => {
      const product = productMap.get(g._id.toString());
      if (!product) {
        return {
          productId: g._id.toString(),
          sku: '—',
          name: 'Producto eliminado',
          currency: 'ARS' as const,
          quantitySold: g.quantitySold,
          unitCost: 0,
          unitSalePrice: null,
          marginPercent: null,
          marginAmount: null,
          totalRevenue: null,
          firstSaleAt: g.firstSaleAt?.toISOString() ?? null,
          lastSaleAt: g.lastSaleAt?.toISOString() ?? null,
        };
      }

      const unitCost = product.finalPrice;
      const unified = unifiedBySku.get(product.sku.toUpperCase());
      const unitSalePrice = unified?.salePrice ?? null;

      let marginPercent: number | null = null;
      let marginAmount: number | null = null;
      let totalRevenue: number | null = null;
      if (unitSalePrice !== null && unitCost > 0) {
        marginPercent =
          Math.round(((unitSalePrice - unitCost) / unitCost) * 10000) / 100;
        marginAmount =
          Math.round((unitSalePrice - unitCost) * g.quantitySold * 100) / 100;
        totalRevenue = Math.round(unitSalePrice * g.quantitySold * 100) / 100;
      }

      return {
        productId: product._id.toString(),
        sku: product.sku,
        name: product.name,
        currency: (product.currency ?? 'ARS') as 'ARS' | 'USD',
        quantitySold: g.quantitySold,
        unitCost,
        unitSalePrice,
        marginPercent,
        marginAmount,
        totalRevenue,
        firstSaleAt: g.firstSaleAt?.toISOString() ?? null,
        lastSaleAt: g.lastSaleAt?.toISOString() ?? null,
      };
    });

    if (query.search?.trim()) {
      const term = query.search.trim().toLowerCase();
      rows = rows.filter(
        (r) =>
          r.sku.toLowerCase().includes(term) ||
          r.name.toLowerCase().includes(term),
      );
    }

    rows.sort((a, b) => (b.marginAmount ?? 0) - (a.marginAmount ?? 0));
    return rows;
  }

  async getSummary(query: QuerySalesDto) {
    const rows = await this.getSalesByProduct(query);
    const totalUnits = rows.reduce((acc, r) => acc + r.quantitySold, 0);
    const totalMargin = rows.reduce((acc, r) => acc + (r.marginAmount ?? 0), 0);
    const totalRevenue = rows.reduce((acc, r) => acc + (r.totalRevenue ?? 0), 0);
    const distinctProducts = rows.length;
    return {
      totalUnits,
      totalMargin: Math.round(totalMargin * 100) / 100,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      distinctProducts,
    };
  }
}
