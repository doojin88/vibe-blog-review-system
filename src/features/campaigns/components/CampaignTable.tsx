'use client';

import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatDate } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { Campaign } from '@/features/campaigns/lib/dto';

type Props = {
  campaigns: Campaign[];
};

export function CampaignTable({ campaigns }: Props) {
  const router = useRouter();

  const getStatusBadgeVariant = (status: string): any => {
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
  };

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>체험단명</TableHead>
            <TableHead>모집 상태</TableHead>
            <TableHead>신청자 수</TableHead>
            <TableHead>모집 인원</TableHead>
            <TableHead>생성일</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {campaigns.map((campaign) => (
            <TableRow
              key={campaign.id}
              onClick={() => router.push(`/dashboard/campaigns/${campaign.id}`)}
              className="cursor-pointer hover:bg-gray-50"
            >
              <TableCell className="font-medium">{campaign.title}</TableCell>
              <TableCell>
                <Badge variant={getStatusBadgeVariant(campaign.status)}>
                  {campaign.status}
                </Badge>
              </TableCell>
              <TableCell>{campaign.applicants_count || 0}명</TableCell>
              <TableCell>{campaign.recruitment_count}명</TableCell>
              <TableCell>
                {formatDate(new Date(campaign.created_at), 'PPP', { locale: ko })}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
