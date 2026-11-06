# Gulfpro LinkedIn landing page: setup guide

This folder has everything for the LinkedIn ad landing page:

- `site/` is the website: the landing page with the lead form (`index.html`), the thank-you page (`thank-you.html`) and the leads admin (`admin.html`). It is ready for Vercel.
- `apps-script/Code.gs` is a small Google script that saves each submission to your Google Sheet and sends leads to the admin page.

Leads are stored in the Google Sheet **Gulfpro LinkedIn Leads** in your Google Drive, on the **Leads** tab:
https://docs.google.com/spreadsheets/d/1dlGoWCL4dr8Ok1LHPHLCRWF2O1b09FNOzdnlvfEuC1Q/edit

To preview the pages on your computer before setup, open `site/index.html` in your browser. Until step 1 is done the pages run in preview mode: the form works, but nothing is saved.

---

## Step 1: Connect the form to the Google Sheet (about 5 minutes)

1. Open the Google Sheet above. In the menu, choose **Extensions > Apps Script**.
2. Delete everything in the editor, paste the whole contents of `apps-script/Code.gs`, and click the **Save** icon.
3. In the toolbar, choose `checkSetup` from the function list and click **Run**.
   Google asks for permission: click **Review permissions**, choose your account, then **Allow**.
   If you see "Google hasn't verified this app", click **Advanced**, then **Go to ... (unsafe)**. This is your own script, so it is safe to continue.
   The log at the bottom should say **Ready**.
4. Click **Deploy > New deployment**. Click the gear icon next to "Select type" and choose **Web app**.
   - Description: `Lead form`
   - Execute as: **Me**
   - Who has access: **Anyone**
   Click **Deploy**, then copy the **Web app URL** (it ends in `/exec`).
   "Anyone" is needed because people coming from LinkedIn are not signed in to Google. The script only accepts form submissions, and it only returns leads to someone who gives the admin passcode.
5. Open `site/assets/config.js` in a text editor (TextEdit on Mac, Notepad on Windows) and paste the URL between the quotes on the `formEndpoint` line:

   ```js
   formEndpoint: 'https://script.google.com/macros/s/XXXXXXXX/exec',
   ```

   Save the file.

## Step 2: Put the site online with Vercel

Upload the **contents** of the `site` folder (not the folder itself). Pick one way:

**A. Without any coding tools (GitHub + Vercel)**
1. Sign in at github.com, click **New repository**, name it `gulfpro-landing` (Private is fine) and create it.
2. Click **uploading an existing file**, drag in everything inside the `site` folder, and click **Commit changes**.
3. Sign in at vercel.com, click **Add New > Project**, import `gulfpro-landing`, leave the settings as they are, and click **Deploy**.
4. Vercel gives you a link such as `gulfpro-landing.vercel.app`.

**B. With Terminal**
Open Terminal in the `site` folder and run `npx vercel --prod`, then follow the prompts.

**C. Through your developer**
Send them this folder; it is a plain static site with a `vercel.json`, so it can be added to your existing Vercel account as its own project.

**Your own domain (recommended for ads):** in the Vercel project, open **Settings > Domains**, add a subdomain such as `start.gulfproaccountants.com`, and add the DNS record Vercel shows you at your domain provider.

## Step 3: Test before the ads go live

1. Open the live page and submit a test lead. You should see the success message and then the thank-you page.
2. Check that a new row appeared on the **Leads** tab, and that the mobile number kept its `+` sign.
3. Open `/admin` on your site (for example `gulfpro-landing.vercel.app/admin`) and enter the admin passcode. You'll find it on the `ADMIN_PASSCODE` line near the top of `Code.gs`. Your test lead should be listed.
4. Delete the test row from the Sheet.

## The link to use in your LinkedIn ads

Add campaign tags to the page link, for example:

```
https://start.gulfproaccountants.com/?utm_source=linkedin&utm_campaign=bookkeeping&utm_content=ad1
```

The **Source**, **Campaign** and **Ad** columns then show which ad brought in each lead. Use a different `utm_content` for each ad to compare them.

---

## Using the admin

- **Admin page:** `/admin` on your site. It shows totals (all, today, last 7 days, new), search, filters by service, emirate and status, and **Export CSV**. It refreshes every two minutes while open.
- **Lead status:** change the **Status** column in the Google Sheet (New, Contacted, Qualified, Won, Lost). The admin page shows it after the next refresh. You can also type notes in the **Notes** column.
- **Team access:** share the Google Sheet with colleagues using the Sheet's **Share** button, or give them the admin passcode.
- **Keep the tab name "Leads"** and the column order as they are; the script relies on them.

## Changing settings

All page settings are in `site/assets/config.js`: the Calendly link, WhatsApp number, phone numbers, email, privacy policy link and LinkedIn tracking IDs. After editing, upload the file again (with GitHub, replace it in the repository; Vercel then republishes automatically).

**After any change to `Code.gs`** (for example a new passcode), publish it again: **Deploy > Manage deployments >** pencil icon **> Version: New version > Deploy**. The URL stays the same. Choosing **New deployment** instead creates a new URL, which you would then have to paste into `config.js` again.

## Optional: count leads as conversions in LinkedIn Campaign Manager

1. In Campaign Manager, open **Analyze > Insight Tag** and copy your **Partner ID**.
2. Create a conversion (type: Lead) using the **event-specific** method and copy its **conversion ID**.
3. Paste both into `linkedinPartnerId` and `linkedinConversionId` in `config.js`.

The thank-you page then records one conversion per submitted form. The tag is not loaded on the admin page.

## Privacy policy

The form says Gulfpro may contact the person about their enquiry. I couldn't find a privacy policy page on gulfproaccountants.com; when you have one, add its link to `privacyUrl` in `config.js` and it appears under the Submit button.

## If something goes wrong

| What you see | What to check |
|---|---|
| "We couldn't send your details just now" on the form | `formEndpoint` in `config.js` is the `/exec` URL from step 1, and the deployment's access is **Anyone**. |
| A yellow "Preview mode" bar on the live site | `formEndpoint` is still empty, or `config.js` wasn't uploaded again after editing. |
| Admin says the passcode is not correct | Copy it exactly from `Code.gs`. If you changed it, publish a new version (see "Changing settings"). |
| Leads aren't appearing in the Sheet | The tab must be named **Leads**. Open the Apps Script editor and check **Executions** for errors. |
