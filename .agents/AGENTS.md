# Project Rules — ระบบบัญชีคุมสินค้า

## 1. กฎการพัฒนา Frontend (UI & UX)
* **บังคับใช้ shadcn/ui:** ต้องเลือกใช้คอมโพเนนต์มาตรฐานจาก `shadcn/ui` ก่อนเสมอ (เช่น Button, Input, Select, Dialog, Table, Form, Sidebar, ScrollArea ฯลฯ)
  * ห้ามเขียน custom HTML tags/CSS สำหรับคอมโพเนนต์พื้นฐานเหล่านี้เด็ดขาด
  * เมื่อมีการ์ดหรือพื้นที่ที่ต้องเลื่อน (Scrolling) ต้องใช้งาน `<ScrollArea>` จาก `shadcn/ui` เสมอ
  * การแสดงผลตารางข้อมูลทั้งหมดต้องใช้คอมโพเนนต์ `<Table>` ของ `shadcn/ui` โดยหากในระบบมีตารางข้อมูลหลายตาราง ต้องออกแบบสร้างขึ้นมาเป็น Common/Shared Component (เช่น DataTable Wrapper) ที่สามารถนำกลับมาใช้ใหม่ (Reusable) ได้อย่างคล่องตัวและยืดหยุ่นสูง
  * ห้ามเขียนระบุคลาสสไตล์ตกแต่งหรือ CSS แบบ Hardcode หากไม่จำเป็นอย่างยิ่งยวด (เช่น ห้ามกำหนดสีกระดาษ รหัสสี สีขอบ หรือความกว้างแบบเฉพาะเจาะจงระดับพิกเซล) ให้ใช้คุณสมบัติและตัวแปรระบบ CSS Variables (`var(--...)` และ oklch) ของ `shadcn/ui` และ Tailwind utility classes แท้โดยตรง เพื่อให้ธีมและ Dark Mode ทำงานร่วมกันได้สมบูรณ์และปรับแต่งจากส่วนกลางได้สะดวก
* **สไตล์และธีม (Tailwind CSS v4 + tweakcn.com):**
  * สไตล์ทั้งหมดต้องอ้างอิงผ่าน Tailwind CSS utility classes และ CSS Variables ในรูปแบบ OKLCH เท่านั้น ห้ามระบุรหัสสีแบบ Hardcode (เช่น `bg-white` หรือ `text-black` ให้เปลี่ยนเป็น `bg-background` หรือ `text-foreground` เพื่อรองรับ Dark Mode และการแก้ไขสีจาก tweakcn.com)
  * ต้องออกแบบให้รองรับ Dark Mode อย่างสมบูรณ์ผ่านคลาส `.dark`
* **การจัดการสถานะ (State Management):**
  * ใช้ **Zustand** สำหรับ Client State (เช่น สถานะการเปิด/ปิด Sidebar, User Session)
  * ใช้ **TanStack React Query** สำหรับ Server State (การ Fetching, Caching, Mutating ข้อมูล)
* **การจัดเส้นทาง (Routing):** ใช้ `react-router-dom` สำหรับการเปลี่ยนหน้าภายในแอปพลิเคชัน (SPA)
* **การแยกโครงสร้างไฟล์ (Component Separation & Modular Page Design):**
  * ห้ามเขียนโค้ดหน้าเพจ (Pages/Views) หรือคอมโพเนนต์ขนาดใหญ่รวมกันใน `App.tsx` เด็ดขาด
  * `App.tsx` ต้องทำหน้าที่เป็นเพียง Router และ Global Provider Layout เท่านั้น (ความยาวไม่ควรเกิน 150-200 บรรทัด)
  * หน้าเพจหลักแต่ละหน้า (เช่น แดชบอร์ด, บันทึกสต็อก, ตั้งค่าบริษัท) จะต้องถูกแยกเป็นไฟล์เดี่ยวและสร้างไว้ภายใต้โฟลเดอร์ `apps/web/src/pages/`
  * โค้ดคอมโพเนนต์ที่นำกลับมาใช้ซ้ำได้ (Reusable Components) ต้องแยกเก็บไว้ใน `apps/web/src/components/` เท่านั้น
  * การแก้ไขระบบในอนาคต หากพบไฟล์ที่มีขนาดใหญ่เกิน 500 บรรทัด หรือมีการรวมหน้าจอ ให้ AI เสนอแผนเพื่อ Refactor แยกไฟล์ก่อนทำการแก้ไขทางธุรกิจเสมอ

