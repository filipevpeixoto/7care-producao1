import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export interface Activity {
  id: string
  title: string
  description?: string
  imageUrl: string
  date?: string
  active: boolean
  order: number
}

export function useActivities() {
  const queryClient = useQueryClient()

  const { data: activities = [], isLoading } = useQuery<Activity[]>({
    queryKey: ['activities'],
    queryFn: async () => {
      const response = await fetch('/api/activities')
      if (!response.ok) {
        throw new Error('Falha ao carregar atividades')
      }
      return response.json()
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
  })

  const addActivityMutation = useMutation({
    mutationFn: async (activity: Omit<Activity, 'id'>) => {
      const response = await fetch('/api/activities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(activity),
      })
      if (!response.ok) {
        throw new Error('Falha ao adicionar atividade')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] })
    },
  })

  const updateActivityMutation = useMutation({
    mutationFn: async ({ id, ...activity }: Activity) => {
      const response = await fetch(`/api/activities/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(activity),
      })
      if (!response.ok) {
        throw new Error('Falha ao atualizar atividade')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] })
    },
  })

  const deleteActivityMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/activities/${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        throw new Error('Falha ao deletar atividade')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] })
    },
  })

  // Memoize active activities to prevent unnecessary re-renders
  const activeActivities = activities.filter(activity => activity.active)

  return {
    activities,
    activeActivities,
    isLoading,
    addActivity: addActivityMutation.mutate,
    updateActivity: updateActivityMutation.mutate,
    deleteActivity: deleteActivityMutation.mutate,
    isAdding: addActivityMutation.isPending,
    isUpdating: updateActivityMutation.isPending,
    isDeleting: deleteActivityMutation.isPending,
  }
} 