'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/remote/api-client';
import { CampaignInfoCard } from '@/features/campaigns/components/CampaignInfoCard';
import { ApplicantsTable } from '@/features/campaigns/components/ApplicantsTable';
import { CloseRecruitmentButton } from '@/features/campaigns/components/CloseRecruitmentButton';
import { SelectInfluencersDialog } from '@/features/campaigns/components/SelectInfluencersDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import type { Campaign, Application } from '@/features/campaigns/lib/dto';

type Props = {
  params: Promise<{ id: string }>;
};

export default function CampaignDetailPage({ params }: Props) {
  const { id } = use(params);
  const campaignId = Number(id);
  const router = useRouter();

  const { data: campaignData, isLoading: isCampaignLoading } = useQuery({
    queryKey: ['campaign', campaignId],
    queryFn: async () => {
      const response = await apiClient.get(`/api/campaigns/${campaignId}`);
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: applicantsData, isLoading: isApplicantsLoading } = useQuery({
    queryKey: ['campaign-applications', campaignId],
    queryFn: async () => {
      const response = await apiClient.get(`/api/campaigns/${campaignId}/applications`);
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isCampaignLoading || isApplicantsLoading) {
    return (
      <div className="container mx-auto p-6">
        <Skeleton className="h-screen w-full" />
      </div>
    );
  }

  const campaign = campaignData?.campaign as Campaign | undefined;
  const applications = (applicantsData?.applications as Application[]) || [];

  if (!campaign) {
    return (
      <div className="container mx-auto p-6 text-center">
        <p className="text-red-500 mb-4">체험단을 찾을 수 없습니다</p>
        <Button onClick={() => router.push('/dashboard')}>대시보드로 돌아가기</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <Button
        variant="ghost"
        onClick={() => router.push('/dashboard')}
        className="mb-6"
      >
        <ChevronLeft className="mr-2 h-4 w-4" />
        대시보드로 돌아가기
      </Button>

      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-4">{campaign.title}</h1>

        {/* 상태별 액션 버튼 */}
        <div className="flex gap-2">
          {campaign.status === '모집중' && (
            <CloseRecruitmentButton campaignId={campaignId} />
          )}
          {campaign.status === '모집종료' && applications.length > 0 && (
            <SelectInfluencersDialog
              campaignId={campaignId}
              recruitmentCount={campaign.recruitment_count}
              applications={applications}
            />
          )}
        </div>
      </div>

      <CampaignInfoCard campaign={campaign} />

      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">신청자 리스트</h2>
        {applications.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            아직 지원한 인플루언서가 없습니다
          </div>
        ) : (
          <ApplicantsTable applications={applications} />
        )}
      </div>
    </div>
  );
}
