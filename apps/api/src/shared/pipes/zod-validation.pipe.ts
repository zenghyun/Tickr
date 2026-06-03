// 재사용 가능한 zod 검증 파이프.
// shared(@tickr/shared) 스키마를 그대로 controller @Query/@Body/@Param에 적용 가능.
//
// 사용 예:
//   @Get('search')
//   search(@Query(new ZodValidationPipe(symbolSearchQuerySchema)) q: SymbolSearchQuery)
//
// 실패 시 400 BadRequest + code='VALIDATION_FAILED' + issues 배열.
import { BadRequestException, PipeTransform } from '@nestjs/common';
import type { z } from 'zod';

// Generic Output 타입으로 좁혀 result.data가 any로 추론되는 문제를 회피.
// z.ZodTypeAny(=ZodType<any>) 사용 시 z.infer<T>가 any가 되는데 비해
// z.ZodType<Output>은 result.data를 strict하게 Output으로 추론.
export class ZodValidationPipe<Output> implements PipeTransform<
  unknown,
  Output
> {
  constructor(private readonly schema: z.ZodType<Output>) {}

  transform(value: unknown): Output {
    const result = this.schema.safeParse(value);
    if (result.success) {
      return result.data;
    }
    throw new BadRequestException({
      message: 'validation failed',
      code: 'VALIDATION_FAILED',
      issues: result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
  }
}
