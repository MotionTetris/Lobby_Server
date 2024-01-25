// import {
//     ExceptionFilter,
//     Catch,
//     ArgumentsHost,
//     HttpException,
//     HttpStatus,
//   } from '@nestjs/common';
  
//   @Catch()
//   export class AllExceptionsFilter implements ExceptionFilter {
//     catch(exception: unknown, host: ArgumentsHost) {
//       const ctx = host.switchToHttp();
//       const response = ctx.getResponse();
//       const request = ctx.getRequest();
  
//       // HttpException과 일반 예외를 구분
//       const status = exception instanceof HttpException
//         ? exception.getStatus()
//         : HttpStatus.INTERNAL_SERVER_ERROR;
  
//       // 오류 응답을 정의
//       const errorResponse = {
//         timestamp: new Date().toISOString(),
//         path: request.url,
//         message: exception instanceof HttpException
//           ? exception.getResponse()
//           : 'Internal Server Error',
//       };
  
//       // 클라이언트에 오류 응답을 보냄
//       response.status(status).json(errorResponse);
//     }
//   }


import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config'; // 환경 설정을 위한 서비스

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private configService: ConfigService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    const isProduction = this.configService.get('NODE_ENV') === 'production';

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    let errorMessage = exception instanceof Error ? exception.message : 'Internal Server Error';
    if (typeof errorMessage === 'object') {
      errorMessage = JSON.stringify(errorMessage);
    }

    const stack = exception instanceof Error ? exception.stack : null;
    const formattedStack = isProduction ? null : stack; // 프로덕션 환경에서는 스택 추적을 숨김

    const logMessage = [
      `Status: ${status}`,
      `Error: ${errorMessage}`,
      `Stack: ${formattedStack}`,
      `Timestamp: ${new Date().toISOString()}`,
      `Path: ${request.url}`
    ].join('\n');

    this.logger.error(logMessage);
    
    const errorResponse = {
      timestamp: new Date().toISOString(),
      path: request.url,
      message: exception instanceof HttpException ? exception.getResponse() : errorMessage,
    };

    response.status(status).json(errorResponse);
  }
}
