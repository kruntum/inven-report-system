import * as React from "react";
import { 
  BookOpen, Settings2, ClipboardList, Send, Search, 
  FileText, FileSpreadsheet, RefreshCw, Trash2, 
  Warehouse, Users, ShieldAlert, Award, FileCheck, Info
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import { Separator } from "@/components/ui/separator.tsx";

type TabType = "rules" | "settings" | "daily" | "reports";

export function UserManualPage() {
  const [activeTab, setActiveTab] = React.useState<TabType>("rules");

  const tabs = [
    { id: "rules", label: "ระเบียบและกฎหมายราชการ", icon: BookOpen },
    { id: "settings", label: "การตั้งค่าและการใช้งาน", icon: Settings2 },
    { id: "daily", label: "การบันทึกคลังสินค้าประจำวัน", icon: ClipboardList },
    { id: "reports", label: "การนำส่งรายงานประจำเดือน", icon: Send },
  ];

  return (
    <div className="flex flex-col xl:flex-row gap-6 h-[calc(100vh-10rem)] min-h-[500px]">
      {/* Sidebar Navigation */}
      <div className="w-full xl:w-80 flex flex-row xl:flex-col gap-2 p-1 bg-muted/30 dark:bg-muted/10 rounded-xl border border-border xl:h-fit overflow-x-auto shrink-0 scrollbar-none">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all whitespace-nowrap cursor-pointer text-left w-full ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-md scale-[1.01]"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      <div className="flex-1 min-w-0 bg-card rounded-xl border border-border overflow-hidden flex flex-col">
        <ScrollArea className="flex-1 p-6">
          <div className="max-w-4xl space-y-6">
            
            {/* TAB 1: RULES & LAW */}
            {activeTab === "rules" && (
              <div className="space-y-6 animate-in fade-in-50 duration-200">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-foreground">ระเบียบและข้อบังคับตามกฎหมายราชการ</h1>
                  <p className="text-sm text-muted-foreground mt-1">เกณฑ์การรายงานและกฎเกณฑ์จากคณะกรรมการกลางว่าด้วยราคาสินค้าและบริการ (สกกร.)</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="bg-sky-600/5 border-sky-600/20 dark:bg-sky-950/10 dark:border-sky-900/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2 text-sky-700 dark:text-sky-400">
                        <Award className="h-5 w-5" />
                        ขอบเขตผู้ประกอบการที่กฎหมายบังคับ
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground leading-relaxed space-y-2">
                      <p>ผู้ประกอบการที่ทำธุรกิจเกี่ยวกับการรับซื้อ แปรรูป หรือจำหน่ายสินค้าเกษตรควบคุม (มะพร้าว) จะต้องแจ้งข้อมูลปริมาณและราคากับราชการเมื่อเข้าข่ายเกณฑ์ดังต่อไปนี้:</p>
                      <ul className="list-disc pl-5 space-y-1">
                        <li><span className="font-semibold text-foreground">มะพร้าวผลแก่/อ่อน:</span> รับซื้อตั้งแต่ <span className="font-semibold text-foreground">10,000 ลูกต่อวัน</span> หรือ <span className="font-semibold text-foreground">300,000 ลูกต่อเดือน</span> ขึ้นไป</li>
                        <li><span className="font-semibold text-foreground">น้ำมะพร้าว:</span> รับซื้อหรือแปรรูปตั้งแต่ <span className="font-semibold text-foreground">4 ตันต่อวัน</span> หรือ <span className="font-semibold text-foreground">120 ตันต่อเดือน</span> ขึ้นไป</li>
                      </ul>
                    </CardContent>
                  </Card>

                  <Card className="bg-amber-600/5 border-amber-600/20 dark:bg-amber-950/10 dark:border-amber-900/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2 text-amber-700 dark:text-amber-400">
                        <FileCheck className="h-5 w-5" />
                        เอกสารข้อตกลงและการมอบอำนาจ
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground leading-relaxed space-y-2">
                      <p>ก่อนที่ผู้ประกอบการจะยื่นรายงานผ่านระบบอิเล็กทรอนิกส์ได้ จะต้องลงทะเบียนเอกสารทางการส่งไปยังกรมการค้าภายใน ดังนี้:</p>
                      <ul className="list-decimal pl-5 space-y-1">
                        <li><span className="font-semibold text-foreground">แบบ สภก. ๐๑:</span> หนังสือทำความตกลงการแจ้งข้อมูลปริมาณและราคาทางระบบคอมพิวเตอร์</li>
                        <li><span className="font-semibold text-foreground">แบบ สภก. ๐๒:</span> หนังสือแต่งตั้งและมอบอำนาจให้ผู้แทนเป็นผู้จัดทำและยื่นรายงานแทน</li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>

                <Card className="border-destructive/20 dark:border-destructive/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2 text-destructive">
                      <ShieldAlert className="h-5 w-5" />
                      บทลงโทษการละเลยและรายงานเท็จ
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground leading-relaxed">
                    ตามพระราชบัญญัติว่าด้วยราคาสินค้าและบริการ พ.ศ. ๒๕๔๒ การไม่ยื่นรายงานตามระยะเวลาที่กำหนด (ภายในวันที่ 5 ของเดือนถัดไป) หรือจงใจแจ้งข้อมูลเท็จ มีโทษจำคุกไม่เกิน ๑ ปี หรือปรับไม่เกิน ๒๐,๐๐๐ บาท หรือทั้งจำทั้งปรับ และปรับรายวันอีกวันละไม่เกิน ๒,๐๐๐ บาท ตลอดเวลาที่ยังฝ่าฝืน
                  </CardContent>
                </Card>
              </div>
            )}

            {/* TAB 2: SYSTEM SETTINGS */}
            {activeTab === "settings" && (
              <div className="space-y-6 animate-in fade-in-50 duration-200">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-foreground">การตั้งค่าข้อมูลหลักของระบบ</h1>
                  <p className="text-sm text-muted-foreground mt-1">คู่มือสำหรับผู้ดูแลระบบ (Admin) ในการกำหนดค่าฐานข้อมูลเริ่มต้นของบริษัท</p>
                </div>

                <div className="space-y-4">
                  <div className="flex gap-4 items-start border-b border-border pb-4">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary shrink-0">
                      <Settings2 className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-semibold text-foreground text-sm">๑. ตั้งค่าข้อมูลผู้ประกอบการ (Company Settings)</h3>
                      <p className="text-sm text-muted-foreground">
                        พนักงานระดับ Admin สามารถกรอกรายละเอียดบริษัท ได้แก่ เลขผู้เสียภาษี 13 หลัก, ที่อยู่ตามทะเบียนราษฎร์, เบอร์ติดต่อ, อีเมล และ**ชื่อผู้ลงนาม/ตำแหน่งงานผู้มีอำนาจ (สภก. 02)** ข้อมูลเหล่านี้จะถูกดึงไปจัดวางบนเอกสาร PDF และลายเซ็น Excel โดยอัตโนมัติ
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4 items-start border-b border-border pb-4">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary shrink-0">
                      <Warehouse className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-semibold text-foreground text-sm">๒. การจัดการคลังสินค้า/สถานที่เก็บ (Storage Management)</h3>
                      <p className="text-sm text-muted-foreground">
                        การคำนวณบัญชีคุมของราชการต้องทำแยกรายสถานที่เก็บ Admin สามารถเพิ่มคลังสินค้าในระบบเพื่อรองรับการตรวจสต๊อกของเจ้าหน้าที่ได้ หากไม่ได้ใช้งานคลังนั้นแล้วสามารถกด "ลบ" ได้ โดยระบบจะใช้ **Soft Delete** เพื่อซ่อนคลังนั้นแต่ยังคงเก็บประวัติธุรกรรมเดิมไว้ตรวจสอบย้อนหลังได้ตามกฎหมาย
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4 items-start">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary shrink-0">
                      <Users className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-semibold text-foreground text-sm">๓. การจัดการผู้ใช้งาน (User Management)</h3>
                      <p className="text-sm text-muted-foreground">
                        การสร้างบัญชีให้กับพนักงานคลังสินค้าประกอบด้วยบทบาท:
                      </p>
                      <ul className="list-disc pl-5 text-sm text-muted-foreground mt-1 space-y-1">
                        <li><span className="font-semibold text-foreground">Admin:</span> ตั้งค่าบริษัท เพิ่ม/ลบผู้ใช้ จัดการข้อมูลหลัก และนำส่ง/ดึงรายงานกลับ</li>
                        <li><span className="font-semibold text-foreground">Data Entry (พนักงานคลัง):</span> ทำหน้าที่ลงรายการรับเข้า-จ่ายออกคลัง และพิมพ์เอกสารรายวันเท่านั้น</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: DAILY OPERATIONS */}
            {activeTab === "daily" && (
              <div className="space-y-6 animate-in fade-in-50 duration-200">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-foreground">การบันทึกรายการสินค้าประจำวัน</h1>
                  <p className="text-sm text-muted-foreground mt-1">วิธีการลงข้อมูลธุรกรรม รับเข้า จำหน่ายออก และการประมวลผลสต๊อกรายวัน</p>
                </div>

                <div className="space-y-4">
                  <Card className="bg-primary/5 border-primary/20 dark:bg-primary/950/10">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-bold text-primary flex items-center gap-2">
                        <Info className="h-4 w-4" />
                        กฎทางบัญชีของราชการ: การเรียงลำดับธุรกรรมในวันเดียวกัน
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs text-muted-foreground leading-relaxed">
                      ในกรณีที่เกิดธุรกรรมทั้ง <strong>"การรับซื้อเข้า (IN)"</strong> และ <strong>"การจำหน่ายออก (OUT)"</strong> ในวันเดียวกัน ระบบบัญชีคุมคลังของรัฐกำหนดให้ <strong>จัดเรียงการซื้อเข้าขึ้นก่อนการขาย/จำหน่ายเสมอ</strong> แม้ว่าพนักงานจะคีย์ข้อมูลขายก่อนก็ตาม เพื่อป้องกันไม่ให้ยอดดุลคงเหลือสะสม ณ วินาทีนั้นติดลบระหว่างวัน (Running Balance น้อยกว่า 0)
                    </CardContent>
                  </Card>

                  <div className="space-y-3 mt-4 text-sm text-muted-foreground">
                    <h3 className="font-semibold text-foreground">ขั้นตอนการลงรายการ:</h3>
                    <ol className="list-decimal pl-5 space-y-2">
                      <li>
                        <span className="font-semibold text-foreground">กดปุ่ม "+ บันทึกธุรกรรมคลังสินค้า"</span> ที่มุมบนขวาในหน้าบันทึกประจำวัน
                      </li>
                      <li>
                        <span className="font-semibold text-foreground">กรอกข้อมูลธุรกรรม:</span>
                        <ul className="list-disc pl-5 mt-1 space-y-1">
                          <li>เลือกคลังสินค้า และ สินค้าควบคุม (มะพร้าวผลอ่อน / น้ำมะพร้าว)</li>
                          <li>เลือกประเภทรายการ: <span className="text-emerald-600 font-semibold">รับซื้อ (ซื้อเข้า)</span> หรือ <span className="text-sky-600 font-semibold">จำหน่าย (จำหน่ายในประเทศ/ส่งออก)</span> หรือ <span className="text-amber-600 font-semibold">ใช้อื่นๆ (แช่แข็ง/แปรรูป)</span></li>
                          <li>ระบุปริมาณ และราคาต่อหน่วย (สำหรับน้ำมะพร้าวรองรับทศนิยมละเอียด 4 ตำแหน่ง)</li>
                          <li>ระบุข้อมูลคู่ค้า: ชื่อผู้ขาย (เกษตรกร/ผู้รวบรวม) หรือ ปลายทางผู้ซื้อ</li>
                        </ul>
                      </li>
                      <li>
                        <span className="font-semibold text-foreground">อัปโหลดเอกสารหลักฐาน:</span> แนบไฟล์ใบกำกับภาษี, สัญญาซื้อขาย หรือเอกสารชั่งน้ำหนักที่เกี่ยวข้องทุกครั้งเพื่อเป็นหลักฐานอ้างอิงตอนเจ้าหน้าที่เข้าตรวจสต๊อกคลังจริง
                      </li>
                      <li>
                        <span className="font-semibold text-foreground">ช่องหมายเหตุ:</span> หากมีการปรับปรุงยอด หรือบันทึกพิเศษ ให้กรอกลงในช่องหมายเหตุ ซึ่งในรายงาน Excel จะถูกตั้งสไตล์ให้จัดชิดซ้ายโดยอัตโนมัติเพื่อให้อ่านง่ายเป็นระเบียบ
                      </li>
                    </ol>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: MONTHLY REPORT & BUTTONS */}
            {activeTab === "reports" && (
              <div className="space-y-6 animate-in fade-in-50 duration-200">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-foreground">การจัดทำและนำส่งรายงานประจำเดือน</h1>
                  <p className="text-sm text-muted-foreground mt-1">การประมวลผลร่างรายงาน สกกร. การตรวจสอบ และความหมายของแต่ละปุ่มควบคุม</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5 text-sm text-muted-foreground">
                    <h3 className="font-semibold text-foreground">กระบวนการสร้างและล็อกข้อมูล:</h3>
                    <ul className="list-disc pl-5 space-y-1.5">
                      <li>เมื่อสิ้นเดือน ให้กดปุ่ม <span className="font-semibold text-foreground">"+ ประมวลผลบัญชีคุมสินค้า"</span> เพื่อคำนวณยอดยกมา ราคาซื้อเฉลี่ย ยอดขายเฉลี่ย และยอดคงเหลือยกไปของเดือนนั้นๆ ออกมาเป็นร่างรายงาน (Draft)</li>
                      <li>ตรวจสอบความถูกต้องผ่านตารางสรุป และทำการกดยื่นส่งข้อมูลให้กับราชการ</li>
                      <li><span className="font-semibold text-destructive">สำคัญมาก:</span> เมื่อส่งรายงานแล้ว (สถานะเป็น <span className="text-emerald-600 font-semibold">✓ ยื่นข้อมูลแล้ว</span>) ระบบจะทำการล็อกข้อมูลคลังของเดือนนั้นทันที พนักงานจะไม่สามารถเข้าไปเพิ่ม แก้ไข หรือลบรายการย้อนหลังในเดือนนั้นได้อีก หากต้องการแก้ไขจริงๆ จะต้องกด "ดึงรายงานกลับ" ก่อน</li>
                    </ul>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <h3 className="font-semibold text-foreground text-sm">💡 อธิบายหน้าที่ของปุ่มจัดการในตารางรายงาน (Action Buttons):</h3>
                    
                    <div className="grid grid-cols-1 gap-3">
                      
                      <div className="flex gap-4 items-center p-3 bg-muted/30 dark:bg-muted/10 rounded-lg border border-border">
                        <div className="h-8 w-8 bg-sky-600/5 text-sky-600 border border-sky-600/20 rounded flex items-center justify-center shrink-0">
                          <Search className="h-4 w-4" />
                        </div>
                        <div className="text-sm">
                          <p className="font-semibold text-foreground">ปุ่มตรวจสอบยอดสะสม (Search)</p>
                          <p className="text-xs text-muted-foreground">ใช้สำหรับเปิดกล่องหน้าจอ (Dialog) แสดงตารางบัญชีคุมวัสดุ (Stock Ledger) เพื่อตรวจสอบรายการรับจ่ายสะสมรายวันของเดือนนั้นๆ ได้อย่างละเอียด</p>
                        </div>
                      </div>

                      <div className="flex gap-4 items-center p-3 bg-muted/30 dark:bg-muted/10 rounded-lg border border-border">
                        <div className="h-8 w-8 bg-amber-600/5 text-amber-600 border border-amber-600/20 rounded flex items-center justify-center shrink-0">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="text-sm">
                          <p className="font-semibold text-foreground">ปุ่มแสดงแบบ มพอ. ๐๑ (PDF)</p>
                          <p className="text-xs text-muted-foreground">ใช้สำหรับเปิดดูตัวอย่างหน้ากระดาษรายงานแบบฟอร์ม มพอ. ๐๑ (แบบบัญชีคุมรับจ่ายสินค้าราชการ) ในรูปแบบ PDF ก่อนยื่นส่งจริง</p>
                        </div>
                      </div>

                      <div className="flex gap-4 items-center p-3 bg-muted/30 dark:bg-muted/10 rounded-lg border border-border">
                        <div className="h-8 w-8 bg-emerald-600/5 text-emerald-600 border border-emerald-600/20 rounded flex items-center justify-center shrink-0">
                          <FileSpreadsheet className="h-4 w-4" />
                        </div>
                        <div className="text-sm">
                          <p className="font-semibold text-foreground">ปุ่มดาวน์โหลดรายงาน (Excel)</p>
                          <p className="text-xs text-muted-foreground">ใช้ดาวน์โหลดไฟล์รายงาน Excel สำเร็จรูปตามเทมเพลตมาตรฐานกรมการค้าภายใน พร้อมกรอกข้อมูลบริษัท ลายเซ็นรับรอง และช่องหมายเหตุจัดชิดซ้ายเรียบร้อย</p>
                        </div>
                      </div>

                      <div className="flex gap-4 items-center p-3 bg-muted/30 dark:bg-muted/10 rounded-lg border border-border">
                        <div className="h-8 w-8 bg-primary text-primary-foreground rounded flex items-center justify-center shrink-0">
                          <Send className="h-3.5 w-3.5" />
                        </div>
                        <div className="text-sm">
                          <p className="font-semibold text-foreground">ปุ่มยืนยันและนำส่งรายงาน (Submit)</p>
                          <p className="text-xs text-muted-foreground">ใช้กดยื่นส่งรายงานนี้ให้กรมการค้าภายในเมื่อตรวจสอบตัวเลขเสร็จสิ้น และทำการล็อกการแก้ไขข้อมูลคลังของเดือนนั้น</p>
                        </div>
                      </div>

                      <div className="flex gap-4 items-center p-3 bg-muted/30 dark:bg-muted/10 rounded-lg border border-border">
                        <div className="h-8 w-8 bg-indigo-600/5 text-indigo-600 border border-indigo-600/20 rounded flex items-center justify-center shrink-0">
                          <RefreshCw className="h-4 w-4" />
                        </div>
                        <div className="text-sm">
                          <p className="font-semibold text-foreground">ปุ่มประมวลผลอัพเดทใหม่ (Recalculate)</p>
                          <p className="text-xs text-muted-foreground">ใช้กดยืนยันคำนวณยอดยกไปและราคาซื้อ-ขายเฉลี่ยใหม่ (ทำได้เฉพาะกรณีรายงานยังมีสถานะเป็นร่าง Draft) เช่น เมื่อมีการคีย์หรือแก้ไขข้อมูลคลังย้อนหลัง</p>
                        </div>
                      </div>

                      <div className="flex gap-4 items-center p-3 bg-muted/30 dark:bg-muted/10 rounded-lg border border-border">
                        <div className="h-8 w-8 bg-rose-600/5 text-rose-600 border border-rose-600/20 rounded flex items-center justify-center shrink-0">
                          <Trash2 className="h-4 w-4" />
                        </div>
                        <div className="text-sm">
                          <p className="font-semibold text-foreground">ปุ่มลบรายงานร่าง (Delete)</p>
                          <p className="text-xs text-muted-foreground text-rose-600 dark:text-rose-400">ใช้สำหรับลบสรุปรายงานประจำเดือนที่มีสถานะเป็นร่าง (จะไม่ส่งผลกระทบใดๆ ต่อข้อมูลธุรกรรมรายวันของคุณ)</p>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

export default UserManualPage;
