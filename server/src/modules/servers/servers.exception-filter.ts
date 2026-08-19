import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common'
import type { Response } from 'express'
import { ConflictError, NotFoundError, ValidationError } from './servers.service'

@Catch(ValidationError, NotFoundError, ConflictError)
export class ServersExceptionFilter implements ExceptionFilter {
  catch(error: ValidationError | NotFoundError | ConflictError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>()
    const status =
      error instanceof NotFoundError
        ? HttpStatus.NOT_FOUND
        : error instanceof ConflictError
          ? HttpStatus.CONFLICT
          : HttpStatus.BAD_REQUEST
    response.status(status).json({
      statusCode: status,
      error: error.name,
      message: error.message,
    })
  }
}
