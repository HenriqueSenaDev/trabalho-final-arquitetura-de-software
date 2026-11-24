import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { Public } from '../../../infrastructure/http/session.guard';
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

  @Public()
  @Post()
  register(@Body() body: RegisterHolderDto): Promise<PublicHolder> {
    return this.registerHolder.execute(body);
  }

  /** `:holderId` como nas outras rotas: a guarda só deixa passar o titular da sessão. */
  @Get(':holderId')
  findOne(@Param('holderId', ParseUUIDPipe) id: string): Promise<PublicHolder> {
    return this.getHolder.execute({ id });
  }
}
