import { Injectable } from '@nestjs/common';
import { VerificadorDeSenha } from '../../portas/verificador-de-senha';
import { senhaConfere } from './scrypt';

@Injectable()
export class ScryptVerificadorDeSenha extends VerificadorDeSenha {
  confere(senha: string, hash: string): Promise<boolean> {
    return senhaConfere(senha, hash);
  }
}
