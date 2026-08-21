import { PartialType } from '@nestjs/swagger';
import { CreateHajjBankAccountDto } from './create-hajj-bank-account.dto';

/** Everything on a bank account is editable — unlike requirements, it has no immutable key. */
export class UpdateHajjBankAccountDto extends PartialType(CreateHajjBankAccountDto) {}