## 2. กฎการตรวจสอบและความถูกต้องของข้อมูล (Data Integrity)
* **ห้ามใช้ Float สำหรับเงินและปริมาณ:**
  * ในฐานข้อมูล (PostgreSQL): บังคับใช้ `DECIMAL(14,4)` สำหรับปริมาณสินค้า (Quantity) และ `DECIMAL(14,2)` สำหรับยอดเงิน/ราคาต่อหน่วย (Price/Unit Price)
  * ใน Frontend: ห้ามคำนวณเงินหรือทศนิยมด้วยวิธีปกติของ JavaScript ให้ใช้ไลบรารี `decimal.js` หรือ `dinero.js` ในการคำนวณเพื่อป้องกันปัญหา Floating Point Error
* **การจัดการโซนเวลา (Timezone):** การจัดการวันที่และเวลาทั้งหมดต้องใช้ `dayjs` โดยตั้งค่า Timezone เริ่มต้นเป็น `Asia/Bangkok` เสมอ
* **การตรวจสอบข้อมูลขาเข้า (Validation):**
  * ข้อมูลขาเข้า (Request Body/Params) บน Backend ต้องถูกตรวจสอบผ่าน Zod Schema เสมอ
  * ฟอร์มบน Frontend ต้องใช้ `react-hook-form` ร่วมกับ `@hookform/resolvers` (Zod)

## 3. กฎฐานข้อมูลและ ORM (Drizzle ORM)
* **การออกแบบตาราง (3NF & Constraints):**
  * ตารางต้องอยู่ในรูปแบบ Third Normal Form (3NF)
  * ทุกตารางต้องมี `created_at` และ `updated_at` (ยกเว้น Master Tables ที่มีแค่ข้อมูลอ้างอิง)
  * กำหนดพฤติกรรม `onDelete` บน Foreign Key ให้เหมาะสม (เช่น `restrict` บน Master Tables หรือ Core Relations และ `set null` บนข้อมูลเสริมที่ลบได้)
* **Soft Delete:**
  * บังคับใช้ระบบลบแบบนุ่มนวล (Soft Delete) โดยการเพิ่มฟิลด์ `deleted_at` (TIMESTAMPTZ) ในตารางหลัก เพื่อให้ระบบราชการสามารถสืบค้นประวัติย้อนหลังได้โดยข้อมูลไม่สูญหาย
  * ทุกการคิวรีข้อมูลทั่วไป (SELECT) ต้องกรอง `deleted_at IS NULL` ออกเสมอ (ใช้ Helper `notDeleted`)

## 4. กฎสถาปัตยกรรม Monorepo และ Docker
* **โครงสร้าง:** แยกแอปพลิเคชันออกเป็น `apps/api` (Backend Run on Bun/Hono) และ `apps/web` (Frontend Run on React/Vite)
* **พอร์ตการเชื่อมต่อ (Port Mapping):** ในสภาพแวดล้อม Docker ต้องจัดสรรให้อยู่ในกลุ่มพอร์ต `600*` เพื่อความเป็นระเบียบและไม่ชนกับระบบอื่น:
  * Web Application (Vite/Nginx): พอร์ต `6000` (Local Dev ใช้พอร์ตเดิม `5173`)
  * Backend API: พอร์ต `6001`
  * Reverse Proxy (Nginx): พอร์ต `6006` (ทางเข้าหลักเพื่อ Forward ไปยัง API และ Frontend)
  * MinIO API: พอร์ต `6007`
  * MinIO Console: พอร์ต `6008`
  * PostgreSQL: พอร์ต `6009`
* **ข้อมูลเข้าสู่ระบบที่ปลอดภัย:** ห้ามระบุรหัสผ่านเริ่มต้นที่ง่ายในสคริปต์ ให้ใช้รหัสผ่านที่มีความแข็งแกร่ง (Strong Credentials) และ URL-encode สำหรับอักขระพิเศษใน `DATABASE_URL`
