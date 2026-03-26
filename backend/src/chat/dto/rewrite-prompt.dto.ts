import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RewritePromptDto {
  @IsString()
  @MinLength(1)
  @MaxLength(8000)
  prompt!: string;

  /**
   * Optional extra rules describing the strict "language" your NLP model expects.
   * Example: "Output must be a single line. Use verbs: CREATE_ACTIVITY, ASSIGN_MANAGER, ...".
   */
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  constraints?: string;

  @IsOptional()
  @IsIn(['text', 'json'])
  outputFormat?: 'text' | 'json';

  @IsOptional()
  @IsString()
  @MaxLength(64)
  targetLanguage?: string;
}

