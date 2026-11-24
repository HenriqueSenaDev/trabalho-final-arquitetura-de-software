import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  device?: string;

  /** Token do aparelho no provedor de notificações. */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  deliveryToken?: string;
}
