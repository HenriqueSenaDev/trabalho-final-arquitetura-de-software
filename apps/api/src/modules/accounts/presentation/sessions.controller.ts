import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { Audit } from '../../../infrastructure/http/audit.interceptor';
import { CurrentAuth, Public } from '../../../infrastructure/http/session.guard';
import { ActiveSession, ListSessionsUseCase } from '../application/list-sessions.use-case';
import { LoginOutput, LoginUseCase } from '../application/login.use-case';
import { RevokeSessionUseCase } from '../application/revoke-session.use-case';
import { AuthenticatedHolder } from '../application/validate-session.use-case';
import { LoginDto } from './login.dto';

@Controller('sessions')
export class SessionsController {
  constructor(
    private readonly login: LoginUseCase,
    private readonly listSessions: ListSessionsUseCase,
    private readonly revokeSession: RevokeSessionUseCase,
  ) {}

  @Public()
  @Audit('session.open')
  @Post()
  open(@Body() body: LoginDto): Promise<LoginOutput> {
    return this.login.execute(body);
  }

  @Audit('session.list')
  @Get()
  list(@CurrentAuth() auth: AuthenticatedHolder): Promise<ActiveSession[]> {
    return this.listSessions.execute(auth);
  }

  /** A própria sessão (sair) ou a de um aparelho perdido do mesmo titular. */
  @Audit('session.revoke')
  @Delete(':sessionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  revoke(
    @CurrentAuth() auth: AuthenticatedHolder,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ): Promise<void> {
    return this.revokeSession.execute({ holderId: auth.holderId, sessionId });
  }
}
