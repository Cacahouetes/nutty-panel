import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common'
import type { Response } from 'express'
import {
  InvalidCredentialsError,
  InvalidTotpError,
  NotFoundError,
  ThrottledError,
  TotpRequiredError,
  UnauthorizedError,
  ValidationError,
} from './auth.service'

@Catch(
  InvalidCredentialsError,
  UnauthorizedError,
  TotpRequiredError,
  InvalidTotpError,
  ThrottledError,
  NotFoundError,
  ValidationError,
)
export class AuthExceptionFilter implements ExceptionFilter {
  catch(
    error:
      | InvalidCredentialsError
      | UnauthorizedError
      | TotpRequiredError
      | InvalidTotpError
      | ThrottledError
      | NotFoundError
      | ValidationError,
    host: ArgumentsHost,
  ): void {
    const response = host.switchToHttp().getResponse<Response>()
    const status =
      error instanceof ThrottledError
        ? HttpStatus.TOO_MANY_REQUESTS
        : error instanceof NotFoundError
          ? HttpStatus.NOT_FOUND
          : error instanceof ValidationError
            ? HttpStatus.BAD_REQUEST
            : HttpStatus.UNAUTHORIZED
    response.status(status).json({
      statusCode: status,
      error: error.name,
      message: error.message,
    })
  }
}
