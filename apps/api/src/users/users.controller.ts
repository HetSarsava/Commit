import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../common/auth.guard';
import { AuthenticatedRequest } from '../common/auth.types';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(AuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async list(@Req() request: AuthenticatedRequest) {
    return { data: await this.usersService.findAll(request.user) };
  }
}
