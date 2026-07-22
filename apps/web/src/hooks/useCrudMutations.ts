import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api.ts";
import { toast } from "sonner";

interface CrudMessages {
  add?: string;
  edit?: string;
  delete?: string;
}

export function useCrudMutations<TBody = any>(
  endpoint: string,
  queryKey: string[],
  onSuccess?: () => void,
  messages: CrudMessages = {}
) {
  const queryClient = useQueryClient();

  const addMutation = useMutation({
    mutationFn: (body: TBody) => api.post(endpoint, body),
    onSuccess: () => {
      toast.success(messages.add || "บันทึกข้อมูลสำเร็จ");
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ["monthly-reports"] });
      if (onSuccess) onSuccess();
    },
    onError: (err: any) => {
      toast.error(err.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    },
  });

  const editMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: TBody }) =>
      api.put(`${endpoint}/${id}`, body),
    onSuccess: () => {
      toast.success(messages.edit || "แก้ไขข้อมูลสำเร็จ");
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ["monthly-reports"] });
      if (onSuccess) onSuccess();
    },
    onError: (err: any) => {
      toast.error(err.message || "เกิดข้อผิดพลาดในการแก้ไขข้อมูล");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`${endpoint}/${id}`),
    onSuccess: () => {
      toast.success(messages.delete || "ลบข้อมูลสำเร็จ");
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ["monthly-reports"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "เกิดข้อผิดพลาดในการลบข้อมูล");
    },
  });

  return {
    addMutation,
    editMutation,
    deleteMutation,
  };
}
