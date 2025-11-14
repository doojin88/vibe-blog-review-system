'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { Campaign } from '@/features/campaigns/lib/dto';

type Props = {
  campaign: Campaign;
};

export function CampaignInfoCard({ campaign }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* 기본 정보 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">기본 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm text-gray-500">카테고리</p>
            <Badge variant="outline">{campaign.category}</Badge>
          </div>
          <div>
            <p className="text-sm text-gray-500">설명</p>
            <p className="text-sm">{campaign.description}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">제공 혜택</p>
            <p className="text-sm">{campaign.benefits}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">미션 및 요구사항</p>
            <p className="text-sm">{campaign.mission}</p>
          </div>
        </CardContent>
      </Card>

      {/* 모집 정보 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">모집 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm text-gray-500">모집 기간</p>
            <p className="text-sm">
              {formatDate(new Date(campaign.recruitment_start_date), 'PPP', { locale: ko })} ~{' '}
              {formatDate(new Date(campaign.recruitment_end_date), 'PPP', { locale: ko })}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">모집 인원</p>
            <p className="text-sm">{campaign.recruitment_count}명</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">신청자 수</p>
            <p className="text-sm">{campaign.applicants_count || 0}명</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">상태</p>
            <Badge variant={getStatusBadgeVariant(campaign.status)}>
              {campaign.status}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* 매장 정보 */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-lg">매장 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">업체명</p>
              <p className="text-sm">{campaign.store_name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">연락처</p>
              <p className="text-sm">{campaign.store_phone}</p>
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500">주소</p>
            <p className="text-sm">{campaign.store_address}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function getStatusBadgeVariant(status: string): any {
  switch (status) {
    case '모집중':
      return 'default';
    case '모집종료':
      return 'secondary';
    case '선정완료':
      return 'success';
    default:
      return 'outline';
  }
}
