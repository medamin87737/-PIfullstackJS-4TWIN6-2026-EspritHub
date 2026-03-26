import { Controller, Get, Post, Body, Param, Delete, Put } from '@nestjs/common';
import { ActivitiesService } from './activities.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';

@Controller('activities')
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Post()
  async create(@Body() createActivityDto: CreateActivityDto) {
    return this.activitiesService.create(createActivityDto);
  }

  @Get()
  async findAll() {
    return this.activitiesService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.activitiesService.findOne(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateActivityDto: UpdateActivityDto) {
    return this.activitiesService.update(id, updateActivityDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.activitiesService.remove(id);
  }
}
