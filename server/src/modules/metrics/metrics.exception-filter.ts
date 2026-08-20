import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common'
import type { Response } from 'express'
import { MetricsNotFoundError, MetricsUnavailableError } from './metrics.errors'

@Catch(MetricsNotFoundError, MetricsUnavailableError)
export class MetricsExceptionFilter implements ExceptionFilter {
  catch(error: MetricsNotFoundError | MetricsUnavailableError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>()
    const status =
      error instanceof MetricsNotFoundError ? HttpStatus.NOT_FOUND : HttpStatus.CONFLICT
    response.status(status).json({
      statusCode: status,
      error: error.name,
      message: error.message,
    })
  }
}
