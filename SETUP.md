# MH BEATS — setup guide (about 15 minutes, one time)

After this, you upload beats and artwork from **yourwebsite.com/admin.html**. No more GitHub for beats.

## What's in this folder
| File | What it is |
|---|---|
| `index.html` | the website (3D, cinematic) |
| `admin.html` | your private upload dashboard |
| `config.js` | the one file you edit (step 5) |
| `supabase-setup.sql` | database setup (step 3) |
| `beats-seed.js` + `assets/` | your current 10 beats, logo, styles, 3D engine |

The site works **right away** with your current beats, even before you do the steps below. The steps only switch on the admin.

---

## 1. Put the files on GitHub
1. Open your website repository on github.com → **Add file → Upload files**.
2. Unzip this folder first, then drag **everything inside it** (not the zip) into the page. Keep the `assets` folder as a folder.
3. Click **Commit changes**. Wait about a minute, then open your site. You should see the new 3D version.

## 2. Create a free Supabase project (this stores your beats + files)
1. Go to **supabase.com** → sign up → **New project**.
2. Name it `mhbeats`, make up a database password (save it), pick the region closest to you → **Create**. Wait about 2 minutes.

## 3. Run the database setup
1. Open `supabase-setup.sql` in any text editor.
2. On the line `YOUR_ADMIN_EMAIL_HERE`, type the email you'll log into the admin with. Save.
3. In Supabase: **SQL Editor → New query**, paste the whole file, click **Run**. It should say *Success*.

## 4. Create your admin login
1. Supabase → **Authentication → Users → Add user → Create new user**.
2. Use the **same email** as in step 3, choose a strong password, tick **Auto Confirm User** → Create.
3. Recommended: **Authentication → Sign In / Providers** (or Settings) → turn **off "Allow new users to sign up"**.

## 5. Connect the website to it
1. Supabase → **Project Settings → API** (or **API Keys**). Copy the **Project URL** and the **anon public** key (the publishable key works too).
2. On GitHub open `config.js` → pencil icon → paste them between the quotes:
   ```js
   SUPABASE_URL: "https://abcdxyz.supabase.co",
   SUPABASE_ANON_KEY: "eyJhbGciOi...",
   ```
3. **Commit changes**. These two values are safe to be public; only your login can edit anything.

## 6. Use it
1. Open `yoursite.com/admin.html` and log in.
2. First time only: click **Import my 10 current beats** so they show up in the admin.
3. **＋ Upload new beat** → drop artwork + audio → set title, BPM, key, prices → **Save**. It is live on the site instantly.
4. Drag beats by the ⋮⋮ handle to reorder. **Hide** removes a beat from the site without deleting it. **Exclusive sold** hides the exclusive option.
5. **Settings** changes your PayPal email, contact email, homepage line and default prices.

---

## Good to know
- **Previews are public.** Upload a tagged/preview MP3 (max 50 MB), never the final master. Send buyers their files by email after PayPal, like now.
- Artwork is resized automatically. Any shape works (the 3D cover adapts), 2:3 posters and square covers both look good.
- Free Supabase gives 1 GB of storage, plenty for hundreds of MP3 previews.
- A free Supabase project pauses after a week with zero visits. Real site traffic keeps it awake; if it ever pauses, press **Restore** in the Supabase dashboard. Meanwhile the site shows the built-in beats.
- To preview locally you need a web server; double-clicking `index.html` can't load 3D textures. Easiest is to just commit to GitHub.

## If something's off
| Problem | Fix |
|---|---|
| Admin says "site isn't connected" | `config.js` is still empty (step 5). |
| "database tables don't exist yet" | Run `supabase-setup.sql` (step 3). |
| "not allowed to edit" | The email in the SQL must match your login email exactly. Fix it and run the SQL again. |
| Uploaded beat doesn't show | Check it isn't **Hidden**, then hard-refresh (Ctrl+Shift+R). |
| Audio won't upload | Over 50 MB. Export an MP3 preview. |
| Site shows old beats only | `config.js` URL/key typo. The site falls back to built-in beats when it can't reach the database. |

The 3D scene uses WebGL. If a visitor's device can't run it, the site falls back to a normal layout automatically.
