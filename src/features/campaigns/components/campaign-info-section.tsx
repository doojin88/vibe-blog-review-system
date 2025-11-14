'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate } from '@/lib/utils/date';
import type { CampaignDetail } from '../lib/dto';
import { CampaignStatusBadge } from './campaign-status-badge';

interface CampaignInfoSectionProps {
  campaign: CampaignDetail;
}

export function CampaignInfoSection({ campaign }: CampaignInfoSectionProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">{campaign.title}</h1>
          <CampaignStatusBadge status={campaign.status} />
        </div>
        <p className="text-sm text-muted-foreground">
          {campaign.advertiser.business_name}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>모집 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">모집 인원</span>
            <span className="font-medium">{campaign.recruitment_count}명</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">모집 기간</span>
            <span className="font-medium">
              {formatDate(campaign.recruitment_start_date)} ~{' '}
              {formatDate(campaign.recruitment_end_date)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">카테고리</span>
            <span className="font-medium">{campaign.category}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>체험단 소개</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap">{campaign.description}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>제공 혜택</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap">{campaign.benefits}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>미션 및 요구사항</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap">{campaign.mission}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>매장 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">업체명</span>
            <span className="font-medium">{campaign.store_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">주소</span>
            <span className="font-medium">{campaign.store_address}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">전화번호</span>
            <span className="font-medium">{campaign.store_phone}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
