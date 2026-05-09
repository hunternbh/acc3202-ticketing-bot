# ACC3202 Ticketing Bot: Instructor Command Sheet

Before starting the exercise:

- Event 1 has tickets priced at **$0**.
- There are then **4 additional events**, each with tickets priced at **$1**.
- If needed, change the list of users directly in `index.js`.
- The app may include a cron job that refreshes or pings the Render server every 5 minutes because the free Render server can sleep when inactive.

Replace `<filler>` with the actual Render app name used during deployment.

For example, if your Render URL is:

```text
https://my-ticketing-app.onrender.com
```

then replace:

```text
https://<filler>.onrender.com
```

with:

```text
https://my-ticketing-app.onrender.com
```

---

## 1. Reseed the Database

This resets and repopulates the database with the starting users, events, ticket types, and balances.

```powershell
curl.exe -X POST "https://ticketing-exercise.onrender.com/api/admin/seed-database" `
  -H "x-seed-secret: secret"
```

---

## 2. Login as Admin

This logs in as the admin user and saves the admin token.

```powershell
$response = Invoke-RestMethod `
  -Uri "https://<filler>.onrender.com/api/login" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"email":"admin@hunter-ticket.com","password":"adminpass"}'

$token = $response.token
```

---

## 3. Admin: Release More Tickets

This releases additional tickets for a selected ticket type.

In the example below:

- `ticketTypeId` is `5`
- `additionalQuantity` is `10`

```powershell
Invoke-RestMethod `
  -Uri "https://<filler>.onrender.com/api/admin/release-more" `
  -Method POST `
  -ContentType "application/json" `
  -Headers @{ Authorization = "Bearer $token" } `
  -Body '{"ticketTypeId":5,"additionalQuantity":10}'
```

---

## 4. Admin: Check Holdings

This shows what each user owns, their wallet balance, and how much they spent.

```powershell
Invoke-RestMethod `
  -Uri "https://<filler>.onrender.com/api/admin/holdings" `
  -Method GET `
  -Headers @{ Authorization = "Bearer $token" } |
Format-Table email, wallet_balance, event_title, ticket_type, quantity_owned, amount_spent -AutoSize
```

---

## 5. Public: Check Tickets for an Event

This checks the ticket status for a public event page.

In the example below, the event ID is `2`.

```powershell
Invoke-RestMethod `
  -Uri "https://<filler>.onrender.com/api/events/2/tickets" `
  -Method GET |
Select-Object -ExpandProperty tickets |
Format-List *
```

---

# Student Bot Program

This program logs in as a student, repeatedly checks whether a ticket is available, and buys one ticket once available.

---

## 1. Login as a Student User

```powershell
$response = Invoke-RestMethod `
  -Uri "https://<filler>.onrender.com/api/login" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"email":"test@test.com","password":"test"}'

$token = $response.token
```

---

## 2. Choose an Event

Change the event ID if needed.

```powershell
$eventId = 5
```

---

## 3. Run the Bot Loop

The bot checks every 500 milliseconds until a ticket is available.

```powershell
while ($true) {
  $ticketInfo = Invoke-RestMethod `
    -Uri "https://<filler>.onrender.com/api/events/$eventId/tickets" `
    -Method GET

  $availableTicket = $ticketInfo.tickets |
    Where-Object { $_.isReleased -eq $true -and $_.availableQuantity -gt 0 } |
    Select-Object -First 1

  if ($availableTicket) {
    Write-Host "Ticket found!"
    Write-Host "Ticket Type ID:" $availableTicket.id
    Write-Host "Price:" $availableTicket.price

    $body = @{
      eventId = $eventId
      items = @(
        @{
          ticketTypeId = $availableTicket.id
          quantity = 1
        }
      )
    } | ConvertTo-Json -Depth 5

    $purchase = Invoke-RestMethod `
      -Uri "https://<filler>.onrender.com/api/purchase" `
      -Method POST `
      -ContentType "application/json" `
      -Headers @{ Authorization = "Bearer $token" } `
      -Body $body

    Write-Host "Purchase complete!"
    $purchase
    break
  }

  Write-Host "No ticket yet. Checking again..."
  Start-Sleep -Milliseconds 500
}
```

---

# Full Student Bot Script

Use this if you want the full student bot in one block.

```powershell
# Login as a student user
$response = Invoke-RestMethod `
  -Uri "https://<filler>.onrender.com/api/login" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"email":"test@test.com","password":"test"}'

$token = $response.token

# Choose event
$eventId = 5

# Bot loop: keep checking until ticket is available
while ($true) {
  $ticketInfo = Invoke-RestMethod `
    -Uri "https://<filler>.onrender.com/api/events/$eventId/tickets" `
    -Method GET

  $availableTicket = $ticketInfo.tickets |
    Where-Object { $_.isReleased -eq $true -and $_.availableQuantity -gt 0 } |
    Select-Object -First 1

  if ($availableTicket) {
    Write-Host "Ticket found!"
    Write-Host "Ticket Type ID:" $availableTicket.id
    Write-Host "Price:" $availableTicket.price

    $body = @{
      eventId = $eventId
      items = @(
        @{
          ticketTypeId = $availableTicket.id
          quantity = 1
        }
      )
    } | ConvertTo-Json -Depth 5

    $purchase = Invoke-RestMethod `
      -Uri "https://<filler>.onrender.com/api/purchase" `
      -Method POST `
      -ContentType "application/json" `
      -Headers @{ Authorization = "Bearer $token" } `
      -Body $body

    Write-Host "Purchase complete!"
    $purchase
    break
  }

  Write-Host "No ticket yet. Checking again..."
  Start-Sleep -Milliseconds 500
}
```

---

# Notes

- Replace `<filler>` with the actual Render app name.
- Replace the seed secret if your deployed app uses a different `SEED_SECRET`.
- Replace the student login credentials if you changed the user list in `index.js`.
- Replace `$eventId = 5` if students should target a different event.
- Replace `ticketTypeId = 5` if the instructor wants to release a different ticket type.