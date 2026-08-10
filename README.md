# Important Disclaimer

This case must be completed only within the sandboxed classroom website provided by the instructor. Students must not use automation techniques on real ticketing websites, commercial platforms, or any system that they do not own or do not have explicit written permission to test.

Unauthorized automation, circumvention of access controls, credential misuse, scraping, or interference with commercial systems may violate website terms of service and applicable civil or criminal laws, including the Computer Fraud and Abuse Act and, in the ticketing context, the BOTS Act.

The purpose of this case is to help students understand IT audit risk, internal controls, transaction processing, and audit evidence in a controlled educational environment. It is not intended to teach or encourage unauthorized automation, ticket scalping, or any activity involving real commercial systems.

---

# ACC3202 Ticketing Bot: Instructor Command Sheet

## Instructional Videos

- [Instructor setup video](https://youtu.be/wHpjUpBzZMc)
- [Class briefing video](https://youtu.be/hIh2D8scudc)

## Student Materials

- [SeatGate Student Case Deck](materials/SeatGate_Student_Case_Deck_Expanded.pptx)
- [SeatGate Student Worksheet](materials/SeatGate_Student_Worksheet_Updated.docx)
- [Browse all repository materials](https://github.com/hunternbh/acc3202-ticketing-bot/tree/main/materials)

---

# Ticketing Bot Exercise Setup Guide

This guide explains how to set up the ticketing bot exercise for an AIS course.

---

## 1. Create or Use a GitHub Account

Go to:

```text
https://github.com
```

Create an account if you do not already have one.

---

## 2. Fork the Repository

Go to:

```text
https://github.com/hunternbh/acc3202-ticketing-bot
```

Fork the repository to your own GitHub account.

Give the repository a name you can remember. You will use this name later when changing parts of the code.

---

## 3. Set Up Render

Go to:

```text
https://render.com
```

Create an account if needed.

Render will be used for the server-side setup.

---

## 4. Create a PostgreSQL Database

In Render, create a new PostgreSQL database.

Use any name you like and select the **Free** plan.

The free tier may wind down after a month, but the database can be recreated later.

This database stores the ticket-buying activity.

---

## 5. Create a Web Service

While the database initializes, create a new **Web Service** in Render.

Connect the Web Service to your forked GitHub repository.

Use any name you like.

---

## 6. Configure the Web Service

Set the following values:

```text
Root Directory: server
Build Command: npm run build
Start Command: npm start
```

---

## 7. Set Environment Variables

In Render, set the backend environment variables.

These values are hidden from the frontend.

### DATABASE_URL

Copy the **Internal Database URL** from the Render PostgreSQL database.

Set it as:

```text
DATABASE_URL
```

### SEED_SECRET

Set a `SEED_SECRET`.

Remember this value. You will use it later to reset the database.

---

## 8. Update the GitHub Pages Base Path

In GitHub, open:

```text
vite.config.ts
```

Change the `base` value to your repository name.

For example, if your repository is named:

```text
acc3202-ticketing-bot
```

use:

```ts
base: "/acc3202-ticketing-bot/"
```

---

## 9. Create Student Accounts

In GitHub, open:

```text
server/users.js
```

Create student accounts.

You can use AI to quickly generate and paste the account list.

Do not use real student names because GitHub repositories may be publicly available for free-tier users.

Keep:

```text
One test account with a high balance
One admin account
```

---

## 10. Deploy with GitHub Pages

In GitHub, go to:

```text
Settings > Pages
```

Change the source to:

```text
GitHub Actions
```

Then trigger the deploy workflow.

Once the build finishes, your website will be live.

---

## 11. Issue Commands

Use the commands from the guiding text file or from your GitHub repository's README.

If you have restricted access to command-line terminals, you can use:

```text
https://reqbin.com/curl
```

---

## 12. Seed the Database

Seed the database first.

Seeding automatically resets all previously bought tickets and releases 999 tickets for the trial event.

You will need your:

```text
Backend URL
SEED_SECRET
```

---

## 13. Log In as Admin

Log in as the admin account to get your token.

Then use the admin token to issue tickets for events.

---

## 14. Show Students the API Purchase Process

To show students how ticket buying works through the API:

1. Open the website.
2. Open Inspect Tools.
3. Go to the **Network** tab.
4. Log in as a user.
5. Observe the login request.
6. Make a ticket purchase.
7. Observe the purchase request.

When students log in, the server generates a token for the user.

When the browser confirms a purchase, it sends a `POST` request with the user's token.

A bot can repeat this API call.

Students can use AI to write Python code that repeats the request in this sandboxed system.

After this demonstration, proceed to analyzing the internal controls with students.

---

# Ticketing Exercise Commands for ReqBin cURL

Use this site:

```text
https://reqbin.com/curl
```

These commands are written as **one-line cURL commands** for ReqBin.

If ReqBin says too many commands have been issued, open an incognito tab and try again.

---

## Backend URL

```text
https://acc3202-ticketing-bot.onrender.com
```

---

## Default Values

```text
SEED_SECRET: hunter-seed-2026-private
Admin email: admin@seatgate-ticket.com
Admin password: adminpass
```

---

## Before Starting

- Event 1 has tickets priced at **$0**.
- Events 2–5 have tickets priced at **$1 each**.
- Change the user list in `server/users.js` before reseeding.
- The GitHub cron job pings the Render app every 5 minutes because the free Render server may sleep.
- These commands are written for **ReqBin cURL**, not Windows CMD and not PowerShell.
- Paste each command into ReqBin’s cURL command box.

---

## 1. Reseed Database

This clears and reseeds the database using the user list currently defined in `index.js`.

```bash
curl -X POST "https://acc3202-ticketing-bot.onrender.com/api/admin/seed-database" -H "x-seed-secret: hunter-seed-2026-private"
```

---

## 2. Login as Admin

```bash
curl -X POST "https://acc3202-ticketing-bot.onrender.com/api/login" -H "Content-Type: application/json" -d '{"email":"admin@seatgate-ticket.com","password":"adminpass"}'
```

The command should return something like this:

```json
{
  "token": "eyJhbGciOi..."
}
```

Copy the token value only, without the quotation marks.

You will need to paste that token into the commands below where it says:

```text
PASTE_TOKEN_HERE
```

---

## 3. Release More Tickets

This releases 10 more tickets for `ticketTypeId = 5`.

```bash
curl -X POST "https://acc3202-ticketing-bot.onrender.com/api/admin/release-more" -H "Content-Type: application/json" -H "Authorization: Bearer PASTE_TOKEN_HERE" -d '{"ticketTypeId":5,"additionalQuantity":10}'
```

To release a different number of tickets, change `additionalQuantity`.

Example: release 25 more tickets.

```bash
curl -X POST "https://acc3202-ticketing-bot.onrender.com/api/admin/release-more" -H "Content-Type: application/json" -H "Authorization: Bearer PASTE_TOKEN_HERE" -d '{"ticketTypeId":5,"additionalQuantity":25}'
```

---

## 4. Check Holdings

This shows student holdings, wallet balances, ticket ownership, and amount spent.

```bash
curl -X GET "https://acc3202-ticketing-bot.onrender.com/api/admin/holdings" -H "Authorization: Bearer PASTE_TOKEN_HERE"
```

---

## 5. Important Notes

- These are **ReqBin cURL** commands.
- Do not use CMD variables such as `%BASE_URL%`.
- Do not use PowerShell variables such as `$token`.
- After logging in, copy the token and replace:

```text
PASTE_TOKEN_HERE
```

with the actual token.

- If login fails, check whether the admin email in `index.js` is:

```text
admin@seatgate-ticket.com
```

Use the email that appears in your seed data.
