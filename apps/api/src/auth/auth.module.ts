// AuthModule — controller + guard. Guard는 export하여 다른 모듈 controller에서도 @UseGuards 가능.
import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { JwtSupabaseGuard } from './jwt-supabase.guard';

@Module({
  controllers: [AuthController],
  providers: [JwtSupabaseGuard],
  exports: [JwtSupabaseGuard],
})
export class AuthModule {}
