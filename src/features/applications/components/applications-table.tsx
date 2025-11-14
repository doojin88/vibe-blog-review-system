'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ApplicationStatusBadge } from './application-status-badge';
import type { ApplicationItem } from '../lib/dto';

interface ApplicationsTableProps {
  applications: ApplicationItem[];
}

export function ApplicationsTable({ applications }: ApplicationsTableProps) {
  return (
    <Table>
      <TableCaption>지원한 체험단 목록</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>체험단명</TableHead>
          <TableHead>지원일</TableHead>
          <TableHead>상태</TableHead>
          <TableHead>방문 예정일</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {applications.map((application) => (
          <TableRow key={application.id}>
            <TableCell>
              <Link
                href={`/campaigns/${application.campaignId}`}
                className="text-blue-600 hover:underline"
              >
                {application.campaignTitle}
              </Link>
            </TableCell>
            <TableCell>
              {format(new Date(application.appliedAt), 'yyyy-MM-dd', {
                locale: ko,
              })}
            </TableCell>
            <TableCell>
              <ApplicationStatusBadge status={application.status} />
            </TableCell>
            <TableCell>
              {format(new Date(application.visitDate), 'yyyy-MM-dd', {
                locale: ko,
              })}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
