'use client';

import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Users } from 'lucide-react';
import { formatRelative } from '@/lib/utils/date';
import type { CampaignListItem } from '@/features/campaign/lib/dto';
import Link from 'next/link';

type CampaignCardProps = {
  campaign: CampaignListItem;
};

export const CampaignCard = ({ campaign }: CampaignCardProps) => {
  const daysUntilDeadline = formatRelative(campaign.recruitmentEndDate);

  const statusColor = {
    모집중: 'bg-blue-500',
    모집종료: 'bg-yellow-500',
    선정완료: 'bg-green-500',
  }[campaign.status];

  return (
    <Link href={`/campaigns/${campaign.id}`}>
      <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-lg line-clamp-2">
              {campaign.title}
            </h3>
            <Badge className={statusColor}>{campaign.status}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{campaign.storeName}</p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>{campaign.recruitmentCount}명 모집</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>{daysUntilDeadline}</span>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Badge variant="outline">{campaign.category}</Badge>
        </CardFooter>
      </Card>
    </Link>
  );
};
