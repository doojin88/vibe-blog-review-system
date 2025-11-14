'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useCurrentUserContext } from '@/features/auth/context/current-user-context';
import { useCampaignDetail } from '@/features/campaign-detail/hooks/useCampaignDetail';
import { CampaignSummaryCard } from '@/features/application/components/campaign-summary-card';
import { CampaignApplicationForm } from '@/features/application/components/campaign-application-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export default function CampaignApplyPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading: isUserLoading, isAuthenticated, status } =
    useCurrentUserContext();
  const campaignId = Number(params.id);

  // 1. 인증 및 권한 검증
  useEffect(() => {
    if (!isUserLoading) {
      // 비로그인
      if (!isAuthenticated) {
        router.push(`/login?redirect=/campaigns/${campaignId}/apply`);
        return;
      }

      // 인플루언서가 아닌 경우
      if (user?.role !== 'influencer') {
        router.push(`/campaigns/${campaignId}`);
        return;
      }

      // 프로필 미등록
      if (!user?.hasProfile) {
        router.push(
          `/onboarding/influencer?redirect=/campaigns/${campaignId}/apply`
        );
        return;
      }
    }
  }, [isUserLoading, isAuthenticated, user, campaignId, router]);

  // 2. 체험단 정보 조회
  const {
    data: campaignData,
    isLoading: isCampaignLoading,
    error: campaignError,
  } = useCampaignDetail(campaignId);

  const campaign = campaignData?.campaign;

  // 3. 로딩 상태
  if (isUserLoading || isCampaignLoading) {
    return (
      <div className="container max-w-2xl py-8">
        <Skeleton className="h-48 mb-6" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  // 4. 에러 처리
  if (campaignError || !campaign) {
    return (
      <div className="container max-w-2xl py-8">
        <Card>
          <CardHeader>
            <CardTitle>체험단을 찾을 수 없습니다</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/')}>홈으로 돌아가기</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 5. 모집 상태 확인
  if (campaign?.status !== '모집중') {
    return (
      <div className="container max-w-2xl py-8">
        <Card>
          <CardHeader>
            <CardTitle>모집이 종료되었습니다</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              이 체험단은 더 이상 지원을 받지 않습니다.
            </p>
            <Button onClick={() => router.push(`/campaigns/${campaignId}`)}>
              체험단 상세 보기
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-8">
      {/* 체험단 요약 카드 */}
      <CampaignSummaryCard campaign={campaign} className="mb-6" />

      {/* 지원서 작성 폼 */}
      <Card>
        <CardHeader>
          <CardTitle>체험단 지원하기</CardTitle>
        </CardHeader>
        <CardContent>
          <CampaignApplicationForm campaignId={campaignId} />
        </CardContent>
      </Card>
    </div>
  );
}
