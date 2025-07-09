# Plan: Simplified CDN Asset Delivery

This plan outlines a streamlined CDN system. A GitHub Action automatically pushes the latest versions of assets to an R2 bucket. A Cloudflare Worker serves these assets, distinguishing between staging and production environments based on the URL path. This approach avoids using commit hashes and ensures the latest version is always served.

## 1. Architecture

-   **Source:** GitHub repository with asset files (e.g., JS, CSS).
-   **CI/CD:** A GitHub Action that triggers on pushes to `staging` and `main` branches.
-   **Storage:** An R2 bucket (`CDN_BUCKET`) to store the assets.
-   **Delivery:** A Cloudflare Worker that serves files from R2.

## 2. R2 Bucket Structure

We will use simple directory paths in the R2 bucket to separate environments. This ensures that we are always serving the latest version pushed to a branch.

-   **Staging:** Files from the `staging` branch are located in the `staging/` directory in R2.
-   **Production:** Files from the `main` branch are located in the `production/` directory in R2.

**Example R2 Object Keys:**
-   `staging/js/app.js`
-   `production/js/app.js`

## 3. GitHub Action Workflow (`.github/workflows/deploy_assets.yml`)

A single GitHub Action workflow will handle deployments to both environments.

-   **Trigger:** On push to `staging` or `main` branch.
-   **Steps:**
    1.  Check out the repository.
    2.  Determine the environment (`staging` or `production`) from the branch name.
    3.  Use a tool like `wrangler` or `rclone` to sync the repository's files to the corresponding directory (`staging/` or `production/`) in the R2 bucket.
    4.  Credentials (Cloudflare API Token, Account ID) will be stored as GitHub secrets.

## 4. Cloudflare Worker Logic (`src/index.js`)

The worker logic will be simple: map the request path to an R2 object key.

-   **Request URL format:** `/{environment}/path/to/file`
    -   Example staging: `/staging/js/app.js`
    -   Example production: `/production/js/app.js`

-   **`fetch` handler logic:**
    1.  Get the URL path from the request (e.g., `/staging/js/app.js`).
    2.  Remove the leading slash to get the R2 object key (e.g., `staging/js/app.js`).
    3.  Fetch the object from the `CDN_BUCKET` using this key.
    4.  If the object is found, serve it with the correct `Content-Type` header.
    5.  If the object is not found, return a 404 error.

## 5. Implementation Steps

1.  **Create GitHub Action:** Create the `.github/workflows/deploy_assets.yml` file.
2.  **Add Secrets to GitHub:** Add `CF_API_TOKEN` and `CF_ACCOUNT_ID` to the repository's secrets.
3.  **Update Worker:** Modify `src/index.js` to implement the serving logic described above.
4.  **Test:** Push changes to the `staging` and `main` branches to test the GitHub Action and verify that the files are served correctly from the staging and production URLs.
5.  **Deploy Worker:** Run `npm run deploy` to deploy the updated worker.
