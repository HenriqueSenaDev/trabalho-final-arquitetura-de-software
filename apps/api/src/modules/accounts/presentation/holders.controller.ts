import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { GetHolderUseCase } from '../application/get-holder.use-case';
import { RegisterHolderUseCase } from '../application/register-holder.use-case';
import { PublicHolder } from '../domain/holder';
import { RegisterHolderDto } from './register-holder.dto';

@Controller('holders')
export class HoldersController {
  constructor(
    private readonly registerHolder: RegisterHolderUseCase,
    private readonly getHolder: GetHolderUseCase,
  ) {}

  @Post()
  register(@Body() body: RegisterHolderDto): Promise<PublicHolder> {
    return this.registerHolder.execute(body);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<PublicHolder> {
    return this.getHolder.execute({ id });
  }
}
