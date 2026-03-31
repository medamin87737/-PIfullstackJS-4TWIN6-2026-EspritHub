import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Activity, ActivityDocument } from './schemas/activity.schema';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';

// Helper pour convertir LocationDto en string
function locationToString(location: any): string | undefined {
  if (!location) return undefined;
  if (typeof location === 'string') return location;
  if (location.address) return location.address;
  if (location.lat && location.lng) {
    return `${location.lat},${location.lng}`;
  }
  return String(location);
}

@Injectable()
export class ActivitiesService {
  constructor(
    @InjectModel(Activity.name) private activityModel: Model<ActivityDocument>,
  ) {}

  async create(createActivityDto: CreateActivityDto) {
    // Convertir location objet en string pour la BD
    const dtoWithStringLocation = {
      ...createActivityDto,
      location: locationToString(createActivityDto.location),
    };
    const activity = new this.activityModel(dtoWithStringLocation);
    return activity.save();
  }

  async findAll() {
    return this.activityModel.find().sort({ startDate: -1 });
  }

  async findOne(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID invalide');
    }

    const activity = await this.activityModel.findById(id);
    if (!activity) throw new NotFoundException('Activité non trouvée');
    return activity;
  }

  async update(id: string, updateActivityDto: UpdateActivityDto) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID invalide');
    }

    // Convertir location objet en string pour la BD si présent
    const updateData: any = { ...updateActivityDto };
    if (updateActivityDto.location !== undefined) {
      updateData.location = locationToString(updateActivityDto.location);
    }

    const activity = await this.activityModel.findByIdAndUpdate(
      id,
      updateData,
      { new: true },
    );
    if (!activity) throw new NotFoundException('Activité non trouvée');
    return activity;
  }

async remove(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID invalide');
    }
    const activity = await this.activityModel.findByIdAndDelete(id);
    if (!activity) throw new NotFoundException('Activité non trouvée');
    return { message: 'Activité supprimée avec succès' };
  }
}
