import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { FamiliesService } from '../../modules/families/families.service';
import { SubfamiliesService } from '../../modules/subfamilies/subfamilies.service';
import { SuppliersService } from '../../modules/suppliers/suppliers.service';
import { SupplierProductsService } from '../../modules/supplier-products/supplier-products.service';
import { UnifiedProductsService } from '../../modules/unified-products/unified-products.service';
import { MappingSettingsService } from '../../modules/mapping-settings/mapping-settings.service';
import { ProductsService } from '../../modules/products/products.service';
import { KardexService } from '../../modules/kardex/kardex.service';
import { UsersService } from '../../modules/users/users.service';
import { MovementType, ProductEntityType } from '../constants';

// ─── Seed data definitions ──────────────────────────────────────────────

interface SupplierDef {
  key: string;
  name: string;
  code: string;
  contactName: string;
  email: string;
  phone: string;
  parserKey?: 'mentrau' | 'ara' | 'electro_lanus' | 'grass' | 'candil' | 'marana';
}

interface SupplierOffer {
  supplierKey: string;
  supplierSku: string;
  supplierName: string;
  basePrice: number;
  discountPercent: number;
}

interface SeedProduct {
  sku: string;
  name: string;
  description: string;
  family: string;
  subfamily: string;
  stock: number;
  stockMin: number;
  basePrice: number;
  profitMarginPercent: number;
  offers: SupplierOffer[];
  selectedSupplier: string;
}

const SUPPLIERS: SupplierDef[] = [
  {
    key: 'IC',
    name: 'Iluminación Central SA',
    code: 'IC',
    contactName: 'Gustavo Méndez',
    email: 'ventas@iluminacioncentral.com.ar',
    phone: '+54 11 4555-1200',
    parserKey: 'mentrau',
  },
  {
    key: 'EMS',
    name: 'Electro Mayorista Sur',
    code: 'EMS',
    contactName: 'Laura Paredes',
    email: 'pedidos@electromayoristasur.com.ar',
    phone: '+54 11 4777-3400',
    parserKey: 'electro_lanus',
  },
  {
    key: 'DL',
    name: 'Distribuidora Lumen',
    code: 'DL',
    contactName: 'Hernán Rivas',
    email: 'comercial@distribuidoralumen.com.ar',
    phone: '+54 11 4888-9100',
    parserKey: 'grass',
  },
];

const FAMILIES_AND_SUBS: Record<string, string[]> = {
  'Iluminación LED': ['Lámparas LED', 'Plafones y Paneles', 'Tiras LED'],
  'Cables y Conductores': ['Unipolares', 'Tipo Taller'],
  'Material Eléctrico': ['Llaves Térmicas', 'Tomas y Enchufes'],
};

