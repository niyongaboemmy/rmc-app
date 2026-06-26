import { IsArray, IsBoolean, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateOneNotificationSettingDto {
  @IsString()
  eventKey: string;

  @IsBoolean()
  @IsOptional()
  emailEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  smsEnabled?: boolean;
}

export class UpdateNotificationSettingsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateOneNotificationSettingDto)
  updates: UpdateOneNotificationSettingDto[];
}
