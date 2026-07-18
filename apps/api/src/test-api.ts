import { Decimal } from "decimal.js";

const BASE_URL = "http://localhost:6001";

async function runTests() {
  console.log("=== STARTING BACKEND INTEGRATION TESTS ===");

  try {
    // 1. Test Login as Admin (Default seeded user)
    console.log("\n1. Testing Login as Default Admin...");
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "admin",
        password: "Qp6_vKd8_mXs2wR1_safe"
      })
    });
    const loginData = await loginRes.json();
    if (!loginData.success) throw new Error("Admin Login failed: " + JSON.stringify(loginData));
    console.log("✓ Login successful. Token obtained.");
    const token = loginData.token;
    const companyId = loginData.user.companyId;

    // 2. Test fetching Profile
    console.log("\n2. Testing /auth/me profile fetching...");
    const meRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    const meData = await meRes.json();
    if (!meData.success) throw new Error("/auth/me failed: " + JSON.stringify(meData));
    console.log(`✓ Profile fetched. Name: ${meData.user.fullName}`);

    // 3. Test listing Products
    console.log("\n3. Testing list active products...");
    const prodRes = await fetch(`${BASE_URL}/products`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    const prodData = await prodRes.json();
    if (!prodData.success) throw new Error("Get products failed: " + JSON.stringify(prodData));
    console.log(`✓ Products found: ${prodData.data.length}`);
    const productSoft = prodData.data.find((p: any) => p.name === "มะพร้าวผลอ่อน");
    const productId = productSoft.id;
    console.log(`  - Product soft coconut ID: ${productId} (${productSoft.baseUnitName})`);

    // 4. Test listing Storage Locations
    console.log("\n4. Testing list storage locations...");
    const storageRes = await fetch(`${BASE_URL}/storage`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    const storageData = await storageRes.json();
    if (!storageData.success) throw new Error("Get storage failed: " + JSON.stringify(storageData));
    console.log(`✓ Storage locations found: ${storageData.data.length}`);
    const storageLocation = storageData.data[0];
    const storageId = storageLocation.id;
    console.log(`  - Storage Location ID: ${storageId} (Name: ${storageLocation.name})`);

    // 5. Test recording two daily stock transactions (Purchases)
    console.log("\n5. Testing record new daily stock transactions...");
    
    // Purchase 1: 15,000 pieces @ 8.50 Baht
    const tx1Res = await fetch(`${BASE_URL}/stock`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        storageId,
        productId,
        transactionTypeId: 1, // รับซื้อ
        transactionDate: "2026-07-11",
        quantity: "15000.0000",
        unitPrice: "8.50",
        remarks: "รับซื้อผ่านสัญญารายวัน"
      })
    });
    const tx1Data = await tx1Res.json();
    if (!tx1Data.success) throw new Error("Tx 1 creation failed: " + JSON.stringify(tx1Data));
    console.log(`✓ Recorded Transaction 1. ID: ${tx1Data.data.id}`);
    const tx1Id = tx1Data.data.id;

    // Purchase 2: 5,000 pieces @ 9.00 Baht
    const tx2Res = await fetch(`${BASE_URL}/stock`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        storageId,
        productId,
        transactionTypeId: 1, // รับซื้อ
        transactionDate: "2026-07-12",
        quantity: "5000.0000",
        unitPrice: "9.00",
        remarks: "รับซื้อตลาดเกษตรกร"
      })
    });
    const tx2Data = await tx2Res.json();
    if (!tx2Data.success) throw new Error("Tx 2 creation failed: " + JSON.stringify(tx2Data));
    console.log(`✓ Recorded Transaction 2. ID: ${tx2Data.data.id}`);
    const tx2Id = tx2Data.data.id;

    // 6. Test generating monthly report Draft
    console.log("\n6. Testing generate monthly report Draft...");
    const genRes = await fetch(`${BASE_URL}/reports/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        reportMonth: 7,
        reportYear: 2026,
        productId,
        storageId,
        remarks: "สรุปบันทึกการคุมสินค้ารายเดือน"
      })
    });
    const genData = await genRes.json();
    if (!genData.success) throw new Error("Report generation failed: " + JSON.stringify(genData));
    console.log(`✓ Monthly report Draft generated successfully.`);
    console.log(`  - Total Purchase Quantity: ${genData.data.totalPurchaseQty}`);
    console.log(`  - Ending Balance Quantity: ${genData.data.endingBalanceQty}`);
    console.log(`  - Weighted Average Purchase Price: ${genData.data.avgPurchasePrice}`);
    
    // Validate calculations:
    // Qty = 15000 + 5000 = 20000
    // Value = (15000 * 8.50) + (5000 * 9.00) = 127500 + 45000 = 172500
    // Weighted Average = 172500 / 20000 = 8.625 => rounds to 8.63
    const expectedQty = new Decimal("20000.0000");
    const expectedPrice = new Decimal("8.63"); // 8.625 rounded to scale 2
    
    const actualQty = new Decimal(genData.data.totalPurchaseQty);
    const actualPrice = new Decimal(genData.data.avgPurchasePrice);
    
    if (!actualQty.equals(expectedQty) || !actualPrice.equals(expectedPrice)) {
      throw new Error(`Data Integrity verification failed! Expected Qty: ${expectedQty}, Got: ${actualQty}. Expected Price: ${expectedPrice}, Got: ${actualPrice}`);
    }
    console.log("  - ✓ Calculations validated successfully via decimal.js rules!");
    const reportId = genData.data.id;

    // 7. Test submitting report to Gov
    console.log("\n7. Testing submit report to Government...");
    const subRes = await fetch(`${BASE_URL}/reports/submit/${reportId}`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}` }
    });
    const subData = await subRes.json();
    if (!subData.success) throw new Error("Report submit failed: " + JSON.stringify(subData));
    console.log(`✓ Report Submitted. Legal Timestamp: ${subData.data.submittedAt}`);

    // 8. Test Data Integrity Lock: Verify we cannot add transactions to a submitted month
    console.log("\n8. Testing Data Integrity Lock: Adding transaction after submission (should fail)...");
    const lockAddRes = await fetch(`${BASE_URL}/stock`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        storageId,
        productId,
        transactionTypeId: 1,
        transactionDate: "2026-07-15", // Same month: July 2026
        quantity: "1000.0000",
        unitPrice: "8.50"
      })
    });
    const lockAddData = await lockAddRes.json();
    if (lockAddData.success) {
      throw new Error("Security Violation: Successfully added transaction to a submitted month!");
    }
    console.log(`✓ Blocked successfully! Message: "${lockAddData.message}"`);

    // 9. Test Data Integrity Lock: Verify we cannot delete transactions from a submitted month
    console.log("\n9. Testing Data Integrity Lock: Deleting transaction after submission (should fail)...");
    const lockDelRes = await fetch(`${BASE_URL}/stock/${tx1Id}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${token}` }
    });
    const lockDelData = await lockDelRes.json();
    if (lockDelData.success) {
      throw new Error("Security Violation: Successfully deleted transaction from a submitted month!");
    }
    console.log(`✓ Blocked successfully! Message: "${lockDelData.message}"`);

    console.log("\n=== ALL INTEGRATION TESTS PASSED SUCCESSFULLY! ===");
  } catch (err: any) {
    console.error("\n❌ TEST FAILED:", err.message);
    process.exit(1);
  }
}

runTests();
