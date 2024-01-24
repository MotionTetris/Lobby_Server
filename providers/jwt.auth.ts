import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization?.split(' ')[1]; 
    
    if (!token) {
      throw new UnauthorizedException('토큰이 제공되지 않았습니다.');
    }

    try {
      const decoded = this.jwtService.verify(token);
      request.user = decoded; // 요청 객체에 사용자 정보 추가
      return true;
    } catch (error) {
      throw new UnauthorizedException('토큰이 유효하지 않습니다.');
    }
  }
}