'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser';
import { AdvertiserOnboardingForm } from '@/features/advertiser/components/advertiser-onboarding-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdvertiserOnboardingPage() {
  const router = useRouter();
  const { user, status, isAuthenticated } = useCurrentUser();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login?redirect=/onboarding/advertiser');
    }
  }, [status, router]);

  useEffect(() => {
    if (user?.role === 'advertiser' && user?.hasProfile) {
      router.replace('/dashboard');
    }
  }, [user, router]);

  if (status === 'loading' || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl py-8 px-4">
      <div className="mb-8 flex items-center justify-center space-x-4 text-sm">
        <span className="text-muted-foreground">1. 회원가입</span>
        <span className="text-muted-foreground">→</span>
        <span className="text-muted-foreground">2. 역할선택</span>
        <span className="text-muted-foreground">→</span>
        <span className="font-semibold">3. 정보입력</span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>광고주 정보 등록</CardTitle>
          <CardDescription>
            체험단 등록 및 관리를 위해 광고주 정보를 입력해주세요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AdvertiserOnboardingForm />
        </CardContent>
      </Card>
    </div>
  );
}
