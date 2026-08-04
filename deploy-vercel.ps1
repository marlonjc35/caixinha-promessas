# PowerShell helper to deploy to Vercel using Vercel CLI
# Usage: open PowerShell in repo root and run: ./deploy-vercel.ps1
# Prerequisites: node and npm installed, and the `vercel` CLI available (npm i -g vercel) OR use npx

param(
    [switch]$prod
)

if ($prod) {
    Write-Host "Deploying to production (vercel --prod)"
    npx vercel --prod --confirm
} else {
    Write-Host "Deploy preview (vercel)"
    npx vercel --confirm
}

Write-Host "If you use a VERCEL_TOKEN, you can run: npx vercel --token $env:VERCEL_TOKEN --prod --confirm"
