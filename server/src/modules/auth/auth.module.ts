import { Module } from '@nestjs/common'
import { JwtModule, JwtService } from '@nestjs/jwt'
import { AuthController } from './auth.controller'
import { AUTH_SERVICE, createAuthService } from './auth.service'
import { JwtAuthGuard } from './auth.guard'
import { RolesGuard } from './roles.guard'
import { USERS_REPOSITORY, type UsersRepository } from './users.repository'
import { InMemoryUsersRepository } from './in-memory.users.repository'
import { Argon2PasswordHasher, PASSWORD_HASHER, type PasswordHasher } from './password.service'
import { JwtTokenService, TOKEN_SERVICE, type TokenService } from './token.service'
import { OtplibTotpService, TOTP_SERVICE, type TotpService } from './totp.service'
import { LoginThrottler } from './login.throttler'

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
      signOptions: { expiresIn: '15m' },
    }),
  ],
  controllers: [AuthController],
  providers: [
    { provide: USERS_REPOSITORY, useClass: InMemoryUsersRepository },
    { provide: PASSWORD_HASHER, useClass: Argon2PasswordHasher },
    { provide: TOTP_SERVICE, useFactory: () => new OtplibTotpService() },
    {
      provide: TOKEN_SERVICE,
      useFactory: (jwt: JwtService) => new JwtTokenService(jwt),
      inject: [JwtService],
    },
    LoginThrottler,
    {
      provide: AUTH_SERVICE,
      useFactory: (
        repository: UsersRepository,
        hasher: PasswordHasher,
        tokens: TokenService,
        totp: TotpService,
        throttler: LoginThrottler,
      ) => createAuthService({ repository, hasher, tokens, totp, throttler }),
      inject: [USERS_REPOSITORY, PASSWORD_HASHER, TOKEN_SERVICE, TOTP_SERVICE, LoginThrottler],
    },
    JwtAuthGuard,
    RolesGuard,
  ],
  exports: [AUTH_SERVICE, JwtAuthGuard, RolesGuard],
})
export class AuthModule {}
