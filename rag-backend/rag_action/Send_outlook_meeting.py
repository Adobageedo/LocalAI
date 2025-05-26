import argparse
import os
import requests
import json
from datetime import datetime, timedelta

# You must set these environment variables or replace with your actual values
CLIENT_ID = os.getenv("OUTLOOK_CLIENT_ID", "<YOUR_CLIENT_ID>")
CLIENT_SECRET = os.getenv("OUTLOOK_CLIENT_SECRET", "<YOUR_CLIENT_SECRET>")
TENANT_ID = os.getenv("OUTLOOK_TENANT_ID", "<YOUR_TENANT_ID>")
SENDER_EMAIL = os.getenv("OUTLOOK_SENDER_EMAIL", "<YOUR_EMAIL>")

AUTHORITY = f"https://login.microsoftonline.com/{TENANT_ID}"
TOKEN_ENDPOINT = f"{AUTHORITY}/oauth2/v2.0/token"
GRAPH_API_ENDPOINT = "https://graph.microsoft.com/v1.0"


def get_access_token():
    data = {
        "client_id": CLIENT_ID,
        "scope": "https://graph.microsoft.com/.default",
        "client_secret": CLIENT_SECRET,
        "grant_type": "client_credentials",
    }
    resp = requests.post(TOKEN_ENDPOINT, data=data)
    resp.raise_for_status()
    return resp.json()["access_token"]


def send_meeting(subject, recipients, start, end, location, body):
    access_token = get_access_token()
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    event = {
        "subject": subject,
        "body": {
            "contentType": "HTML",
            "content": body or ""
        },
        "start": {
            "dateTime": start,
            "timeZone": "Europe/Paris"
        },
        "end": {
            "dateTime": end,
            "timeZone": "Europe/Paris"
        },
        "location": {
            "displayName": location or ""
        },
        "attendees": [
            {"emailAddress": {"address": email, "name": email}, "type": "required"}
            for email in recipients
        ],
        "isOnlineMeeting": True,
        "onlineMeetingProvider": "teamsForBusiness"
    }
    url = f"{GRAPH_API_ENDPOINT}/users/{SENDER_EMAIL}/events"
    resp = requests.post(url, headers=headers, data=json.dumps(event))
    if resp.status_code >= 400:
        print("Error sending meeting invite:", resp.text)
        resp.raise_for_status()
    print("Meeting invite sent successfully!")
    print(json.dumps(resp.json(), indent=2, ensure_ascii=False))


def main():
    parser = argparse.ArgumentParser(description="Send an Outlook meeting invite via Microsoft Graph API.")
    parser.add_argument("--subject", required=True, help="Meeting subject")
    parser.add_argument("--recipients", required=True, nargs='+', help="Recipient email addresses (space separated)")
    parser.add_argument("--start", required=True, help="Start datetime (YYYY-MM-DDTHH:MM:SS)")
    parser.add_argument("--end", required=True, help="End datetime (YYYY-MM-DDTHH:MM:SS)")
    parser.add_argument("--location", required=False, default="Teams Meeting", help="Meeting location")
    parser.add_argument("--body", required=False, default="", help="Meeting body/agenda")
    args = parser.parse_args()

    # Validate datetime format
    try:
        datetime.fromisoformat(args.start)
        datetime.fromisoformat(args.end)
    except Exception:
        print("Start and end must be in ISO format: YYYY-MM-DDTHH:MM:SS")
        return

    send_meeting(
        subject=args.subject,
        recipients=args.recipients,
        start=args.start,
        end=args.end,
        location=args.location,
        body=args.body,
    )

if __name__ == "__main__":
    main()
