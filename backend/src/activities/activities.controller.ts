import { Controller, Get, Post, Body, Param, Delete, Put, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { ActivitiesService } from './activities.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { PptxService } from './pptx.service';

@Controller('activities')
export class ActivitiesController {
  constructor(
    private readonly activitiesService: ActivitiesService,
    private readonly pptxService: PptxService,
  ) {}

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

  @Get(':id/export-pptx')
  async exportPptx(@Param('id') id: string, @Res() res: Response) {
    const activity = await this.activitiesService.findOne(id)
    const buffer = await this.pptxService.generateActivityPresentation({
      id: (activity as any)._id?.toString() ?? id,
      title: activity.title,
      description: activity.description,
      objectifs: (activity as any).objectifs,
      type: activity.type,
      location: activity.location,
      duration: activity.duration,
      startDate: activity.startDate,
      endDate: activity.endDate,
      maxParticipants: activity.maxParticipants,
      status: activity.status,
      requiredSkills: activity.requiredSkills ?? [],
    })

    const filename = `activite-${activity.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pptx`
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.send(buffer)
  }

  @Post(':id/export-pptx-manager')
  @UseInterceptors(FileInterceptor('file'))
  async exportPptxManager(
    @Param('id') id: string,
    @Res() res: Response,
    @UploadedFile() file?: { buffer: Buffer; mimetype: string; originalname: string },
  ) {
    const activity = await this.activitiesService.findOne(id)
    const buffer = await this.pptxService.generateEnrichedPresentation(
      {
        id: (activity as any)._id?.toString() ?? id,
        title: activity.title,
        description: activity.description,
        objectifs: (activity as any).objectifs,
        type: activity.type,
        location: activity.location,
        duration: activity.duration,
        startDate: activity.startDate,
        endDate: activity.endDate,
        maxParticipants: activity.maxParticipants,
        status: activity.status,
        requiredSkills: activity.requiredSkills ?? [],
      },
      file?.buffer,
      file?.mimetype,
    )
    const filename = `manager-${activity.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pptx`
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.send(buffer)
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
