import { NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { ApiSuccessResponse } from '../types/response.interface';
export declare class TransformInterceptor<T> implements NestInterceptor<T, ApiSuccessResponse<T>> {
    private readonly reflector;
    constructor(reflector: Reflector);
    intercept(context: ExecutionContext, next: CallHandler): Observable<ApiSuccessResponse<T>>;
}
