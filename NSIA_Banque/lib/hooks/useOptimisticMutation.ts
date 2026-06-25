import { useState, useCallback } from "react";
import toast from "react-hot-toast";

interface OptimisticMutationOptions<TData, TVariables> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  onSuccess?: (data: TData) => void;
  onError?: (error: Error) => void;
  optimisticUpdate?: (variables: TVariables) => void;
  rollback?: () => void;
  successMessage?: string;
  errorMessage?: string;
}

export function useOptimisticMutation<TData, TVariables>() {
  const [isLoading, setIsLoading] = useState(false);

  const mutate = useCallback(
    async (
      variables: TVariables,
      options: OptimisticMutationOptions<TData, TVariables>
    ) => {
      setIsLoading(true);

      // Optimistic update
      if (options.optimisticUpdate) {
        options.optimisticUpdate(variables);
      }

      try {
        const data = await options.mutationFn(variables);
        
        if (options.onSuccess) {
          options.onSuccess(data);
        }

        if (options.successMessage) {
          toast.success(options.successMessage);
        }

        return data;
      } catch (error: any) {
        // Rollback on error
        if (options.rollback) {
          options.rollback();
        }

        if (options.onError) {
          options.onError(error);
        }

        const message = options.errorMessage || error?.message || "Une erreur est survenue";
        toast.error(message);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return { mutate, isLoading };
}




