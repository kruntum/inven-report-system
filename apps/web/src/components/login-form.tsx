import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";

import { cn } from "@/lib/utils.ts";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { useAppStore } from "@/store/useAppStore.ts";
import { api } from "@/lib/api.ts";

const loginFormSchema = z.object({
  username: z.string().min(1, "กรุณากรอกชื่อผู้ใช้งาน"),
  password: z.string().min(1, "กรุณากรอกรหัสผ่าน"),
});

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const setAuth = useAppStore((state) => state.setAuth);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<z.infer<typeof loginFormSchema>>({
    resolver: zodResolver(loginFormSchema)
  });

  const loginMutation = useMutation({
    mutationFn: (data: z.infer<typeof loginFormSchema>) => api.post("/auth/login", data),
    onSuccess: (data) => {
      setAuth(data.token, data.user);
    },
    onError: (err: any) => {
      setErrorMsg(err.message || "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
    }
  });

  const onSubmit = (data: z.infer<typeof loginFormSchema>) => {
    setErrorMsg(null);
    loginMutation.mutate(data);
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl font-extrabold">เข้าสู่ระบบแจ้งคุมสินค้า</CardTitle>
          <CardDescription>
            ระเบียบแบบ สกกร. 01 / 02 กรมการค้าภายใน
          </CardDescription>
        </CardHeader>
        <CardContent>
          {errorMsg && (
            <div className="mb-4 rounded-lg bg-destructive/15 p-3 text-xs text-destructive flex items-center gap-2 border border-destructive/20 animate-shake">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="username">ชื่อผู้ใช้งาน</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="ระบุบัญชีผู้ใช้ (e.g. admin)"
                  {...register("username")}
                />
                {errors.username && (
                  <span className="text-xs text-destructive font-medium">{errors.username.message}</span>
                )}
              </div>
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">รหัสผ่าน</Label>
                  <a
                    href="#"
                    className="text-xs underline-offset-4 hover:underline text-muted-foreground"
                  >
                    ลืมรหัสผ่าน?
                  </a>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="ระบุรหัสผ่านระบบ"
                  {...register("password")}
                />
                {errors.password && (
                  <span className="text-xs text-destructive font-medium">{errors.password.message}</span>
                )}
              </div>
              <Button type="submit" disabled={loginMutation.isPending} className="w-full">
                {loginMutation.isPending ? "กำลังเข้าสู่ระบบ..." : "ลงชื่อเข้าใช้"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <div className="text-balance text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 [&_a]:hover:text-primary">
        การคลิกเข้าสู่ระบบแสดงว่าคุณยอมรับข้อตกลง <a href="#">เงื่อนไขการให้บริการ</a>{" "}
        และ <a href="#">นโยบายความเป็นส่วนตัว</a> ตามระเบียบราชการไทย.
      </div>
    </div>
  );
}
