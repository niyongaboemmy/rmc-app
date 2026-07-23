import { Suspense } from 'react';
import { LoginForm } from '@/components/auth/LoginForm';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { GuestRoute } from '@/components/auth/GuestRoute';

export default function LoginPage() {
  return (
    <GuestRoute>
      <AuthLayout>
        {/* LoginForm reads useSearchParams() (?redirect=) — the boundary is
            required or the production build fails on static generation. */}
        <Suspense>
          <LoginForm />
        </Suspense>
      </AuthLayout>
    </GuestRoute>
  );
}
