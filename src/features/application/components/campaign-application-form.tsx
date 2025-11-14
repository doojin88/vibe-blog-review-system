'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { useApplyCampaign } from '@/features/application/hooks/useApplyCampaign';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const applicationFormSchema = z.object({
  message: z
    .string()
    .min(10, '각오 한마디는 10자 이상이어야 합니다')
    .max(500, '각오 한마디는 500자 이하여야 합니다'),
  visit_date: z.date({
    required_error: '방문 예정일을 선택해주세요',
  }),
});

type ApplicationFormValues = z.infer<typeof applicationFormSchema>;

interface CampaignApplicationFormProps {
  campaignId: number;
}

export function CampaignApplicationForm({
  campaignId,
}: CampaignApplicationFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { mutate: apply, isPending } = useApplyCampaign();

  const form = useForm<ApplicationFormValues>({
    resolver: zodResolver(applicationFormSchema),
    defaultValues: {
      message: '',
    },
  });

  const onSubmit = (values: ApplicationFormValues) => {
    apply(
      {
        campaign_id: campaignId,
        message: values.message,
        visit_date: format(values.visit_date, 'yyyy-MM-dd'),
      },
      {
        onSuccess: () => {
          toast({
            title: '지원 완료',
            description: '체험단 지원이 완료되었습니다',
          });
          router.push('/my/applications');
        },
        onError: (error: Error) => {
          toast({
            title: '지원 실패',
            description: error.message || '지원서 제출에 실패했습니다',
            variant: 'destructive',
          });
        },
      }
    );
  };

  const messageLength = form.watch('message')?.length || 0;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* 각오 한마디 */}
        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel>각오 한마디</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="체험단에 지원하는 각오를 작성해주세요 (10자 이상)"
                  rows={6}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                {messageLength} / 500자
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 방문 예정일 */}
        <FormField
          control={form.control}
          name="visit_date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>방문 예정일</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full pl-3 text-left font-normal',
                        !field.value && 'text-muted-foreground'
                      )}
                    >
                      {field.value ? (
                        format(field.value, 'PPP', { locale: ko })
                      ) : (
                        <span>방문 예정일을 선택해주세요</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) => date < new Date()}
                    initialFocus
                    locale={ko}
                  />
                </PopoverContent>
              </Popover>
              <FormDescription>
                오늘 이후 날짜만 선택 가능합니다
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 제출 버튼 */}
        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isPending}
            className="flex-1"
          >
            취소
          </Button>
          <Button type="submit" disabled={isPending} className="flex-1">
            {isPending ? '제출 중...' : '지원하기'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
