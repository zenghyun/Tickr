// /auth/me — 로그인된 사용자 정보 echo. JwtSupabaseGuard smoke test.
import { Controller, Get, UseGuards } from '@nestjs/common';
import type { AuthUser } from './auth.types';
import { CurrentUser } from './current-user.decorator';
import { JwtSupabaseGuard } from './jwt-supabase.guard';

@Controller('auth')
export class AuthController {
  @UseGuards(JwtSupabaseGuard)
  @Get('me')
  getMe(@CurrentUser() user: AuthUser): AuthUser {
    return user;
  }
}