const SEED_PRODUCTS: SeedProduct[] = [
  {
    sku: 'LED-9W-E27',
    name: 'Lámpara LED 9W E27 Luz Fría',
    description: 'Lámpara LED tipo bulbo, 9W, rosca E27, 6500K, 900 lm',
    family: 'Iluminación LED',
    subfamily: 'Lámparas LED',
    stock: 0, // starts at 0, stock built via kardex entries
    stockMin: 30,
    basePrice: 570,
    profitMarginPercent: 40,
    offers: [
      { supplierKey: 'IC', supplierSku: 'IC-L9E27', supplierName: 'Lamp LED 9W E27 Fria', basePrice: 450, discountPercent: 10 },
      { supplierKey: 'EMS', supplierSku: 'EMS-9WE27', supplierName: 'LED Bulbo 9W E27 6500K', basePrice: 480, discountPercent: 15 },
      { supplierKey: 'DL', supplierSku: 'DL-L9FRIA', supplierName: 'Lámpara LED 9W Fría E27', basePrice: 440, discountPercent: 8 },
    ],
    selectedSupplier: 'EMS',
  },
  {
    sku: 'LED-12W-E27',
    name: 'Lámpara LED 12W E27 Luz Cálida',
    description: 'Lámpara LED tipo bulbo, 12W, rosca E27, 3000K, 1200 lm',
    family: 'Iluminación LED',
    subfamily: 'Lámparas LED',
    stock: 0,
    stockMin: 20,
    basePrice: 756,
    profitMarginPercent: 40,
    offers: [
      { supplierKey: 'IC', supplierSku: 'IC-L12E27', supplierName: 'Lamp LED 12W E27 Cal', basePrice: 620, discountPercent: 12 },
      { supplierKey: 'DL', supplierSku: 'DL-L12CAL', supplierName: 'LED 12W Cálida E27', basePrice: 600, discountPercent: 10 },
    ],
    selectedSupplier: 'DL',
  },
  {
    sku: 'LED-TIRA-5M',
    name: 'Tira LED 5050 5m 12V IP65',
    description: 'Tira LED exterior, 5 metros, 12V, 60 LEDs/m, IP65',
    family: 'Iluminación LED',
    subfamily: 'Tiras LED',
    stock: 0,
    stockMin: 10,
    basePrice: 3672,
    profitMarginPercent: 35,
    offers: [
      { supplierKey: 'IC', supplierSku: 'IC-TIRA5M', supplierName: 'Tira 5050 5M 12V IP65', basePrice: 3200, discountPercent: 15 },
      { supplierKey: 'EMS', supplierSku: 'EMS-T5M-12V', supplierName: 'Tira LED 5050 5m Ext', basePrice: 3000, discountPercent: 10 },
      { supplierKey: 'DL', supplierSku: 'DL-TL5050', supplierName: 'Tira LED 5050 5M IP65', basePrice: 3100, discountPercent: 12 },
    ],
    selectedSupplier: 'IC',
  },
  {
    sku: 'LED-PLAF-24W',
    name: 'Plafón LED Redondo 24W',
    description: 'Plafón LED de embutir, 24W, 6500K, 30cm diámetro',
    family: 'Iluminación LED',
    subfamily: 'Plafones y Paneles',
    stock: 0,
    stockMin: 8,
    basePrice: 2248,
    profitMarginPercent: 35,
    offers: [
      { supplierKey: 'IC', supplierSku: 'IC-PL24', supplierName: 'Plafón Redondo 24W LED', basePrice: 1850, discountPercent: 10 },
      { supplierKey: 'EMS', supplierSku: 'EMS-PLAF24', supplierName: 'Plafón LED 24W 30cm', basePrice: 1900, discountPercent: 12 },
    ],
    selectedSupplier: 'IC',
  },
  {
    sku: 'CBL-UNI-2.5',
    name: 'Cable Unipolar 2.5mm² Rollo 100m',
    description: 'Cable unipolar normalizado, sección 2.5mm², rollo de 100m',
    family: 'Cables y Conductores',
    subfamily: 'Unipolares',
    stock: 0,
    stockMin: 5,
    basePrice: 33344,
    profitMarginPercent: 25,
    offers: [
      { supplierKey: 'IC', supplierSku: 'IC-U25-100', supplierName: 'Unipolar 2.5mm 100m', basePrice: 28000, discountPercent: 5 },
      { supplierKey: 'EMS', supplierSku: 'EMS-CU25', supplierName: 'Cable Uni 2.5mm² 100m', basePrice: 27500, discountPercent: 3 },
    ],
    selectedSupplier: 'EMS',
  },
  {
    sku: 'CBL-TALL-2X1.5',
    name: 'Cable Tipo Taller 2x1.5mm² Rollo 100m',
    description: 'Cable bipolar tipo taller, sección 2x1.5mm², rollo de 100m',
    family: 'Cables y Conductores',
    subfamily: 'Tipo Taller',
    stock: 0,
    stockMin: 4,
    basePrice: 50112,
    profitMarginPercent: 28,
    offers: [
      { supplierKey: 'EMS', supplierSku: 'EMS-T2X15', supplierName: 'Taller 2x1.5mm 100m', basePrice: 42000, discountPercent: 8 },
      { supplierKey: 'DL', supplierSku: 'DL-CT2-15', supplierName: 'Cable Taller 2x1.5 100m', basePrice: 43500, discountPercent: 10 },
    ],
    selectedSupplier: 'DL',
  },
  {
    sku: 'TER-1X16',
    name: 'Llave Térmica 1x16A Curva C',
    description: 'Llave termomagnética monopolar 16A, curva C, 4.5kA',
    family: 'Material Eléctrico',
    subfamily: 'Llaves Térmicas',
    stock: 0,
    stockMin: 15,
    basePrice: 3509,
    profitMarginPercent: 45,
    offers: [
      { supplierKey: 'IC', supplierSku: 'IC-T16A', supplierName: 'Térmica 1x16A C', basePrice: 2800, discountPercent: 15 },
      { supplierKey: 'EMS', supplierSku: 'EMS-TERM16', supplierName: 'Llave Term 1x16A', basePrice: 2750, discountPercent: 12 },
      { supplierKey: 'DL', supplierSku: 'DL-LT16', supplierName: 'Termomagnética 16A Mono', basePrice: 2850, discountPercent: 10 },
    ],
    selectedSupplier: 'EMS',
  },
  {
    sku: 'DIS-2X25',
    name: 'Disyuntor Diferencial 2x25A 30mA',
    description: 'Interruptor diferencial bipolar 25A, sensibilidad 30mA',
    family: 'Material Eléctrico',
    subfamily: 'Llaves Térmicas',
    stock: 0,
    stockMin: 6,
    basePrice: 18032,
    profitMarginPercent: 40,
    offers: [
      { supplierKey: 'IC', supplierSku: 'IC-DR225', supplierName: 'Diferencial 2x25A 30mA', basePrice: 14500, discountPercent: 10 },
      { supplierKey: 'DL', supplierSku: 'DL-DDR25', supplierName: 'Disyuntor Dif 2P 25A', basePrice: 14000, discountPercent: 8 },
    ],
    selectedSupplier: 'DL',
  },
  {
    sku: 'TOM-SCHUKO',
    name: 'Toma Schuko con Puesta a Tierra',
    description: 'Toma estándar Schuko 10A 220V, con puesta a tierra',
    family: 'Material Eléctrico',
    subfamily: 'Tomas y Enchufes',
    stock: 0,
    stockMin: 20,
    basePrice: 634,
    profitMarginPercent: 50,
    offers: [
      { supplierKey: 'IC', supplierSku: 'IC-TSCH', supplierName: 'Toma Schuko 10A PT', basePrice: 480, discountPercent: 10 },
      { supplierKey: 'EMS', supplierSku: 'EMS-SCH10', supplierName: 'Schuko 10A c/PT', basePrice: 460, discountPercent: 8 },
    ],
    selectedSupplier: 'EMS',
  },
];

