'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser';

interface CampaignCTAButtonProps {
  campaignId: number;
  campaignStatus: '모집중' | '모집종료' | '선정완료';
  hasApplied: boolean | null;
  isOwner: boolean;
}

export function CampaignCTAButton({
  campaignId,
  campaignStatus,
  hasApplied,
  isOwner,
}: CampaignCTAButtonProps) {
  const router = useRouter();
  const { user, isAuthenticated } = useCurrentUser();

  if (isOwner) {
    return null;
  }

  if (!isAuthenticated) {
    return (
      <Button
        size="lg"
        className="w-full"
        onClick={() => router.push('/login')}
      >
        로그인 후 지원하기
      </Button>
    );
  }

  const profile = user?.profile;

  if (!user?.role || !user?.hasProfile) {
    const redirectPath =
      user?.role === 'advertiser'
        ? '/onboarding/advertiser'
        : '/onboarding/influencer';

    return (
      <Button
        size="lg"
        className="w-full"
        onClick={() => router.push(redirectPath)}
      >
        프로필 등록 후 지원하기
      </Button>
    );
  }

  if (user.role === 'advertiser') {
    return null;
  }

  if (hasApplied) {
    return (
      <Button size="lg" className="w-full" disabled>
        지원 완료
      </Button>
    );
  }

  if (campaignStatus !== '모집중') {
    return (
      <Button size="lg" className="w-full" disabled>
        모집 종료
      </Button>
    );
  }

  return (
    <Button
      size="lg"
      className="w-full"
      onClick={() => router.push(`/campaigns/${campaignId}/apply`)}
    >
      지원하기
    </Button>
  );
}
