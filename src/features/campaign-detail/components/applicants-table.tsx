'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { Application } from '../lib/dto';
import { APPLICATION_STATUS_MAP, type ApplicationStatus, type CampaignStatus } from '../constants/status-map';
import { cn } from '@/lib/utils';

interface ApplicantsTableProps {
  applications: Application[];
  campaignStatus: CampaignStatus;
}

export function ApplicantsTable({ applications, campaignStatus }: ApplicantsTableProps) {
  if (applications.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>지원자 목록</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            아직 지원한 인플루언서가 없습니다
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>지원자 목록 ({applications.length}명)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3 font-semibold">이름</th>
                <th className="text-left p-3 font-semibold">SNS 채널</th>
                <th className="text-left p-3 font-semibold">팔로워</th>
                <th className="text-left p-3 font-semibold">각오 한마디</th>
                <th className="text-left p-3 font-semibold">방문 예정일</th>
                <th className="text-left p-3 font-semibold">지원일</th>
                {campaignStatus === '선정완료' && (
                  <th className="text-left p-3 font-semibold">상태</th>
                )}
              </tr>
            </thead>
            <tbody>
              {applications.map((app) => {
                const statusConfig = APPLICATION_STATUS_MAP[app.status as ApplicationStatus];
                return (
                  <tr key={app.id} className="border-b hover:bg-muted/50">
                    <td className="p-3">{app.influencer.name}</td>
                    <td className="p-3">
                      <a
                        href={app.influencer.channel_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {app.influencer.channel_name}
                      </a>
                    </td>
                    <td className="p-3">
                      {app.influencer.followers_count.toLocaleString()}명
                    </td>
                    <td className="p-3 max-w-xs truncate">{app.message}</td>
                    <td className="p-3">
                      {format(new Date(app.visit_date), 'yyyy.MM.dd', { locale: ko })}
                    </td>
                    <td className="p-3">
                      {format(new Date(app.applied_at), 'yyyy.MM.dd HH:mm', { locale: ko })}
                    </td>
                    {campaignStatus === '선정완료' && (
                      <td className="p-3">
                        <Badge
                          variant={statusConfig.variant}
                          className={cn(statusConfig.className)}
                        >
                          {statusConfig.label}
                        </Badge>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
