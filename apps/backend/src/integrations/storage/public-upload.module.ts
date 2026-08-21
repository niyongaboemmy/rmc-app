import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PublicUploadService } from './public-upload.service';

/**
 * Anonymous document uploads for public forms (Hajj payment proofs, funeral death
 * certificates). JwtModule is only used to mint the short-lived service token the
 * file server accepts.
 */
@Module({
  imports: [JwtModule.register({})],
  providers: [PublicUploadService],
  exports: [PublicUploadService],
})
export class PublicUploadModule {}
