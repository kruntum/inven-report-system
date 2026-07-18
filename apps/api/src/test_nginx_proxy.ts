async function run() {
  try {
    const loginRes = await fetch("http://localhost:6006/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "admin",
        password: "Qp6&vKd8#mXs2wR1"
      })
    });
    
    if (!loginRes.ok) {
      const txt = await loginRes.text();
      throw new Error(`Login failed via proxy: ${txt}`);
    }
    
    const { token } = await loginRes.json();
    console.log("Logged in via proxy successfully.");
    
    const reportsRes = await fetch("http://localhost:6006/api/reports", {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });
    
    const data = await reportsRes.json();
    console.log("Proxy reports response data[0]:", JSON.stringify(data.data[0], null, 2));
  } catch (e) {
    console.error(e);
  }
}
run();
