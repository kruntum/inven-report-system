// Helper functions for PDF document generation

export const getMonthNameThai = (m: number) =>
  ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน",
   "กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"][m - 1] ?? "";

export const getLastDayOfMonth = (month: number, year: number) =>
  new Date(year, month, 0).getDate();

export const arrayBufferToBase64 = (buf: ArrayBuffer): string => {
  let b = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.byteLength; i++) b += String.fromCharCode(bytes[i]);
  return window.btoa(b);
};

export const parsePartnerDetailsRawText = (jsonStr: string): string => {
  if (!jsonStr) return "-";
  try {
    const data = JSON.parse(jsonStr);
    const list: any[] = Array.isArray(data) ? data : (data.partners || []);
    if (!list.length) return "-";
    const seen = new Set<string>();
    const formatted = list
      .map((item) => {
        let label = item.name || "-";
        if (item.regNo) label += ` (DOA: ${item.regNo})`;
        if (item.sourcePartnerName)
          label += ` [ต้นทาง: ${item.sourcePartnerName}${item.sourcePartnerRegNo ? ` DOA:${item.sourcePartnerRegNo}` : ""}]`;
        return label;
      })
      .filter((l) => { if (seen.has(l)) return false; seen.add(l); return true; });
    
    const maxItems = 3;
    const truncated = formatted.slice(0, maxItems);
    if (formatted.length > maxItems) {
      truncated.push(`...และอีก ${formatted.length - maxItems} ราย`);
    }
    return truncated.join("\n");
  } catch { return "-"; }
};

export const renderUsageTypesText = (r: any) => {
  const parts: string[] = [];
  if (Number(r.totalSalesExportQty) > 0) parts.push("ส่งออกต่างประเทศ");
  if (Number(r.totalSalesDomesticQty) > 0) parts.push("จำหน่ายในประเทศ");
  if (Number(r.totalUsageQty) > 0) parts.push("ใช้แปรรูปผลิต");
  return parts.join("\n");
};

export const renderUsageQtysText = (r: any) => {
  const parts: string[] = [];
  if (Number(r.totalSalesExportQty) > 0) parts.push(Number(r.totalSalesExportQty).toLocaleString());
  if (Number(r.totalSalesDomesticQty) > 0) parts.push(Number(r.totalSalesDomesticQty).toLocaleString());
  if (Number(r.totalUsageQty) > 0) parts.push(Number(r.totalUsageQty).toLocaleString());
  return parts.join("\n");
};

