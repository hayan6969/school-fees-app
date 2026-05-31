# School Fees Management — Setup Guide

## 1. Supabase Setup

1. Go to [supabase.com](https://supabase.com) and create a new project
2. In the SQL Editor, paste and run the contents of `supabase/schema.sql`
3. Copy your **Project URL** and **anon key** from Settings → API

## 2. Environment Variables

Edit `.env.local` and fill in your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

## 3. Run the App

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## How It Works

### Fee Generation
- Go to **Fee Challans** → select month/year → click **Generate Fees**
- This creates one challan per active student based on their class fee
- Full-scholarship students get 100% waiver; half-scholarship get 50% off tuition

### Fee Status Logic
| Date | Status |
|------|--------|
| Before 8th | Unpaid |
| 8th–15th | Late Fee (Rs 200 by default) |
| After 15th | Arrears (carried to next month) |

> Late fee amount is configurable in **Settings**

### Marking Paid
- Open any challan → click **Mark as Paid** → enter cashier name → confirm
- Challan displays a watermark and payment details

### Printing
- Open a challan and click **Print Challan**
- Prints an A4 page with **2 copies**: School Copy + Student Copy

### Adding Students
- **Students** → **Add Student** → fill form
- Registration number is auto-generated (e.g. `STU-25-0001`)
- Assign scholarship: None / Half (50%) / Full (100%)

### Settings
- Add/edit class grades and their monthly fees
- Set the late fee amount
- Set school name, address, phone (shown on printed challans)

---

## Auto-Generation on 1st of Month (Optional)

To auto-generate fees on the 1st of each month, create a Supabase Edge Function
or use a Vercel cron job that calls the `/api/challans/generate` endpoint.

You can also call it manually from the Fee Challans page at any time —
it is idempotent and will skip students who already have a challan for that month.
