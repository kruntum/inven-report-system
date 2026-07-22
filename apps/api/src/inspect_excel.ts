import fs from "fs";
import path from "path";
import JSZip from "jszip";

async function run() {
  const templatePath = path.resolve("../web/public/file/TEMPLATE.xlsx");
  if (!fs.existsSync(templatePath)) {
    console.error("TEMPLATE.xlsx not found");
    return;
  }

  const data = fs.readFileSync(templatePath);
  const zip = await JSZip.loadAsync(data);
  const xmlPath = "xl/drawings/drawing1.xml";
  
  if (zip.files[xmlPath]) {
    const xml = await zip.files[xmlPath].async("text");
    
    // Find all patterns of dots (5 or more dots)
    const regex = /\.{5,}/g;
    let match;
    console.log("=== DOT PATTERNS FOUND IN XML ===");
    while ((match = regex.exec(xml)) !== null) {
      const startIndex = Math.max(0, match.index - 30);
      const endIndex = Math.min(xml.length, match.index + match[0].length + 30);
      const context = xml.substring(startIndex, endIndex);
      console.log(`Dots length: ${match[0].length}`);
      console.log(`Context: "${context.replace(/\n/g, " ")}"`);
      console.log("-----------------------------------------");
    }
  }
}

run();
