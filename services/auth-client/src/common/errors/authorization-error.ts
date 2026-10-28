import { HttpException } from '@nestjs/common';

type AuthorizationErrorCondition =
  | { status: 400; code: 'malformedRequest' }
  | { status: 403; code: 'invalAuth' | 'invalRedir' }
  | { status: 404; code: 'noResource' }
  | { status: 500; code: 'internalError' };

export class AuthorizationError extends HttpException {
  constructor(condition: AuthorizationErrorCondition, detail: string) {
    super({ errorCode: condition.code, errorDetail: detail }, condition.status);
  }
}
