export abstract class VerificadorDeSenha {
  abstract confere(senha: string, hash: string): Promise<boolean>;
}
