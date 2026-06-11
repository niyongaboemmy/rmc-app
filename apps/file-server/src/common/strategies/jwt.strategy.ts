import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtUser } from '../decorators/current-user.decorator';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.accessSecret') || '',
    });
  }

  validate(payload: JwtUser): JwtUser {
    if (!payload.sub || !payload.email || !payload.role) {
      throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: 'Invalid token payload' });
    }
    return payload;
  }
}
