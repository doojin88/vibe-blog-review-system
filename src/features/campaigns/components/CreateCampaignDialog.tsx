'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/remote/api-client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { CreateCampaignSchema } from '@/features/campaigns/lib/dto';
import type { z } from 'zod';

type FormValues = z.infer<typeof CreateCampaignSchema>;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CreateCampaignDialog({ open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(CreateCampaignSchema),
    defaultValues: {
      title: '',
      description: '',
      recruitment_start_date: '',
      recruitment_end_date: '',
      recruitment_count: 1,
      benefits: '',
      mission: '',
      store_name: '',
      store_address: '',
      store_phone: '',
      category: '음식점',
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const response = await apiClient.post('/api/campaigns', data);
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: '체험단이 등록되었습니다',
        variant: 'default',
      });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      form.reset();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: '체험단 등록에 실패했습니다',
        description: error.response?.data?.error?.message || '다시 시도해주세요',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (data: FormValues) => {
    createMutation.mutate(data);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && form.formState.isDirty) {
      if (confirm('작성 중인 내용이 있습니다. 정말 닫으시겠습니까?')) {
        form.reset();
        onOpenChange(false);
      }
    } else {
      onOpenChange(newOpen);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>신규 체험단 등록</DialogTitle>
          <DialogDescription>
            체험단 정보를 입력하고 등록하세요.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* 체험단명 */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>체험단명 *</FormLabel>
                  <FormControl>
                    <Input placeholder="예: 강남 맛집 체험단" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 설명 */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>설명 *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="체험단에 대한 상세 설명을 입력하세요"
                      className="min-h-24"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 모집 기간 */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="recruitment_start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>모집 시작일 *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="recruitment_end_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>모집 종료일 *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* 모집 인원 */}
            <FormField
              control={form.control}
              name="recruitment_count"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>모집 인원 *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 제공 혜택 */}
            <FormField
              control={form.control}
              name="benefits"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>제공 혜택 *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="예: 무료 식사 제공"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 미션 */}
            <FormField
              control={form.control}
              name="mission"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>미션 및 요구사항 *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="예: 방문 후 블로그 리뷰 작성"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 매장 정보 */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="font-semibold">매장 정보</h3>

              <FormField
                control={form.control}
                name="store_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>업체명 *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="store_address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>주소 *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="store_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>연락처 *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* 카테고리 */}
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>카테고리 *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="카테고리 선택" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="음식점">음식점</SelectItem>
                      <SelectItem value="카페">카페</SelectItem>
                      <SelectItem value="뷰티">뷰티</SelectItem>
                      <SelectItem value="패션">패션</SelectItem>
                      <SelectItem value="생활">생활</SelectItem>
                      <SelectItem value="기타">기타</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                취소
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? '등록 중...' : '등록'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
