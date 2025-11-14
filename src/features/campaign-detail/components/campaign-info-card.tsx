'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CampaignStatusBadge } from './campaign-status-badge';
import type { CampaignDetail } from '../lib/dto';
import type { CampaignStatus } from '../constants/status-map';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface CampaignInfoCardProps {
  campaign: CampaignDetail;
}

export function CampaignInfoCard({ campaign }: CampaignInfoCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{campaign.title}</CardTitle>
          <CampaignStatusBadge status={campaign.status as CampaignStatus} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="font-semibold mb-1">설명</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {campaign.description}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="font-semibold mb-1">모집 정보</h3>
            <div className="text-sm space-y-1">
              <p>
                <span className="text-muted-foreground">모집 인원:</span>{' '}
                {campaign.recruitment_count}명
              </p>
              <p>
                <span className="text-muted-foreground">모집 기간:</span>{' '}
                {format(new Date(campaign.recruitment_start_date), 'yyyy.MM.dd', { locale: ko })}{' '}
                ~{' '}
                {format(new Date(campaign.recruitment_end_date), 'yyyy.MM.dd', { locale: ko })}
              </p>
              <p>
                <span className="text-muted-foreground">카테고리:</span> {campaign.category}
              </p>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-1">매장 정보</h3>
            <div className="text-sm space-y-1">
              <p>
                <span className="text-muted-foreground">매장명:</span> {campaign.store_name}
              </p>
              <p>
                <span className="text-muted-foreground">주소:</span> {campaign.store_address}
              </p>
              <p>
                <span className="text-muted-foreground">전화번호:</span> {campaign.store_phone}
              </p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-1">제공 혜택</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {campaign.benefits}
          </p>
        </div>

        <div>
          <h3 className="font-semibold mb-1">미션 및 요구사항</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {campaign.mission}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
