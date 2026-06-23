import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { SchoolsService } from './schools.service';

@ApiTags('Schools')
@Controller('schools')
export class SchoolsController {
  constructor(private readonly service: SchoolsService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'List active Islamic schools for the public directory/map' })
  list() {
    return this.service.listPublic();
  }
}
