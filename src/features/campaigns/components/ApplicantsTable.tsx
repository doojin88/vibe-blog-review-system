'use client';

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
import type { Application } from '@/features/campaigns/lib/dto';

type Props = {
  applications: Application[];
};

export function ApplicantsTable({ applications }: Props) {
  const getStatusBadgeVariant = (status: string): any => {
    switch (status) {
      case '신청완료':
        return 'default';
      case '선정':
        return 'success';
      case '반려':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>이름</TableHead>
            <TableHead>SNS 채널명</TableHead>
            <TableHead>팔로워 수</TableHead>
            <TableHead>방문 예정일</TableHead>
            <TableHead>각오 한마디</TableHead>
            <TableHead>상태</TableHead>
            <TableHead>지원일</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {applications.map((application) => (
            <TableRow key={application.id}>
              <TableCell className="font-medium">{application.influencer.name}</TableCell>
              <TableCell>{application.influencer.channel_name}</TableCell>
              <TableCell>{application.influencer.followers_count.toLocaleString()}명</TableCell>
              <TableCell>
                {formatDate(new Date(application.visit_date), 'PPP', { locale: ko })}
              </TableCell>
              <TableCell className="max-w-xs truncate">{application.message}</TableCell>
              <TableCell>
                <Badge variant={getStatusBadgeVariant(application.status)}>
                  {application.status}
                </Badge>
              </TableCell>
              <TableCell>
                {formatDate(new Date(application.applied_at), 'PPP', { locale: ko })}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
