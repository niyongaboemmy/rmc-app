import { VerifyPhoneForm } from '@/components/auth/VerifyPhoneForm';
import { AuthLayout } from '@/components/auth/AuthLayout';

export default function VerifyPhonePage() {
  // Deliberately not wrapped in GuestRoute: registration lands here while signed
  // out, but a signed-in user with an unverified number must be able to finish
  // verifying too, and GuestRoute would bounce them away.
  return (
    <AuthLayout>
      <VerifyPhoneForm />
    </AuthLayout>
  );
}