export function buildDocDefinition(r: any, garudaBase64: string, userFullName: string): any {
  // Dotted line padding helper to make it look like a physical form template
  const padDots = (text: string, totalLen: number): string => {
    const val = text || "";
    if (val.length >= totalLen) return " " + val + " ";
    const diff = totalLen - val.length;
    const half = Math.floor(diff / 2);
    const leftDots = ".".repeat(half);
    const rightDots = ".".repeat(diff - half);
    return leftDots + " " + val + " " + rightDots;
  };

  // Header right-side reception box (must have borders)
  const receptionBox: any = {
    table: {
      widths: [170],
      body: [[
        {
          stack: [
            { text: "เลขที่รับ..................................................", fontSize: 7, margin: [0, 0, 0, 3] },
            { text: "ลงชื่อ..........................................................ผู้รับแจ้ง", fontSize: 7, margin: [0, 0, 0, 3] },
            { text: "      (............................................................)", fontSize: 7, margin: [0, 0, 0, 3] },
            { text: "ตำแหน่ง...................................................", fontSize: 7, margin: [0, 0, 0, 3] },
            { text: "วันที่............./............./............. เวลา...........น.", fontSize: 7 },
          ],
          margin: [4, 4, 4, 4],
        }
      ]],
    },
    width: 180,
  };

  // Validate raw base64 payload to prevent silent crashes from mime-mismatch
  const commaIdx = garudaBase64.indexOf(",");
  const rawBase64 = commaIdx > -1 ? garudaBase64.substring(commaIdx + 1) : garudaBase64;
  const isValidImage = rawBase64.startsWith("/9j/") || rawBase64.startsWith("iVBOR");

  // Garuda center
  const garudaCell: any = isValidImage
    ? { image: garudaBase64, width: 55, height: 55, alignment: "center" }
    : { text: "[ ตราครุฑ ]", fontSize: 10, bold: true, alignment: "center", margin: [0, 10, 0, 10] };

  const beginDate = "1";
  const endDate = String(getLastDayOfMonth(r.reportMonth, r.reportYear));
  const monthName = getMonthNameThai(r.reportMonth);
  const buddhistYear = String(r.reportYear + 543);

  const submittedDay = r.submittedAt ? String(new Date(r.submittedAt).getDate()) : "....";
  const submittedMonth = r.submittedAt ? getMonthNameThai(new Date(r.submittedAt).getMonth() + 1) : "................";
  const submittedYear = r.submittedAt ? String(new Date(r.submittedAt).getFullYear() + 543) : "........";

  const prevBalance = (
    Number(r.endingBalanceQty) -
    Number(r.totalPurchaseQty) +
    Number(r.totalSalesQty) +
    Number(r.totalUsageQty)
  ).toLocaleString();

  return {
    pageSize: "A4",
    pageOrientation: "landscape",
    pageMargins: [20, 10, 20, 10],
    defaultStyle: { font: "Sarabun", fontSize: 8 },
    content: [
      // ── ABSOLUTE RECEPTION BOX (Top Right) ───────────────────
      {
        stack: [
          { text: "แบบ มพอ. ๐๑", alignment: "right", bold: true, fontSize: 8, margin: [0, 0, 0, 1] },
          receptionBox,
        ],
        absolutePosition: { x: 640, y: 15 }
      },

      // ── CENTERED GARUDA EMBLEM ──────────────────────────────
      {
        columns: [
          { text: "", width: "*" },
          { ...garudaCell, width: 60 },
          { text: "", width: "*" }
        ],
        margin: [0, 0, 0, 3]
      },

      // ── FORM TITLE ────────────────────────────────────────────
      { text: "แบบแจ้ง", alignment: "center", fontSize: 11, bold: true, margin: [0, 1, 0, 1] },
      { text: "ตามประกาศคณะกรรมการกลางว่าด้วยราคาสินค้าและบริการ", alignment: "center", bold: true, fontSize: 8, margin: [0, 0, 0, 0] },
      { text: "ฉบับที่ ๒๖ พ.ศ. ๒๕๖๙", alignment: "center", bold: true, fontSize: 8, margin: [0, 0, 0, 0] },
      { text: "เรื่อง การแจ้งราคา ปริมาณ สถานที่เก็บ และจัดทำบัญชีคุมสินค้ามะพร้าวผลอ่อนและน้ำมะพร้าว", alignment: "center", fontSize: 8, margin: [0, 0, 0, 0] },
      { text: "ลงวันที่ ๑ กรกฎาคม พ.ศ. ๒๕๖๙", alignment: "center", bold: true, fontSize: 8, margin: [0, 0, 0, 3] },

      // ── OPERATOR INFO ─────────────────────────────────────────
      {
        canvas: [{ type: "line", x1: 335, y1: 0, x2: 455, y2: 0, lineWidth: 0.5 }],
        margin: [0, 2, 0, 5],
      },
      {
        text: [
          { text: "ชื่อผู้ประกอบธุรกิจ (บริษัท/ห้างหุ้นส่วน/ร้าน/นาย/นาง/นางสาว) " },
          { text: padDots(r.companyName || "บริษัท มะพร้าวไทยรุ่งเรือง จำกัด", 50), bold: true },
          { text: " ทะเบียนนิติบุคคล/บัตรประจำตัวประชาชน เลขที่ " },
          { text: padDots(r.companyTaxId || "0105563000123", 25), bold: true },
        ],
        lineHeight: 1.25, margin: [0, 0, 0, 0],
      },
      {
        text: [
          { text: "สำนักงานใหญ่/สถานที่ประกอบการ/ภูมิลำเนา ตั้งอยู่ เลขที่ " },
          { text: padDots(r.companyHouseNo || "123/45", 12), bold: true },
          { text: " ตรอก/ซอย " }, { text: padDots(r.companySoi || "-", 10), bold: true },
          { text: " ถนน " }, { text: padDots(r.companyRoad || "พระราม 2", 22), bold: true },
          { text: " ตำบล/แขวง " }, { text: padDots(r.companySubDistrict || "แสมดำ", 16), bold: true },
          { text: " อำเภอ/เขต " }, { text: padDots(r.companyDistrict || "บางขุนเทียน", 20), bold: true },
        ],
        lineHeight: 1.25, margin: [0, 0, 0, 0],
      },
      {
        text: [
          { text: "จังหวัด " }, { text: padDots(r.companyProvince || "กรุงเทพมหานคร", 20), bold: true },
          { text: " รหัสไปรษณีย์ " }, { text: padDots(r.companyZipcode || "10150", 12), bold: true },
          { text: " โทรศัพท์ " }, { text: padDots(r.companyPhone || "02-123-4567", 20), bold: true },
          { text: " โทรสาร " }, { text: padDots("-", 12), bold: true },
          { text: " อีเมล " }, { text: padDots(r.companyEmail || "info@thaicoconutrr.com", 35), bold: true },
        ],
        lineHeight: 1.25, margin: [0, 0, 0, 0],
      },
      {
        text: [
          { text: "ชื่อผู้ประสานงาน " }, { text: padDots(userFullName, 40), bold: true },
          { text: " โทรศัพท์ " }, { text: padDots(r.companyPhone || "02-123-4567", 20), bold: true },
          { text: " ต่อ (ถ้ามี) " }, { text: padDots("-", 10), bold: true },
        ],
        lineHeight: 1.25, margin: [0, 0, 0, 0],
      },
      {
        text: [
          { text: "การแจ้งข้อมูล \u25A1 ครั้งแรก  \u2611 ระหว่างวันที่ " },
          { text: padDots(beginDate, 6), bold: true },
          { text: " ถึงวันที่ " }, { text: padDots(endDate, 6), bold: true },
          { text: " เดือน " }, { text: padDots(monthName, 18), bold: true },
          { text: " พ.ศ. " }, { text: padDots(buddhistYear, 10), bold: true },
          { text: " กำลังการผลิต " }, { text: padDots("-", 15), bold: true },
          { text: " ลูก/เดือน , ตัน/เดือน" },
        ],
        lineHeight: 1.25, margin: [0, 0, 0, 0],
      },
      {
        text: [
          { text: "ประเภทผู้ประกอบการ:  \u2611 ผู้ส่งออก  \u2611 ผู้รับซื้อ  \u25A1 ผู้ผลิตเครื่องดื่มจากมะพร้าวที่ได้รับอนุญาตจากสำนักงานคณะกรรมการอาหารและยา" },
        ],
        lineHeight: 1.25, margin: [0, 0, 0, 0],
      },
      {
        text: [
          { text: "ประเภทสินค้า:  " },
          { text: `${r.productName?.includes("มะพร้าวผลอ่อน") ? "\u2611" : "\u25A1"} มะพร้าวผลอ่อน  ` },
          { text: `${r.productName?.includes("น้ำมะพร้าว") ? "\u2611" : "\u25A1"} น้ำมะพร้าว` },
        ],
        lineHeight: 1.25, margin: [0, 0, 0, 4],
      },

      // ── MAIN TABLE ────────────────────────────────────────────
      {
        table: {
          headerRows: 2,
          widths: [80, 55, 55, 70, 65, 130, 60, 90, 65, 70, 50],
          body: [
            // Header Row 1
            [
              { text: "ชนิด",            rowSpan: 2, alignment: "center", bold: true, margin: [0, 8, 0, 0], fontSize: 8 },
              { text: "ราคาจำหน่าย (บาท/หน่วย)", colSpan: 2, alignment: "center", bold: true, fontSize: 7.5 }, {},
              { text: "ปริมาณคงเหลือยกมา\n(จากเดือนก่อน)\nลูก/ตัน", rowSpan: 2, alignment: "center", bold: true, fontSize: 7, margin: [0, 4, 0, 0] },
              { text: "การรับซื้อ",      colSpan: 3, alignment: "center", bold: true, fontSize: 7.5 }, {}, {},
              { text: "ปริมาณการใช้",       colSpan: 2, alignment: "center", bold: true, fontSize: 7.5 }, {},
              { text: "ปริมาณคงเหลือยกไป\n(ณ สิ้นเดือน)\nลูก/ตัน", rowSpan: 2, alignment: "center", bold: true, fontSize: 7, margin: [0, 4, 0, 0] },
              { text: "หมายเหตุ",        rowSpan: 2, alignment: "center", bold: true, margin: [0, 8, 0, 0], fontSize: 8 },
            ],
            // Header Row 2
            [
              {},
              { text: "ในประเทศ\n(บาท)\nลูก/ตัน",     alignment: "center", fontSize: 6.5 },
              { text: "ส่งออก\n(บาท)\nลูก/ตัน",       alignment: "center", fontSize: 6.5 },
              {},
              { text: "ปริมาณซื้อเข้า\n\nลูก/ตัน",      alignment: "center", fontSize: 6.5 },
              { text: "รับซื้อจาก",                   alignment: "center", fontSize: 6.5 },
              { text: "ราคารับซื้อ\n(บาท)\nลูก/ตัน",  alignment: "center", fontSize: 6.5 },
              { text: "รูปแบบการผลิต",                alignment: "center", fontSize: 6.5 },
              { text: "จำนวน\n\nลูก/ตัน",               alignment: "center", fontSize: 6.5 },
              {},
              {},
            ],
            // Data Row
            [
              { text: r.productName,                          alignment: "center", bold: true,   margin: [0, 2, 0, 2], fontSize: 8 },
              { text: Number(r.avgSalesDomesticPrice) > 0 ? Number(r.avgSalesDomesticPrice).toFixed(2) : "-", alignment: "center", margin: [0, 2, 0, 2] },
              { text: Number(r.avgSalesExportPrice) > 0    ? Number(r.avgSalesExportPrice).toFixed(2)    : "-", alignment: "center", margin: [0, 2, 0, 2] },
              { text: prevBalance,                            alignment: "center", margin: [0, 2, 0, 2] },
              { text: Number(r.totalPurchaseQty).toLocaleString(), alignment: "center", margin: [0, 2, 0, 2] },
              { text: parsePartnerDetailsRawText(r.partnerDetailsJson), alignment: "left", fontSize: 6.5, margin: [2, 2, 2, 2] },
              { text: Number(r.avgPurchasePrice) > 0 ? Number(r.avgPurchasePrice).toFixed(2) : "-", alignment: "center", margin: [0, 2, 0, 2] },
              { text: renderUsageTypesText(r),                alignment: "center", fontSize: 6.5, margin: [0, 2, 0, 2] },
              { text: renderUsageQtysText(r),                 alignment: "center", fontSize: 6.5, margin: [0, 2, 0, 2] },
              { text: Number(r.endingBalanceQty).toLocaleString(), alignment: "center", bold: true, margin: [0, 2, 0, 2] },
              { text: r.remarks || "-",                       alignment: "left",   fontSize: 6.5, margin: [2, 2, 2, 2] },
            ],
            // Empty rows for manual entry (4 empty rows to make it 5 rows total, matching official template)
            ...Array.from({ length: 4 }, () =>
              Array.from({ length: 11 }, () => ({ text: "", margin: [0, 3, 0, 3] }))
            ),
          ],
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
        },
        margin: [0, 0, 0, 4],
      },

      // ── FOOTER ───────────────────────────────────────────────
      {
        columns: [
          // Left: notes
          {
            width: "55%",
            stack: [
              { text: "หมายเหตุ :", bold: true, fontSize: 7.5, margin: [0, 0, 0, 2] },
              { text: "๑. กรณีช่องว่างสำหรับการกรอกไม่พอ ให้ใช้แผ่นแนบ", fontSize: 7 },
              {
                text: [
                  { text: "๒. สถานที่เก็บ โปรดระบุชื่อ ที่อยู่\n" },
                  { text: "    \u2611 ณ โรงงาน ของบริษัท/ห้างหุ้นส่วน/ร้านค้า  ", bold: true },
                  {
                    text: `${r.companyHouseNo || "123/45"}${
                      r.companySoi && r.companySoi !== "-" ? ` ซอย${r.companySoi}` : ""
                    }${
                      r.companyRoad && r.companyRoad !== "-" ? ` ถนน${r.companyRoad}` : ""
                    } ตำบล${r.companySubDistrict || "แสมดำ"} อำเภอ${r.companyDistrict || "บางขุนเทียน"} จังหวัด${r.companyProvince || "กรุงเทพมหานคร"} ${r.companyZipcode || "10150"} (รวมทุกคลัง)\n`,
                    bold: true,
                    fontSize: 6.5
                  },
                  { text: "    \u25A1 ที่อื่น (ระบุ).......................................................................................\n" },
                ],
                fontSize: 7, margin: [0, 1, 0, 1],
              },
              { text: "๓. ลูก คือ หน่วยนับมะพร้าวผลอ่อน / ตัน คือ หน่วยนับน้ำมะพร้าว", fontSize: 7 },
              { text: "๔. การแจ้งข้อมูล ดำเนินการได้ ดังนี้", fontSize: 7, margin: [0, 1, 0, 0] },
              { text: "    ๔.๑ ผู้ที่มีภูมิลำเนาอยู่ในเขตกรุงเทพมหานคร และนนทบุรี ให้แจ้งที่ กองส่งเสริมการค้าสินค้าเกษตร ๑ กรมการค้าภายใน ชั้น ๖ เลขที่ ๕๖๓ ถนนนนทบุรี ตำบลบางกระสอ อำเภอเมือง จังหวัดนนทบุรี ๑๑๐๐๐ โทรศัพท์ ๐ ๒๕๐๗ ๕๗๒๒-๒๓ อีเมล agri.youngcoco@gmail.com", fontSize: 6, color: "#555", margin: [0, 1, 0, 0] },
              { text: "    ๔.๒ ผู้ที่มีภูมิลำเนาในจังหวัดอื่น นอกจาก ๔.๑ ให้แจ้ง ณ สำนักงานพาณิชย์จังหวัดแห่งท้องที่นั้น", fontSize: 6, color: "#555", margin: [0, 1, 0, 0] },
            ],
          },
          // Right: signature block
          {
            width: "45%",
            stack: [
              { text: "ข้าพเจ้าขอรับรองว่ารายการที่แจ้งนี้เป็นความจริงทุกประการ", alignment: "center", bold: true, fontSize: 8, margin: [0, 0, 0, 6] },
              { text: "ลงชื่อผู้แจ้ง..........................................................ผู้มีอำนาจลงนามผูกพันนิติบุคคล/บุคคลธรรมดา", alignment: "center", fontSize: 7 },
              {
                text: [
                  { text: "( " },
                  { text: padDots(userFullName, 40), bold: true },
                  { text: " )" }
                ],
                alignment: "center", fontSize: 7.5, margin: [0, 2, 0, 2],
              },
              {
                text: [
                  { text: "ตำแหน่ง " },
                  { text: padDots("ผู้ประสานงาน/ผู้แทนบริษัท", 45), bold: true }
                ],
                alignment: "center", fontSize: 7.5, margin: [0, 0, 0, 2],
              },
              { text: "(ประทับตรานิติบุคคล)", alignment: "center", fontSize: 6.5, color: "#999", margin: [0, 0, 0, 4] },
              {
                text: [
                  { text: "ยื่นเรื่อง ณ วันที่ " },
                  { text: padDots(submittedDay, 8), bold: true },
                  { text: " เดือน " },
                  { text: padDots(submittedMonth, 16), bold: true },
                  { text: " พ.ศ. " },
                  { text: padDots(submittedYear, 10), bold: true },
                ],
                alignment: "center", fontSize: 7.5,
              },
            ],
          },
        ],
        margin: [0, 0, 0, 0],
      },
    ],
  };
}
