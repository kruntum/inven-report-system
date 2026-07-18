import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "../lib/api.ts";
import { useThaiAddress } from "../hooks/useThaiAddress.ts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { toast } from "sonner";

export function CompanySettingsPage() {
  const queryClient = useQueryClient();
  const addressSelector = useThaiAddress();

  // Fetch current company settings
  const { data: companyRes, isLoading: loadingCompany } = useQuery({
    queryKey: ["company-my"],
    queryFn: () => api.get("/companies/my"),
  });

  const company = companyRes?.data;

  // React hook form
  const formSchema = z.object({
    name: z.string().min(2, "ชื่อบริษัทต้องมีอย่างน้อย 2 ตัวอักษร"),
    taxId: z.string().length(13, "เลขประจำตัวผู้เสียภาษีต้องมี 13 หลัก"),
    houseNo: z.string().min(1, "กรุณากรอกเลขที่บ้าน"),
    soi: z.string().optional(),
    road: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email("รูปแบบอีเมลไม่ถูกต้อง").optional().or(z.literal("")),
  });

  const { register, handleSubmit, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      taxId: "",
      houseNo: "",
      soi: "",
      road: "",
      phone: "",
      email: "",
    }
  });

  // Map database values into form and initialize cascading selector when loaded
  React.useEffect(() => {
    if (!company || addressSelector.loading) return;
    
    setValue("name", company.name || "");
    setValue("taxId", company.taxId || "");
    setValue("houseNo", company.houseNo || "");
    setValue("soi", company.soi || "");
    setValue("road", company.road || "");
    setValue("phone", company.phone || "");
    setValue("email", company.email || "");

    addressSelector.initializeAddress(
      company.province,
      company.district,
      company.subDistrict
    );
  }, [company, addressSelector.loading, setValue]);

  // Submit Mutation
  const mutation = useMutation({
    mutationFn: (payload: any) => api.put("/companies/my", payload),
    onSuccess: () => {
      toast.success("บันทึกการแก้ไขข้อมูลผู้ประกอบการสำเร็จ");
      queryClient.invalidateQueries({ queryKey: ["company-my"] });
      queryClient.invalidateQueries({ queryKey: ["monthly-reports"] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    }
  });

  const onSubmit = (formData: any) => {
    const { province, district, subDistrict, zipcode } = addressSelector.getSelectedNames();

    if (!province || !district || !subDistrict || !zipcode) {
      toast.warning("กรุณากรอก จังหวัด อำเภอ ตำบล และรหัสไปรษณีย์ ให้ครบถ้วน");
      return;
    }

    const payload = {
      ...formData,
      province,
      district,
      subDistrict,
      zipcode,
    };

    mutation.mutate(payload);
  };

  if (loadingCompany || addressSelector.loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-2">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="text-sm text-muted-foreground">กำลังโหลดข้อมูลผู้ประกอบการ...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-4">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">ตั้งค่าข้อมูลผู้ประกอบการ</h1>
        <p className="text-muted-foreground text-sm">ข้อมูลทะเบียนนิติบุคคลและที่อยู่สำหรับใช้ประมวลผลจัดทำรายงาน มพอ. ๐๑ ส่งรัฐ</p>
      </div>

      <Card className="border-border/60 shadow-sm bg-card/60 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg">ข้อมูลนิติบุคคล / สถานประกอบการ</CardTitle>
          <CardDescription>กรุณากรอกรายละเอียดให้ครบถ้วนเพื่อผลประโยชน์ในการรายงานข้อมูลต่อกรมการค้าภายใน</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            
            {/* Row 1: Name and TaxId */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="name" className="text-[11px] font-bold text-muted-foreground/90">ชื่อผู้ประกอบธุรกิจ (บริษัท/ห้างหุ้นส่วน/ร้าน)</Label>
                <Input id="name" {...register("name")} placeholder="ระบุชื่อบริษัทเต็มตามใบทะเบียน..." className="bg-background/80 animate-in fade-in" />
                {errors.name && <p className="text-[11px] text-destructive">{errors.name.message}</p>}
              </div>

              <div className="space-y-1">
                <Label htmlFor="taxId" className="text-[11px] font-bold text-muted-foreground/90">ทะเบียนนิติบุคคล/บัตรประจำตัวประชาชน เลขที่</Label>
                <Input id="taxId" {...register("taxId")} maxLength={13} placeholder="ระบุเลขประจำตัวผู้เสียภาษี 13 หลัก..." className="bg-background/80" />
                {errors.taxId && <p className="text-[11px] text-destructive">{errors.taxId.message}</p>}
              </div>
            </div>

            {/* Row 2: Phone and Email */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="phone" className="text-[11px] font-bold text-muted-foreground/90">โทรศัพท์</Label>
                <Input id="phone" {...register("phone")} placeholder="เบอร์โทรศัพท์ติดต่อ..." className="bg-background/80" />
              </div>

              <div className="space-y-1">
                <Label htmlFor="email" className="text-[11px] font-bold text-muted-foreground/90">อีเมล</Label>
                <Input id="email" {...register("email")} placeholder="อีเมลสำหรับประสานงาน..." className="bg-background/80" />
                {errors.email && <p className="text-[11px] text-destructive">{errors.email.message}</p>}
              </div>
            </div>

            {/* Divider line */}
            <div className="border-t border-border/60 my-4" />

            <div className="space-y-2">
              <h3 className="text-sm font-bold text-foreground">สำนักงานใหญ่ / สถานที่ประกอบการ ตั้งอยู่</h3>
            </div>

            {/* Row 3: HouseNo, Soi, Road */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label htmlFor="houseNo" className="text-[11px] font-bold text-muted-foreground/90">บ้านเลขที่ / เลขที่ตั้ง</Label>
                <Input id="houseNo" {...register("houseNo")} placeholder="ระบุบ้านเลขที่ เช่น 123/45..." className="bg-background/80" />
                {errors.houseNo && <p className="text-[11px] text-destructive">{errors.houseNo.message}</p>}
              </div>

              <div className="space-y-1">
                <Label htmlFor="soi" className="text-[11px] font-bold text-muted-foreground/90">ตรอก / ซอย (ระบุ - หากไม่มี)</Label>
                <Input id="soi" {...register("soi")} placeholder="ระบุตรอก/ซอย..." className="bg-background/80" />
              </div>

              <div className="space-y-1">
                <Label htmlFor="road" className="text-[11px] font-bold text-muted-foreground/90">ถนน (ระบุ - หากไม่มี)</Label>
                <Input id="road" {...register("road")} placeholder="ระบุถนน..." className="bg-background/80" />
              </div>
            </div>

            {/* Row 4: Cascading Address Selector (Province, District, SubDistrict, Zipcode) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              
              {/* Province Dropdown */}
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-muted-foreground/90">จังหวัด</Label>
                <select
                  value={addressSelector.provinceId}
                  onChange={(e) => addressSelector.handleProvinceChange(e.target.value)}
                  className="w-full rounded-md border border-input bg-background/80 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">— เลือกจังหวัด —</option>
                  {addressSelector.provinces.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name_th}
                    </option>
                  ))}
                </select>
              </div>

              {/* District Dropdown */}
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-muted-foreground/90">อำเภอ / เขต</Label>
                <select
                  value={addressSelector.districtId}
                  onChange={(e) => addressSelector.handleDistrictChange(e.target.value)}
                  disabled={!addressSelector.provinceId}
                  className="w-full rounded-md border border-input bg-background/80 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">— เลือกอำเภอ —</option>
                  {addressSelector.districts.map((d: any) => (
                    <option key={d.id} value={d.id}>
                      {d.name_th}
                    </option>
                  ))}
                </select>
              </div>

              {/* SubDistrict Dropdown */}
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-muted-foreground/90">ตำบล / แขวง</Label>
                <select
                  value={addressSelector.subDistrictId}
                  onChange={(e) => addressSelector.handleSubDistrictChange(e.target.value)}
                  disabled={!addressSelector.districtId}
                  className="w-full rounded-md border border-input bg-background/80 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">— เลือกตำบล —</option>
                  {addressSelector.subDistricts.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.name_th}
                    </option>
                  ))}
                </select>
              </div>

              {/* Zipcode (Auto-filled, Read Only) */}
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-muted-foreground/90">รหัสไปรษณีย์</Label>
                <Input
                  type="text"
                  value={addressSelector.zipcode}
                  readOnly
                  placeholder="ระบบกรอกอัตโนมัติ..."
                  className="bg-muted text-muted-foreground"
                />
              </div>

            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-border/60">
              <Button
                type="submit"
                disabled={mutation.isPending}
                className="w-full md:w-auto"
              >
                {mutation.isPending ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}
              </Button>
            </div>

          </form>
        </CardContent>
      </Card>
    </div>
  );
}
