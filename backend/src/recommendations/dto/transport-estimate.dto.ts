import { IsMongoId, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator'

export class TransportEstimateDto {
  @IsOptional()
  @IsMongoId()
  recommendationId?: string

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  pickupLat?: number

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  pickupLng?: number

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  dropoffLat?: number

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  dropoffLng?: number

  @IsOptional()
  @IsString()
  locale?: string
}

