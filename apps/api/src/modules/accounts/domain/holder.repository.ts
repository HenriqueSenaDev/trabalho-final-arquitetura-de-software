import { Holder } from './holder';

export abstract class HolderRepository {
  abstract create(holder: Holder): Promise<void>;
  abstract findById(id: string): Promise<Holder | null>;
  abstract existsByEmail(email: string): Promise<boolean>;
  abstract findByEmail(email: string): Promise<Holder | null>;
}
