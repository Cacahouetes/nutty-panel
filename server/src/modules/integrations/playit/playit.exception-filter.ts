import { Catch, ExceptionFilter, ArgumentsHost, HttpStatus } from '@nestjs/common'
import type { Response } from 'express'
import {
  PlayitApiError,
  PlayitAuthError,
  PlayitNotFoundError,
  PlayitRateLimitError,
} from './playit-api'
import { PlayitAgentUnavailableError } from './playit-agent-runner'
import { PlayitServerNotFoundError } from './playit.service'

@Catch(
  PlayitServerNotFoundError,
  PlayitAuthError,
  PlayitRateLimitError,
  PlayitNotFoundError,
  PlayitApiError,
  PlayitAgentUnavailableError,
)
export class PlayitExceptionFilter implements ExceptionFilter {
  catch(
    error:
      | PlayitServerNotFoundError
      | PlayitAuthError
      | PlayitRateLimitError
      | PlayitNotFoundError
      | PlayitApiError
      | PlayitAgentUnavailableError,
    host: ArgumentsHost,
  ): void {
    const response = host.switchToHttp().getResponse<Response>()
    let status = HttpStatus.INTERNAL_SERVER_ERROR
    if (error instanceof PlayitServerNotFoundError || error instanceof PlayitNotFoundError) {
      status = HttpStatus.NOT_FOUND
    } else if (error instanceof PlayitAuthError) {
      status = HttpStatus.UNAUTHORIZED
    } else if (error instanceof PlayitRateLimitError) {
      status = HttpStatus.TOO_MANY_REQUESTS
    } else if (error instanceof PlayitApiError) {
      status = HttpStatus.BAD_GATEWAY
    } else if (error instanceof PlayitAgentUnavailableError) {
      status = HttpStatus.SERVICE_UNAVAILABLE
    }
    response.status(status).json({
      statusCode: status,
      error: error.name,
      message: error.message,
    })
  }
}
