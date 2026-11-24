import { Injectable } from '@nestjs/common';
import { Relogio } from '../portas/relogio';

@Injectable()
export class RelogioDoSistema extends Relogio {
  agora(): Date {
    return new Date();
  }
}
