import { Module } from '@nestjs/common';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { FamiliesModule } from './modules/families/families.module';
import { SubfamiliesModule } from './modules/subfamilies/subfamilies.module';
import { ProductsModule } from './modules/products/products.module';
import { StockModule } from './modules/stock/stock.module';
import { ImportModule } from './modules/import/import.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { SupplierProductsModule } from './modules/supplier-products/supplier-products.module';
import { UnifiedProductsModule } from './modules/unified-products/unified-products.module';
import { MappingSettingsModule } from './modules/mapping-settings/mapping-settings.module';
import { KardexModule } from './modules/kardex/kardex.module';
import { SalesModule } from './modules/sales/sales.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { GlobalExceptionFilter } from './common/filters';
import { AdminSeeder } from './common/seeders/admin.seeder';
import { DataSeeder } from './common/seeders/data.seeder';

@Module({
  imports: [
    // Environment configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'production' ? undefined : '../../.env',
    }),

    // MongoDB connection
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGODB_URI', 'mongodb://localhost:27017/ethos-stock'),
      }),
    }),

    // Feature modules
    AuthModule,
    UsersModule,
    FamiliesModule,
    SubfamiliesModule,
    ProductsModule,
    StockModule,
    ImportModule,
    SuppliersModule,
    SupplierProductsModule,
    UnifiedProductsModule,
    MappingSettingsModule,
    KardexModule,
    SalesModule,
  ],
  providers: [
    // Global JWT auth guard — all routes require auth unless @Public()
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // Global exception filter
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    // Seed super admin on startup
    AdminSeeder,
    // Seed example data (families, suppliers, products) if DB is empty
    DataSeeder,
  ],
})
export class AppModule {}