// Kardex movements to seed per product (using product SKU as key)
// Each product gets multiple IN entries from different suppliers + some OUT entries
// This builds realistic FIFO lot history
interface KardexSeedMovement {
  sku: string;
  type: MovementType;
  quantity: number;
  unitCost?: number;
  supplierKey?: string;
  documentNumber?: string;
  location?: string;
  reason: string;
}

const KARDEX_MOVEMENTS: KardexSeedMovement[] = [
  // LED-9W-E27: 2 entradas de distintos proveedores, 1 salida
  { sku: 'LED-9W-E27', type: MovementType.IN, quantity: 100, unitCost: 405, supplierKey: 'EMS', documentNumber: 'FC-A-0001-00045678', location: 'Depósito A - Estante 1', reason: 'Compra a proveedor EMS' },
  { sku: 'LED-9W-E27', type: MovementType.IN, quantity: 50, unitCost: 432, supplierKey: 'IC', documentNumber: 'FC-A-0002-00012345', location: 'Depósito A - Estante 1', reason: 'Compra a proveedor IC' },
  { sku: 'LED-9W-E27', type: MovementType.OUT, quantity: 30, reason: 'Venta mostrador', documentNumber: 'FC-B-0001-00000120', location: 'Depósito A - Estante 1' },

  // LED-12W-E27: 1 entrada, 1 salida
  { sku: 'LED-12W-E27', type: MovementType.IN, quantity: 80, unitCost: 540, supplierKey: 'DL', documentNumber: 'FC-A-0003-00078901', location: 'Depósito A - Estante 1', reason: 'Compra a proveedor DL' },
  { sku: 'LED-12W-E27', type: MovementType.OUT, quantity: 15, reason: 'Venta a electricista', documentNumber: 'FC-B-0001-00000121', location: 'Depósito A - Estante 1' },

  // LED-TIRA-5M: 2 entradas con precios distintos, 2 salidas (prueba FIFO consume 2 lotes)
  { sku: 'LED-TIRA-5M', type: MovementType.IN, quantity: 20, unitCost: 2720, supplierKey: 'IC', documentNumber: 'FC-A-0004-00023456', location: 'Depósito B - Rack 3', reason: 'Compra a proveedor IC' },
  { sku: 'LED-TIRA-5M', type: MovementType.IN, quantity: 25, unitCost: 2700, supplierKey: 'EMS', documentNumber: 'FC-A-0005-00034567', location: 'Depósito B - Rack 3', reason: 'Compra a proveedor EMS' },
  { sku: 'LED-TIRA-5M', type: MovementType.OUT, quantity: 5, reason: 'Venta a cliente mayorista', documentNumber: 'FC-B-0002-00000250', location: 'Depósito B - Rack 3' },
  { sku: 'LED-TIRA-5M', type: MovementType.OUT, quantity: 5, reason: 'Venta mostrador', documentNumber: 'FC-B-0002-00000251', location: 'Depósito B - Rack 3' },

  // LED-PLAF-24W: 1 entrada, 1 ajuste
  { sku: 'LED-PLAF-24W', type: MovementType.IN, quantity: 30, unitCost: 1665, supplierKey: 'IC', documentNumber: 'FC-A-0006-00045678', location: 'Depósito A - Estante 2', reason: 'Compra a proveedor IC' },
  { sku: 'LED-PLAF-24W', type: MovementType.ADJUSTMENT, quantity: 22, unitCost: 0, reason: 'Ajuste por inventario físico - 8 unidades dañadas', location: 'Depósito A - Estante 2' },

  // CBL-UNI-2.5: 1 entrada grande
  { sku: 'CBL-UNI-2.5', type: MovementType.IN, quantity: 15, unitCost: 26675, supplierKey: 'EMS', documentNumber: 'FC-A-0007-00056789', location: 'Depósito C - Cables', reason: 'Compra a proveedor EMS' },
  { sku: 'CBL-UNI-2.5', type: MovementType.OUT, quantity: 3, reason: 'Venta a obra residencial', documentNumber: 'FC-B-0003-00000310', location: 'Depósito C - Cables' },

  // CBL-TALL-2X1.5: 1 entrada
  { sku: 'CBL-TALL-2X1.5', type: MovementType.IN, quantity: 10, unitCost: 39150, supplierKey: 'DL', documentNumber: 'FC-A-0008-00067890', location: 'Depósito C - Cables', reason: 'Compra a proveedor DL' },
  { sku: 'CBL-TALL-2X1.5', type: MovementType.OUT, quantity: 2, reason: 'Venta a instalador', documentNumber: 'FC-B-0003-00000311', location: 'Depósito C - Cables' },

  // TER-1X16: 2 entradas con precios distintos + salidas
  { sku: 'TER-1X16', type: MovementType.IN, quantity: 30, unitCost: 2420, supplierKey: 'EMS', documentNumber: 'FC-A-0009-00078901', location: 'Depósito A - Vitrina 1', reason: 'Compra a proveedor EMS' },
  { sku: 'TER-1X16', type: MovementType.IN, quantity: 25, unitCost: 2380, supplierKey: 'IC', documentNumber: 'FC-A-0010-00089012', location: 'Depósito A - Vitrina 1', reason: 'Compra a proveedor IC' },
  { sku: 'TER-1X16', type: MovementType.OUT, quantity: 10, reason: 'Venta a obra', documentNumber: 'FC-B-0004-00000410', location: 'Depósito A - Vitrina 1' },

  // DIS-2X25: 1 entrada
  { sku: 'DIS-2X25', type: MovementType.IN, quantity: 20, unitCost: 12880, supplierKey: 'DL', documentNumber: 'FC-A-0011-00090123', location: 'Depósito A - Vitrina 2', reason: 'Compra a proveedor DL' },
  { sku: 'DIS-2X25', type: MovementType.OUT, quantity: 2, reason: 'Venta a obra comercial', documentNumber: 'FC-B-0004-00000411', location: 'Depósito A - Vitrina 2' },

  // TOM-SCHUKO: 2 entradas + salidas
  { sku: 'TOM-SCHUKO', type: MovementType.IN, quantity: 50, unitCost: 423, supplierKey: 'EMS', documentNumber: 'FC-A-0012-00001234', location: 'Depósito A - Estante 3', reason: 'Compra a proveedor EMS' },
  { sku: 'TOM-SCHUKO', type: MovementType.IN, quantity: 40, unitCost: 432, supplierKey: 'IC', documentNumber: 'FC-A-0013-00001235', location: 'Depósito A - Estante 3', reason: 'Compra a proveedor IC' },
  { sku: 'TOM-SCHUKO', type: MovementType.OUT, quantity: 25, reason: 'Venta mostrador', documentNumber: 'FC-B-0005-00000520', location: 'Depósito A - Estante 3' },
  { sku: 'TOM-SCHUKO', type: MovementType.OUT, quantity: 5, reason: 'Muestra para cliente', location: 'Depósito A - Estante 3' },
];

