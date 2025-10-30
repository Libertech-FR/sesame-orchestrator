import { Controller } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { AbstractController } from '~/_common/abstracts/abstract.controller';

@Controller('tasks')
export class TasksController extends AbstractController {
  constructor(private readonly _service: TasksService) {
    super();
  }
}
