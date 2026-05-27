/**
 * Unified PDF renderer for offer generation.
 *
 * Strategy:
 *  - On Vercel / serverless (process.env.VERCEL or AWS_LAMBDA_FUNCTION_NAME):
 *    use `@sparticuz/chromium` + `puppeteer-core` directly (no external HTTP).
 *  - Locally: try external PDF server (port 3015). If unreachable, fall back
 *    to `@sparticuz/chromium` too (works if a system Chrome is available).
 */

import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

const isServerless =
  !!process.env.VERCEL ||
  !!process.env.AWS_LAMBDA_FUNCTION_NAME ||
  !!process.env.LAMBDA_TASK_ROOT;

async function renderViaPuppeteer(html: string): Promise<Buffer> {
  const executablePath = await chromium.executablePath();

  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath,
    headless: chromium.headless,
  });

  try {
    const page = await browser.newPage();
    // Use 'load' (not 'networkidle0') — content is all inline (data URIs),
    // no external requests to wait for. networkidle0 + huge embedded base64
    // logo was hitting the 30s default timeout on Vercel.
    await page.setContent(html, { waitUntil: 'load', timeout: 50000 });
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
      timeout: 50000,
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

async function renderViaExternalServer(html: string): Promise<Buffer | null> {
  try {
    const serverUrl = process.env.PDF_SERVER_URL ?? 'http://localhost:3015';
    const res = await fetch(`${serverUrl}/api/generate-pdf-raw`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        html,
        pdfOptions: { margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' } },
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return null;
    const ab = await res.arrayBuffer();
    return Buffer.from(ab);
  } catch {
    return null;
  }
}

export async function renderOfferPdf(html: string): Promise<Buffer> {
  // In serverless (Vercel) — go straight to puppeteer-core + @sparticuz/chromium
  if (isServerless) {
    return renderViaPuppeteer(html);
  }
  // Locally — try external server first (faster, persistent process)
  const external = await renderViaExternalServer(html);
  if (external) return external;
  // Fallback to local puppeteer (requires system Chrome)
  return renderViaPuppeteer(html);
}
