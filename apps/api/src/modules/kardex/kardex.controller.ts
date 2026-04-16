import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { KardexService } from './kardex.service';
import { CreateKardexEntryDto } from './dto/create-kardex-entry.dto';
import { QueryKardexDto } from './dto/query-kardex.dto';
import { RequirePermissions, CurrentUser } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';
import { Permission, ProductEntityType } from '../../common/constants';

@Controller('kardex')
@UseGuards(RolesGuard)
export class KardexController {
  constructor(private readonly kardexService: KardexService) {}

  @Post('entry')
  @RequirePermissions(Permission.KARDEX_MANAGE)
  createEntry(
    @Body() dto: CreateKardexEntryDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.kardexService.recordEntry(dto, userId);
  }

  @Get('entries')
  @RequirePermissions(Permission.KARDEX_READ)
  getEntries(@Query() query: QueryKardexDto) {
    return this.kardexService.getKardex(query);
  }

  @Get('lots/:productId')
  @RequirePermissions(Permission.KARDEX_READ)
  getLots(
    @Param('productId') productId: string,
    @Query('productType') productType: ProductEntityType,
  ) {
    return this.kardexService.getProductLots(productId, productType);
  }

  @Get('summary/:productId')
  @RequirePermissions(Permission.KARDEX_READ)
  getSummary(
    @Param('productId') productId: string,
    @Query('productType') productType: ProductEntityType,
  ) {
    return this.kardexService.getKardexSummary(productId, productType);
  }
}
