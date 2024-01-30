import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    const bearerToken = authHeader?.startsWith('Bearer ')
      ? authHeader.substring(7)
      : null;

    if (!bearerToken) {
      throw new UnauthorizedException('토큰이 제공되지 않았습니다.');
    }

    try {
      const decoded = this.jwtService.verify(bearerToken);
      request.user = decoded; // 요청 객체에 사용자 정보 추가
      return true;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedException('토큰이 만료되었습니다.');
      } else {
        throw new UnauthorizedException('토큰이 유효하지 않습니다.');
      }
    }
  }
}
