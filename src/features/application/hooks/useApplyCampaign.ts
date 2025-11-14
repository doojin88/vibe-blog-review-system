import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/remote/api-client';
import type {
  CreateApplicationRequest,
  ApplicationResponse,
} from '@/features/application/lib/dto';

export const useApplyCampaign = () => {
  const queryClient = useQueryClient();

  return useMutation<ApplicationResponse, Error, CreateApplicationRequest>({
    mutationFn: async (data) => {
      const response = await apiClient.post('/api/applications', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['my-applications'] });
    },
  });
};
