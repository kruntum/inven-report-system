async function run() {
  try {
    // 1. Login to get JWT token
    const loginRes = await fetch("http://localhost:6001/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "admin",
        password: "Qp6&vKd8#mXs2wR1"
      })
    });
    
    if (!loginRes.ok) {
      const txt = await loginRes.text();
      throw new Error(`Login failed: ${txt}`);
    }
    
    const { token } = await loginRes.json();
    console.log("Logged in successfully. Token acquired.");
    
    // 2. Fetch /reports
    const reportsRes = await fetch("http://localhost:6001/reports", {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });
    
    if (!reportsRes.ok) {
      const txt = await reportsRes.text();
      throw new Error(`Fetch reports failed: ${txt}`);
    }
    
    const data = await reportsRes.json();
    console.log("API response success:", data.success);
    if (data.data && data.data.length > 0) {
      console.log("First report returned by API:", JSON.stringify(data.data[0], null, 2));
    } else {
      console.log("No reports found.");
    }
  } catch (e) {
    console.error(e);
  }
}
run();
