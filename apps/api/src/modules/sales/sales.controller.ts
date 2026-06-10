import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { SalesService } from './sales.service';
import { QuerySalesDto } from './dto/query-sales.dto';
import { RequirePermissions } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';
import { Permission } from '../../common/constants';

@Controller('sales')
@UseGuards(RolesGuard)
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Get('by-product')
  @RequirePermissions(Permission.SALES_READ)
  getByProduct(@Query() query: QuerySalesDto) {
    return this.salesService.getSalesByProduct(query);
  }

  @Get('summary')
  @RequirePermissions(Permission.SALES_READ)
  getSummary(@Query() query: QuerySalesDto) {
    return this.salesService.getSummary(query);
  }
}
