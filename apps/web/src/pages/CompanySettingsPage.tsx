import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "../lib/api.ts";
import { useThaiAddress } from "../hooks/useThaiAddress.ts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { toast } from "sonner";

import { companyFormSchema } from "../schemas/index.ts";

export function CompanySettingsPage() {
  const queryClient = useQueryClient();
  const addressSelector = useThaiAddress();

  // Fetch current company settings
  const { data: companyRes, isLoading: loadingCompany } = useQuery({
    queryKey: ["company-my"],
    queryFn: () => api.get("/companies/my"),
  });

  const company = companyRes?.data;

  const { register, handleSubmit, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(companyFormSchema),
    defaultValues: {
      name: "",
      taxId: "",
      houseNo: "",
      soi: "",
      road: "",
      phone: "",
      email: "",
      authorizedPerson: "",
      authorizedPosition: "",
    }
  });

  const { initializeAddress } = addressSelector;

  // Map database values into form and initialize cascading selector when loaded
  React.useEffect(() => {
    if (!company) return;
    
    setValue("name", company.name || "");
    setValue("taxId", company.taxId || "");
    setValue("houseNo", company.houseNo || "");
    setValue("soi", company.soi || "");
    setValue("road", company.road || "");
    setValue("phone", company.phone || "");
    setValue("email", company.email || "");
    setValue("authorizedPerson", company.authorizedPerson || "");
    setValue("authorizedPosition", company.authorizedPosition || "");

    if (company.province) {
      initializeAddress(
        company.province,
        company.district || company.district_name,
        company.subDistrict || company.sub_district
      );
    }
  }, [company, initializeAddress, setValue]);

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
    const selectedNames = addressSelector.getSelectedNames();

    // Fallback to existing database address if user did not re-select from dropdown
    const province = selectedNames.province || company?.province || "";
    const district = selectedNames.district || company?.district || "";
    const subDistrict = selectedNames.subDistrict || company?.subDistrict || "";
    const zipcode = addressSelector.zipcode || company?.zipcode || "";

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
              <h3 className="text-sm font-bold text-foreground">ผู้มีอำนาจลงนามและตำแหน่ง (สำหรับลงชื่อท้ายรายงานส่งราชการ)</h3>
            </div>

            {/* Row: Authorized Person and Position */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="authorizedPerson" className="text-[11px] font-bold text-muted-foreground/90">ชื่อผู้มีอำนาจลงนาม (ข้าพเจ้าขอรับรอง/ลงชื่อผู้แจ้ง)</Label>
                <Input id="authorizedPerson" {...register("authorizedPerson")} placeholder="ระบุชื่อ-นามสกุล..." className="bg-background/80" />
              </div>

              <div className="space-y-1">
                <Label htmlFor="authorizedPosition" className="text-[11px] font-bold text-muted-foreground/90">ตำแหน่งผู้ลงนาม</Label>
                <Input id="authorizedPosition" {...register("authorizedPosition")} placeholder="เช่น กรรมการผู้จัดการ, ผู้รับมอบอำนาจ..." className="bg-background/80" />
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
                <Select
                  value={addressSelector.provinceId || company?.province || ""}
                  onValueChange={(val) => addressSelector.handleProvinceChange(val)}
                >
                  <SelectTrigger className="w-full bg-background/80 h-9 text-xs">
                    <SelectValue placeholder="— เลือกจังหวัด —" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px] overflow-y-auto">
                    {company?.province && (
                      <SelectItem value={company.province}>
                        {company.province}
                      </SelectItem>
                    )}
                    {addressSelector.provinces.map((p) => (
                      <SelectItem key={p.id} value={p.id.toString()}>
                        {p.name_th}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* District Dropdown */}
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-muted-foreground/90">อำเภอ / เขต</Label>
                <Select
                  value={addressSelector.districtId || company?.district || ""}
                  onValueChange={(val) => addressSelector.handleDistrictChange(val)}
                >
                  <SelectTrigger className="w-full bg-background/80 h-9 text-xs">
                    <SelectValue placeholder="— เลือกอำเภอ —" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px] overflow-y-auto">
                    {company?.district && (
                      <SelectItem value={company.district}>
                        {company.district}
                      </SelectItem>
                    )}
                    {addressSelector.districts.map((d: any) => (
                      <SelectItem key={d.id} value={d.id.toString()}>
                        {d.name_th}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* SubDistrict Dropdown */}
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-muted-foreground/90">ตำบล / แขวง</Label>
                <Select
                  value={addressSelector.subDistrictId || company?.subDistrict || ""}
                  onValueChange={(val) => addressSelector.handleSubDistrictChange(val)}
                >
                  <SelectTrigger className="w-full bg-background/80 h-9 text-xs">
                    <SelectValue placeholder="— เลือกตำบล —" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px] overflow-y-auto">
                    {company?.subDistrict && (
                      <SelectItem value={company.subDistrict}>
                        {company.subDistrict}
                      </SelectItem>
                    )}
                    {addressSelector.subDistricts.map((s: any) => (
                      <SelectItem key={s.id} value={s.id.toString()}>
                        {s.name_th}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Zipcode (Auto-filled, Read Only) */}
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-muted-foreground/90">รหัสไปรษณีย์</Label>
                <Input
                  type="text"
                  value={addressSelector.zipcode || company?.zipcode || ""}
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
