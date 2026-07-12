import { Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

import { FinanceService } from './finance.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Permission } from '../common/types/permissions.enum';
import { sendXlsx } from '../common/utils/xlsx';
import { User } from '../users/entities/user.entity';

/** The authenticated principal, as the JWT strategy hands it back. */
type Principal = User & { permissions?: string[] };

@ApiTags('Finance — Admin')
@Controller('admin/finance')
@ApiBearerAuth()
export class FinanceController {
  constructor(private readonly service: FinanceService) {}

  /**
   * The "Payment History" ledger as an .xlsx report — donations and marriage
   * payments combined, over the whole data set rather than the 50-row-per-source
   * slice the page loads.
   *
   * Gated on DONATIONS_VIEW (what the Finance page itself requires), but marriage
   * rows are only included for a caller who also holds MARRIAGE_VIEW — otherwise
   * the file would hand them data the page correctly withholds.
   */
  @Get('payments/export')
  @Permissions(Permission.DONATIONS_VIEW)
  @ApiOperation({ summary: 'Export the payment history ledger as an .xlsx report' })
  @ApiQuery({ name: 'source', required: false, enum: ['donation', 'marriage'] })
  @ApiQuery({ name: 'search', required: false })
  async exportPayments(
    @CurrentUser() user: Principal,
    @Res() res: Response,
    @Query('source') source?: 'donation' | 'marriage',
    @Query('search') search?: string,
  ): Promise<void> {
    const buffer = await this.service.exportPaymentsXlsx({
      source,
      search,
      includeMarriage: canViewMarriage(user),
    });
    sendXlsx(res, buffer, 'payment-history');
  }
}

/** Mirrors the permissions guard: superadmin and the wildcard see everything. */
function canViewMarriage(user: Principal): boolean {
  if (user.role === 'superadmin') return true;
  const permissions = user.permissions ?? [];
  return permissions.includes('*') || permissions.includes(Permission.MARRIAGE_VIEW);
}
