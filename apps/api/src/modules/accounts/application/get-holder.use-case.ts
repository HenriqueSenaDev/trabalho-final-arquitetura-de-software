import { UseCase } from '../../../core/application/use-case';
import { NotFoundError } from '../../../core/domain/errors';
import { PublicHolder } from '../domain/holder';
import { HolderRepository } from '../domain/holder.repository';

export class GetHolderUseCase implements UseCase<{ id: string }, PublicHolder> {
  constructor(private readonly holders: HolderRepository) {}

  async execute({ id }: { id: string }): Promise<PublicHolder> {
    const holder = await this.holders.findById(id);
    if (!holder) {
      throw new NotFoundError('Titular');
    }
    return holder.toPublic();
  }
}
