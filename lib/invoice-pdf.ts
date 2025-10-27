/**
 * Invoice PDF Generator
 * Generates professional Amazon-style invoices with company branding
 */

interface InvoiceData {
  invoiceNumber: string
  createdAt: string
  status: string
  subtotal: number
  taxRate: number | null
  taxAmount: number
  total: number
  description: string
  lineItems: any[]
  timePeriod?: {
    start: string
    end: string
  }
  companyName?: string
  companyAddress?: string
}

export const generateInvoicePDF = async (invoice: InvoiceData) => {
  // Create a new window for printing
  const printWindow = window.open('', '_blank')
  
  if (!printWindow) {
    throw new Error('Please allow popups to download invoice PDF')
  }

  const invoiceDate = new Date(invoice.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
  
  // Format time period if available
  let usagePeriod = ''
  if (invoice.timePeriod) {
    const startDate = new Date(invoice.timePeriod.start).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
    const endDate = new Date(invoice.timePeriod.end).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
    usagePeriod = `(${startDate} to ${endDate})`
  }

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice ${invoice.invoiceNumber}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      color: #111;
      line-height: 1.6;
      padding: 40px;
      background: #fff;
    }
    
    .invoice-container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      border: 1px solid #ddd;
      padding: 40px;
    }
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 30px;
      padding-bottom: 30px;
      border-bottom: 1px solid #ddd;
    }
    
    .company-info h1 {
      font-size: 36px;
      font-weight: 700;
      color: #10b981;
      margin-bottom: 4px;
    }
    
    .company-info p {
      color: #666;
      font-size: 13px;
      line-height: 1.4;
    }
    
    .invoice-details {
      text-align: right;
    }
    
    .invoice-details h2 {
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 12px;
      color: #111;
    }
    
    .invoice-details p {
      color: #111;
      font-size: 13px;
      margin: 6px 0;
    }
    
    .invoice-details p strong {
      font-weight: 600;
    }
    
    .status-badge {
      display: inline-block;
      padding: 6px 16px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      margin-top: 12px;
      letter-spacing: 0.5px;
    }
    
    .status-pending {
      background: #fbbf24;
      color: #111;
    }
    
    .status-paid {
      background: #10b981;
      color: white;
    }
    
    .billing-info {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin: 40px 0;
    }
    
    .info-section h3 {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      color: #666;
      margin-bottom: 12px;
      letter-spacing: 1px;
    }
    
    .info-section p {
      font-size: 13px;
      color: #111;
      margin: 3px 0;
      line-height: 1.6;
    }
    
    .info-section p strong {
      font-weight: 600;
    }
    
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin: 30px 0;
    }
    
    .items-table thead {
      background: white;
      border-bottom: 1px solid #ddd;
    }
    
    .items-table th {
      text-align: left;
      padding: 12px 8px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      color: #666;
      letter-spacing: 0.5px;
    }
    
    .items-table td {
      padding: 16px 8px;
      font-size: 13px;
      border-bottom: 1px solid #f3f4f6;
      vertical-align: top;
    }
    
    .items-table tbody tr:last-child td {
      border-bottom: none;
    }
    
    .items-table .description {
      color: #111;
    }
    
    .items-table .description strong {
      font-weight: 600;
      display: block;
      margin-bottom: 4px;
    }
    
    .items-table .description .period {
      color: #666;
      font-size: 12px;
    }
    
    .text-right {
      text-align: right;
    }
    
    .text-center {
      text-align: center;
    }
    
    .totals {
      margin-top: 30px;
      margin-left: auto;
      width: 280px;
      border-top: 1px solid #ddd;
      padding-top: 20px;
    }
    
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      font-size: 13px;
    }
    
    .total-row.subtotal {
      color: #111;
    }
    
    .total-row.tax {
      color: #111;
    }
    
    .total-row.grand-total {
      font-size: 16px;
      font-weight: 700;
      padding-top: 12px;
      border-top: 2px solid #111;
      margin-top: 8px;
    }
    
    .footer {
      margin-top: 60px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      color: #666;
      font-size: 12px;
    }
    
    .footer p {
      margin: 4px 0;
    }
    
    @media print {
      body {
        padding: 0;
      }
      
      .invoice-container {
        border: none;
        padding: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <!-- Header -->
    <div class="header">
      <div class="company-info">
        <h1>HireGenAI</h1>
        <p>AI-Powered Recruitment Platform</p>
        <p>support@hire-genai.com</p>
      </div>
      <div class="invoice-details">
        <h2>INVOICE</h2>
        <p><strong>Invoice #:</strong> ${invoice.invoiceNumber}</p>
        <p><strong>Date:</strong> ${invoiceDate}</p>
        <span class="status-badge status-${invoice.status}">${invoice.status}</span>
      </div>
    </div>
    
    <!-- Billing Information -->
    <div class="billing-info">
      <div class="info-section">
        <h3>From</h3>
        <p><strong>HireGenAI Inc.</strong></p>
        <p>123 AI Street, Tech Valley</p>
        <p>San Francisco, CA 94105</p>
        <p>United States</p>
      </div>
      <div class="info-section">
        <h3>Bill To</h3>
        <p><strong>${invoice.companyName || 'Your Company'}</strong></p>
        <p>${invoice.companyAddress || 'Company Address'}</p>
      </div>
    </div>
    
    <!-- Items Table -->
    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 60%;">DESCRIPTION</th>
          <th class="text-center" style="width: 20%;">QUANTITY</th>
          <th class="text-right" style="width: 20%;">AMOUNT</th>
        </tr>
      </thead>
      <tbody>
        ${invoice.lineItems && invoice.lineItems.length > 0 
          ? invoice.lineItems.map((item: any) => `
            <tr>
              <td class="description">
                <strong>${item.label || item.key}</strong>
                <span class="period">Usage charges ${usagePeriod}</span>
              </td>
              <td class="text-center">1</td>
              <td class="text-right">$${item.amount.toFixed(2)}</td>
            </tr>
          `).join('')
          : `
            <tr>
              <td class="description">
                <strong>Usage Charges</strong>
                <span class="period">${invoice.description} ${usagePeriod}</span>
              </td>
              <td class="text-center">1</td>
              <td class="text-right">$${invoice.subtotal.toFixed(2)}</td>
            </tr>
          `
        }
      </tbody>
    </table>
    
    <!-- Totals -->
    <div class="totals">
      <div class="total-row subtotal">
        <span>Subtotal:</span>
        <span>$${invoice.subtotal.toFixed(2)}</span>
      </div>
      ${invoice.taxRate ? `
        <div class="total-row tax">
          <span>Tax (${invoice.taxRate}%):</span>
          <span>$${invoice.taxAmount.toFixed(2)}</span>
        </div>
      ` : ''}
      <div class="total-row grand-total">
        <span>Total:</span>
        <span>$${invoice.total.toFixed(2)}</span>
      </div>
    </div>
    
    <!-- Footer -->
    <div class="footer">
      <p><strong>Thank you for your business!</strong></p>
      <p>For questions about this invoice, please contact support@hire-genai.com</p>
      <p style="margin-top: 20px; color: #999;">
        This is a computer-generated invoice. No signature is required.
      </p>
    </div>
  </div>
  
  <script>
    // Auto-print when page loads
    window.onload = function() {
      window.print();
      // Close window after printing (optional)
      // setTimeout(() => window.close(), 100);
    }
  </script>
</body>
</html>
  `

  printWindow.document.write(html)
  printWindow.document.close()
}