@Injectable()
export class DataSeeder implements OnModuleInit {
  private readonly logger = new Logger(DataSeeder.name);

  constructor(
    @InjectConnection() private connection: Connection,
    private readonly families: FamiliesService,
    private readonly subfamilies: SubfamiliesService,
    private readonly suppliers: SuppliersService,
    private readonly supplierProducts: SupplierProductsService,
    private readonly unifiedProducts: UnifiedProductsService,
    private readonly mappingSettings: MappingSettingsService,
    private readonly products: ProductsService,
    private readonly kardex: KardexService,
    private readonly users: UsersService,
  ) {}

  async onModuleInit() {
    await this.resetAndSeed();
  }

  private async resetAndSeed() {
    // Check if already seeded (families exist = already done)
    const existing = await this.families.findAll();
    if (existing.length > 0) {
      this.logger.log('Base de datos ya tiene datos, saltando seed.');
      return;
    }

    this.logger.log('════════════════════════════════════════');
    this.logger.log('Iniciando seed completo de datos de ejemplo…');
    this.logger.log('════════════════════════════════════════');

    // 1. Mapping settings
    await this.mappingSettings.updateSettings({
      autoMapOnImport: true,
      autoMapStrategy: 'similar_name',
      defaultProfitMargin: 35,
      minMatchScore: 70,
      createUnifiedIfNoMatch: true,
    });
    this.logger.log('✓ MappingSettings configurado');

    // 2. Families & Subfamilies
    const familyMap = new Map<string, string>();
    const subfamilyMap = new Map<string, string>();

    for (const [familyName, subs] of Object.entries(FAMILIES_AND_SUBS)) {
      const family = await this.families.create({ name: familyName });
      const familyId = (family._id as any).toString();
      familyMap.set(familyName, familyId);

      for (const subName of subs) {
        const sub = await this.subfamilies.create({ name: subName, familyId });
        subfamilyMap.set(`${familyName}|${subName}`, (sub._id as any).toString());
      }
    }
    this.logger.log(`✓ ${familyMap.size} familias, ${subfamilyMap.size} subfamilias`);

    // 3. Suppliers
    const supplierMap = new Map<string, string>();
    for (const s of SUPPLIERS) {
      const sup = await this.suppliers.create({
        name: s.name,
        code: s.code,
        contactName: s.contactName,
        email: s.email,
        phone: s.phone,
        parserKey: s.parserKey,
      });
      supplierMap.set(s.key, (sup._id as any).toString());
    }
    this.logger.log(`✓ ${supplierMap.size} proveedores`);

    // 4. Products (legacy) + UnifiedProducts + SupplierProducts + mappings
    const productIdMap = new Map<string, string>(); // sku -> product _id

    for (const p of SEED_PRODUCTS) {
      const familyId = familyMap.get(p.family)!;
      const subfamilyId = subfamilyMap.get(`${p.family}|${p.subfamily}`);

      // Create legacy Product (starts with stock=0, Kardex will build stock)
      const product = await this.products.create({
        sku: p.sku,
        name: p.name,
        description: p.description,
        familyId,
        subfamilyId,
        stock: 0,
        stockMin: p.stockMin,
        basePrice: p.basePrice,
        discountPercent: 0,
      });
      productIdMap.set(p.sku, (product._id as any).toString());

      // Create UnifiedProduct
      const unified = await this.unifiedProducts.create({
        sku: `UNI-${p.sku}`,
        name: p.name,
        description: p.description,
        familyId,
        subfamilyId,
        stock: 0,
        stockMin: p.stockMin,
        profitMarginPercent: p.profitMarginPercent,
      });
      const unifiedId = (unified._id as any).toString();

      // Create SupplierProducts and link to UnifiedProduct
      let selectedSpId: string | null = null;
      for (const offer of p.offers) {
        const sp = await this.supplierProducts.create({
          supplierId: supplierMap.get(offer.supplierKey)!,
          supplierSku: offer.supplierSku,
          supplierName: offer.supplierName,
          supplierDescription: p.description,
          basePrice: offer.basePrice,
          discountPercent: offer.discountPercent,
        });
        const spId = (sp._id as any).toString();
        await this.supplierProducts.linkToUnifiedProduct(spId, unifiedId);
        if (offer.supplierKey === p.selectedSupplier) {
          selectedSpId = spId;
        }
      }

      // Select best supplier for UnifiedProduct
      if (selectedSpId) {
        await this.unifiedProducts.selectSupplier(unifiedId, selectedSpId);
      }
    }
    this.logger.log(`✓ ${SEED_PRODUCTS.length} productos (legacy + unificados + proveedor)`);

    // 5. Kardex movements (FIFO lots + entries on legacy Products)
    const admin = await this.users.findByEmail('admin@ethos.com');
    if (!admin) {
      this.logger.warn('No se encontró usuario admin, saltando Kardex seed.');
      return;
    }
    const adminId = (admin._id as any).toString();

    let kardexCount = 0;
    for (const m of KARDEX_MOVEMENTS) {
      const productId = productIdMap.get(m.sku);
      if (!productId) {
        this.logger.warn(`Producto ${m.sku} no encontrado para Kardex`);
        continue;
      }

      try {
        await this.kardex.recordEntry(
          {
            productId,
            productType: ProductEntityType.PRODUCT,
            type: m.type,
            quantity: m.quantity,
            unitCost: m.unitCost,
            supplierId: m.supplierKey ? supplierMap.get(m.supplierKey) : undefined,
            documentNumber: m.documentNumber,
            location: m.location,
            reason: m.reason,
          },
          adminId,
        );
        kardexCount++;
      } catch (err) {
        this.logger.warn(`Error en Kardex para ${m.sku}: ${(err as Error).message}`);
      }
    }
    this.logger.log(`✓ ${kardexCount} movimientos Kardex (con lotes FIFO)`);

    // Summary
    this.logger.log('════════════════════════════════════════');
    this.logger.log('Seed completo. Módulos verificables:');
    this.logger.log('  • Familias & Subfamilias (3 fam, 7 subfam)');
    this.logger.log('  • Proveedores (3 proveedores)');
    this.logger.log('  • Productos Legacy (9 productos)');
    this.logger.log('  • Productos Unificados (9 con mapeo a proveedores)');
    this.logger.log('  • SupplierProducts (con netCost calculado)');
    this.logger.log('  • Kardex FIFO (entradas, salidas, ajustes con lotes)');
    this.logger.log('  • MappingSettings (configurado)');
    this.logger.log('════════════════════════════════════════');
  }
}
