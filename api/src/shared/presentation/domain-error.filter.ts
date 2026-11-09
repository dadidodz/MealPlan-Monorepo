import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { DomainError, DomainErrorKind } from '../domain/domain-error';

const STATUS_BY_KIND: Record<DomainErrorKind, HttpStatus> = {
    'not-found': HttpStatus.NOT_FOUND,
    invalid: HttpStatus.UNPROCESSABLE_ENTITY,
    conflict: HttpStatus.CONFLICT,
};

@Catch(DomainError)
export class DomainErrorFilter implements ExceptionFilter<DomainError> {
    catch(error: DomainError, host: ArgumentsHost): void {
        const status = STATUS_BY_KIND[error.kind];
        host.switchToHttp().getResponse<Response>().status(status).json({
            statusCode: status,
            message: error.message,
            code: error.code,
        });
    }
}
