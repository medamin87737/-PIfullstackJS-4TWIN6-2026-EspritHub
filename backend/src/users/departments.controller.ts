import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common'
import { DepartmentsService } from './departments.service'
import { JwtAuthGuard } from '../auth/auth/jwt-auth/jwt-auth.guard'
import { RolesGuard } from '../auth/auth/roles/roles.guard'
import { Roles } from '../auth/auth/roles.decorator'
import { CreateDepartmentDto } from './dto/create-department.dto'
import { UpdateDepartmentDto } from './dto/update-department.dto'

@Controller('departments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'HR')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async create(@Body() dto: CreateDepartmentDto) {
    const department = await this.departmentsService.create(dto)
    return { message: 'Département créé avec succès', department }
  }

  @Get()
  async findAll() {
    const data = await this.departmentsService.findAll()
    return { success: true, data, count: data.length }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const department = await this.departmentsService.findOne(id)
    return { success: true, data: department }
  }

  @Patch(':id')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async update(@Param('id') id: string, @Body() dto: UpdateDepartmentDto) {
    const department = await this.departmentsService.update(id, dto)
    return { message: 'Département mis à jour avec succès', department }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const department = await this.departmentsService.remove(id)
    return { message: 'Département supprimé avec succès', department }
  }
}

