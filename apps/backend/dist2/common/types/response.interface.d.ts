export interface ApiSuccessResponse<T = unknown> {
    success: true;
    data: T;
    timestamp: string;
}
export interface ApiErrorResponse {
    success: false;
    error: {
        code: string;
        message: string;
        details?: unknown[];
    };
    timestamp: string;
}
