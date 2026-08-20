import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common'
import type { Response } from 'express'
import { WebhookNotFoundError, WebhookValidationError } from './webhooks.service'

@Catch(WebhookNotFoundError, WebhookValidationError)
export class WebhooksExceptionFilter implements ExceptionFilter {
  catch(error: WebhookNotFoundError | WebhookValidationError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>()
    const status =
      error instanceof WebhookNotFoundError ? HttpStatus.NOT_FOUND : HttpStatus.BAD_REQUEST
    response.status(status).json({
      statusCode: status,
      error: error.name,
      message: error.message,
    })
  }
}
