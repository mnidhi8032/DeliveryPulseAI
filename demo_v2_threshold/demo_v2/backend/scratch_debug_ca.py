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
        
        bu_url = "http://127.0.0.1:8000/api/v1/customer-admin/business-unit-health"
        print(f"Requesting {bu_url}...")
        r_bu = httpx.get(bu_url, headers=headers)
        print(f"BU Health status: {r_bu.status_code}")
        print("BU Health response:")
        print(r_bu.text[:2000])
        
    except Exception as e:
        print(f"Error occurred: {e}")

if __name__ == "__main__":
    main()

