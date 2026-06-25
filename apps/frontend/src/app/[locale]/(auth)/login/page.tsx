import { LoginForm } from '@/components/auth/LoginForm';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { GuestRoute } from '@/components/auth/GuestRoute';

export default function LoginPage() {
  return (
    <GuestRoute>
      <AuthLayout>
        <LoginForm />
      </AuthLayout>
    </GuestRoute>
  );
}
