'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, UsersIcon } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { CampaignDetail } from '@/features/campaign-detail/lib/dto';

interface CampaignSummaryCardProps {
  campaign: CampaignDetail;
  className?: string;
}

export function CampaignSummaryCard({
  campaign,
  className,
}: CampaignSummaryCardProps) {
  const daysLeft = differenceInDays(
    new Date(campaign.recruitment_end_date),
    new Date()
  );

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="text-2xl">{campaign.title}</CardTitle>
          <Badge variant={campaign.status === '모집중' ? 'default' : 'secondary'}>
            {campaign.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex items-center gap-2">
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              모집 인원: <strong>{campaign.recruitment_count}명</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              마감일:{' '}
              <strong>
                {format(new Date(campaign.recruitment_end_date), 'PPP', {
                  locale: ko,
                })}
                {daysLeft > 0 && ` (D-${daysLeft})`}
              </strong>
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
