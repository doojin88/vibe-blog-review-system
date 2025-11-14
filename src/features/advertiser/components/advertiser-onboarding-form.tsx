'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCreateAdvertiser } from '../hooks/useCreateAdvertiser';
import { createAdvertiserSchema, type CreateAdvertiserInput } from '../lib/dto';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { extractApiErrorMessage } from '@/lib/remote/api-client';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export function AdvertiserOnboardingForm() {
  const router = useRouter();
  const { toast } = useToast();
  const createAdvertiser = useCreateAdvertiser();

  const form = useForm<CreateAdvertiserInput>({
    resolver: zodResolver(createAdvertiserSchema),
    defaultValues: {
      name: '',
      birth_date: '',
      phone: '',
      business_name: '',
      address: '',
      business_phone: '',
      business_registration_number: '',
      representative_name: '',
    },
  });

  const onSubmit = async (data: CreateAdvertiserInput) => {
    try {
      await createAdvertiser.mutateAsync(data);

      toast({
        title: '광고주 정보가 등록되었습니다',
        description: '체험단 관리 대시보드로 이동합니다.',
      });

      router.push('/dashboard');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '등록에 실패했습니다',
        description: extractApiErrorMessage(error, '일시적인 오류가 발생했습니다'),
      });
    }
  };

  const handlePhoneChange = (field: any) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    let formatted = value;

    if (value.length > 3 && value.length <= 7) {
      formatted = `${value.slice(0, 3)}-${value.slice(3)}`;
    } else if (value.length > 7) {
      formatted = `${value.slice(0, 3)}-${value.slice(3, 7)}-${value.slice(7, 11)}`;
    }

    field.onChange(formatted);
  };

  const handleBusinessNumberChange = (field: any) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    let formatted = value;

    if (value.length > 3 && value.length <= 5) {
      formatted = `${value.slice(0, 3)}-${value.slice(3)}`;
    } else if (value.length > 5) {
      formatted = `${value.slice(0, 3)}-${value.slice(3, 5)}-${value.slice(5, 10)}`;
    }

    field.onChange(formatted);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">공통 정보</h3>

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>이름 *</FormLabel>
                <FormControl>
                  <Input placeholder="홍길동" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="birth_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>생년월일 *</FormLabel>
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
                          format(new Date(field.value), 'yyyy년 MM월 dd일', { locale: ko })
                        ) : (
                          <span>생년월일을 선택해주세요</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value ? new Date(field.value) : undefined}
                      onSelect={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
                      disabled={(date) => date > new Date() || date < new Date('1900-01-01')}
                      initialFocus
                      locale={ko}
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>휴대폰번호 *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="010-1234-5678"
                    {...field}
                    onChange={handlePhoneChange(field)}
                    maxLength={13}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator />

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">사업자 정보</h3>

          <FormField
            control={form.control}
            name="business_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>업체명 *</FormLabel>
                <FormControl>
                  <Input placeholder="홍길동네 식당" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>주소 *</FormLabel>
                <FormControl>
                  <Input placeholder="서울시 강남구 테헤란로 123" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="business_phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>업장 전화번호 *</FormLabel>
                <FormControl>
                  <Input placeholder="02-1234-5678" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="business_registration_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>사업자등록번호 *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="123-45-67890"
                    {...field}
                    onChange={handleBusinessNumberChange(field)}
                    maxLength={12}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="representative_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>대표자명 *</FormLabel>
                <FormControl>
                  <Input placeholder="홍길동" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={createAdvertiser.isPending}
        >
          {createAdvertiser.isPending ? '처리 중...' : '제출'}
        </Button>
      </form>
    </Form>
  );
}
