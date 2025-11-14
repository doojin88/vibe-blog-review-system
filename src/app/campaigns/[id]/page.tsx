'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useCampaignDetail } from '@/features/campaigns/hooks/useCampaignDetail';
import { CampaignInfoSection } from '@/features/campaigns/components/campaign-info-section';
import { CampaignCTAButton } from '@/features/campaigns/components/campaign-cta-button';
import { CampaignDetailSkeleton } from '@/features/campaigns/components/campaign-detail-skeleton';

interface CampaignDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function CampaignDetailPage({
  params,
}: CampaignDetailPageProps) {
  const router = useRouter();
  const { id } = use(params);

  const { data, isLoading, error } = useCampaignDetail(id);

  // 로딩 중
  if (isLoading) {
    return <CampaignDetailSkeleton />;
  }

  // 에러 처리
  if (error) {
    const errorMessage =
      (error as any).response?.data?.error?.message ||
      '일시적인 오류가 발생했습니다';
    return (
      <div className="container mx-auto max-w-4xl py-8">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">체험단을 불러올 수 없습니다</h1>
          <p className="text-muted-foreground">{errorMessage}</p>
          <button
            onClick={() => router.push('/')}
            className="text-primary underline"
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  // 데이터 없음
  if (!data) {
    return null;
  }

  const { campaign, hasApplied, isOwner } = data;

  return (
    <div className="container mx-auto max-w-4xl py-8">
      {/* 체험단 정보 */}
      <CampaignInfoSection campaign={campaign} />

      {/* CTA 버튼 */}
      <div className="mt-8">
        <CampaignCTAButton
          campaignId={campaign.id}
          campaignStatus={campaign.status}
          hasApplied={hasApplied}
          isOwner={isOwner}
        />
      </div>
    </div>
  );
}
