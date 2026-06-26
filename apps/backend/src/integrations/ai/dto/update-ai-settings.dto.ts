import { IsString, IsOptional, IsBoolean, IsIn, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * For the two key fields:
 *   - omit / send "_KEEP_"  → leave the stored key unchanged
 *   - send ""               → clear the stored key
 *   - send a value          → replace the stored key (encrypted)
 */
export class UpdateAiSettingsDto {
  @ApiPropertyOptional({
    description: 'Provider used by the assistant',
    enum: ['gemini', 'openai'],
  })
  @IsOptional()
  @IsIn(['gemini', 'openai'])
  defaultProvider?: string;

  @ApiPropertyOptional({
    description: 'OpenAI API key. Send "_KEEP_" to leave unchanged, "" to clear.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  openaiKey?: string;

  @ApiPropertyOptional({
    description: 'Google Gemini API key. Send "_KEEP_" to leave unchanged, "" to clear.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  geminiKey?: string;

  @ApiPropertyOptional({
    description: 'Model used when OpenAI is selected',
    example: 'gpt-4o-mini',
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  openaiModel?: string;

  @ApiPropertyOptional({
    description: 'Model used when Gemini is selected',
    example: 'gemini-2.5-flash',
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  geminiModel?: string;

  @ApiPropertyOptional({ description: 'Enable or disable the public assistant' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
