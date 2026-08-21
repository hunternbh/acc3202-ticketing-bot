import requests
BASE_URL = "https://acc3202-ticketing-bot.onrender.com"

USERNAME = "admin"
PASSWORD = "adminpass2"

EVENT_ID = 1
TICKET_TYPE_ID = 1
QUANTITY = 5


def login():
    url = f"{BASE_URL}/api/login"
    payload = {
        "username": USERNAME,
        "password": PASSWORD
    }

    response = requests.post(url, json=payload, timeout=10)

    if response.status_code != 200:
        raise Exception(f"Login failed: {response.status_code} {response.text}")

    data = response.json()
    token = data.get("token")

    if not token:
        raise Exception(f"No token returned: {data}")

    print("Login successful.")
    return token


def automated_buy(token):
    url = f"{BASE_URL}/api/purchase"

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Origin": "https://hunternbh.github.io",
        "Referer": "https://hunternbh.github.io/"
    }

    payload = {
        "eventId": EVENT_ID,
        "items": [
            {
                "ticketTypeId": TICKET_TYPE_ID,
                "quantity": QUANTITY
            }
        ]
    }

    response = requests.post(url, json=payload, headers=headers, timeout=10)

    print(f"Status: {response.status_code}")

    try:
        print(response.json())
    except Exception:
        print(response.text)

    return response


def main():
    token = login()
    automated_buy(token)


if __name__ == "__main__":
    main()
