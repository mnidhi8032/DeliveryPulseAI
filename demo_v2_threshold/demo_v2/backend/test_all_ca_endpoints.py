import httpx

def main():
    url = "http://127.0.0.1:8000/api/v1/auth/login"
    payload = {
        "email": "customer.admin@deliverypulse.ai",
        "password": "Demo@12345"
    }
    
    print("Attempting login...")
    try:
        r = httpx.post(url, json=payload)
        print(f"Login status: {r.status_code}")
        if r.status_code != 200:
            print(f"Login failed: {r.text}")
            return
        
        token = r.json().get("access_token")
        headers = {"Authorization": f"Bearer {token}"}
        
        endpoints = [
            "/customer-admin/portfolio-summary",
            "/customer-admin/business-unit-health",
            "/customer-admin/aging",
            "/customer-admin/impact-matrix"
        ]
        
        for ep in endpoints:
            full_url = f"http://127.0.0.1:8000/api/v1{ep}"
            print(f"\nRequesting {full_url}...")
            r_ep = httpx.get(full_url, headers=headers)
            print(f"Status: {r_ep.status_code}")
            if r_ep.status_code == 200:
                print(f"Success! Item count / length of response: {len(r_ep.text)} characters.")
                # Show sample of response
                print(r_ep.text[:300] + "...")
            else:
                print(f"FAILED: {r_ep.text}")
                
    except Exception as e:
        print(f"Error occurred: {e}")

if __name__ == "__main__":
    main()
