import { RegisterForm } from '@/components/auth/RegisterForm';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { GuestRoute } from '@/components/auth/GuestRoute';

export default function RegisterPage() {
  return (
    <GuestRoute>
      <AuthLayout>
        <RegisterForm />
      </AuthLayout>
    </GuestRoute>
  );
}
