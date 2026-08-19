import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common'
import type { Response } from 'express'
import { NotFoundError, ValidationError } from './integrations.errors'

@Catch(NotFoundError, ValidationError)
export class IntegrationsExceptionFilter implements ExceptionFilter {
  catch(error: NotFoundError | ValidationError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>()
    const status = error instanceof NotFoundError ? HttpStatus.NOT_FOUND : HttpStatus.BAD_REQUEST
    response.status(status).json({
      statusCode: status,
      error: error.name,
      message: error.message,
    })
  }
}
