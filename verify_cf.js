async function verify() {
    const fetch = (await import('node-fetch')).default || globalThis.fetch;
    const res = await fetch("https://api.cloudflare.com/client/v4/user/tokens/verify", {
        headers: {
            "Authorization": "Bearer 907U5d-7VEqlnJfSI2TzKEHmhiE8nCDXymAP0b91",
            "Content-Type": "application/json"
        }
    });
    console.log(await res.text());
}
verify();
