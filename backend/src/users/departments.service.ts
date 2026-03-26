import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { isValidObjectId, Model } from 'mongoose'
import { Department, DepartmentDocument } from './schemas/department.schema'
import { CreateDepartmentDto } from './dto/create-department.dto'
import { UpdateDepartmentDto } from './dto/update-department.dto'

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectModel(Department.name)
    private readonly departmentModel: Model<DepartmentDocument>,
  ) {}

  async create(dto: CreateDepartmentDto) {
    const normalizedCode = dto.code.trim().toUpperCase()
    const exists = await this.departmentModel.findOne({
      $or: [{ code: normalizedCode }, { name: dto.name.trim() }],
    })
    if (exists) {
      throw new ConflictException('Département déjà existant (nom ou code)')
    }
    const created = await this.departmentModel.create({
      ...dto,
      name: dto.name.trim(),
      code: normalizedCode,
      description: dto.description?.trim(),
    })
    return created
  }

  async findAll() {
    return this.departmentModel.find().sort({ name: 1 }).exec()
  }

  async findOne(id: string) {
    if (!isValidObjectId(id)) throw new BadRequestException('ID département invalide')
    const dept = await this.departmentModel.findById(id).exec()
    if (!dept) throw new NotFoundException('Département non trouvé')
    return dept
  }

  async update(id: string, dto: UpdateDepartmentDto) {
    if (!isValidObjectId(id)) throw new BadRequestException('ID département invalide')

    const updateData: any = { ...dto }
    if (dto.code) updateData.code = dto.code.trim().toUpperCase()
    if (dto.name) updateData.name = dto.name.trim()
    if (dto.description !== undefined) updateData.description = dto.description?.trim()

    if (updateData.code || updateData.name) {
      const duplicate = await this.departmentModel.findOne({
        _id: { $ne: id },
        $or: [
          ...(updateData.code ? [{ code: updateData.code }] : []),
          ...(updateData.name ? [{ name: updateData.name }] : []),
        ],
      })
      if (duplicate) {
        throw new ConflictException('Département déjà existant (nom ou code)')
      }
    }

    const updated = await this.departmentModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec()
    if (!updated) throw new NotFoundException('Département non trouvé')
    return updated
  }

  async remove(id: string) {
    if (!isValidObjectId(id)) throw new BadRequestException('ID département invalide')
    const deleted = await this.departmentModel.findByIdAndDelete(id).exec()
    if (!deleted) throw new NotFoundException('Département non trouvé')
    return deleted
  }
}

