import requests
import time

BASE_URL = "https://acc3202-ticketing-bot.onrender.com"

EMAIL = "test@test.com"
PASSWORD = "test"

EVENT_ID = 2
TICKET_TYPE_ID = 5
QUANTITY = 1

DELAY_SECONDS = 2      # avoid hammering the server
MAX_ATTEMPTS = 30      # safety limit


def login():
    url = f"{BASE_URL}/api/login"
    payload = {
        "email": EMAIL,
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


def buy_one_ticket(token):
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

    for attempt in range(1, MAX_ATTEMPTS + 1):
        print(f"\nAttempt {attempt}/{MAX_ATTEMPTS}")

        try:
            response = buy_one_ticket(token)

            if response.status_code == 200:
                print("Purchase request accepted.")

            elif response.status_code == 401:
                print("Token expired or invalid. Logging in again.")
                token = login()

            elif response.status_code == 429:
                print("Rate limited. Waiting longer.")
                time.sleep(10)

            else:
                print("Purchase failed or blocked.")

        except requests.exceptions.RequestException as e:
            print(f"Network error: {e}")

        time.sleep(DELAY_SECONDS)


if __name__ == "__main__":
    main()