import { NextRequest, NextResponse } from 'next/server'
import { sendContactMail } from '@/lib/smtp'
import { DatabaseService } from '@/lib/database'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { contactId, recipientEmail, recipientName, subject, message, images } = body

    // Validate required fields
    if (!contactId || !recipientEmail || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: contactId, recipientEmail, and message are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(recipientEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Build attachments from template images (cid inline)
    const attachments: any[] = []
    let htmlMessage = message as string

    const baseUrl = new URL(request.url).origin
    
    // Map to store image ID -> CID mapping for replacement
    const cidMap: Record<string, string> = {}

    if (Array.isArray(images) && images.length > 0) {
      console.log('🖼️ Processing', images.length, 'images for email')
      
      for (let idx = 0; idx < images.length; idx++) {
        const img = images[idx]
        if (!img?.id) {
          console.log('⚠️ Skipping image without ID at index', idx)
          continue
        }

        try {
          console.log('📥 Fetching image from DB:', img.id)
          const result = await DatabaseService.query(
            `SELECT blob_data, content_type, filename FROM template_images WHERE id = $1::uuid`,
            [img.id]
          )
          
          if (result && result[0]) {
            const cid = `image${idx + 1}@hiregenai.com`
            cidMap[img.id] = cid
            
            attachments.push({
              filename: result[0].filename || `image-${idx + 1}.jpg`,
              content: result[0].blob_data,
              contentType: result[0].content_type || 'image/jpeg',
              cid,
              contentDisposition: 'inline'
            })
            
            console.log('✅ Added attachment:', { filename: result[0].filename, cid, size: result[0].blob_data?.length })
          } else {
            console.log('⚠️ Image not found in DB:', img.id)
          }
        } catch (err) {
          console.error('⚠️ Failed to fetch image', img.id, err)
        }
      }
      
      // Now replace all image references in htmlMessage with CID
      for (const [imgId, cid] of Object.entries(cidMap)) {
        // Replace various URL patterns
        const patterns = [
          `/api/email-templates/image/${imgId}`,
          `${baseUrl}/api/email-templates/image/${imgId}`,
          `http://localhost:3000/api/email-templates/image/${imgId}`,
        ]
        
        for (const pattern of patterns) {
          if (htmlMessage.includes(pattern)) {
            console.log('🔄 Replacing URL pattern:', pattern, '-> cid:' + cid)
            htmlMessage = htmlMessage.split(pattern).join(`cid:${cid}`)
          }
        }
      }
      
      // Also replace any remaining img src with /api/email-templates/image/ pattern using regex
      htmlMessage = htmlMessage.replace(
        /src="[^"]*\/api\/email-templates\/image\/([a-f0-9-]+)"/gi,
        (match, imgId) => {
          const cid = cidMap[imgId]
          if (cid) {
            console.log('🔄 Regex replaced image ID:', imgId, '-> cid:' + cid)
            return `src="cid:${cid}"`
          }
          return match
        }
      )
    }

    // Create professional HTML email template
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; background-color: #f4f7fa; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f7fa; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; border-radius: 16px 16px 0 0; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">Hire<span style="color: #a7f3d0;">GenAI</span></h1>
                    <p style="color: #d1fae5; margin: 8px 0 0 0; font-size: 14px;">AI-Powered Recruitment Platform</p>
                  </td>
                </tr>
                
                <!-- Main Content -->
                <tr>
                  <td style="background: white; padding: 40px 30px; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
                    <!-- Greeting -->
                    <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">Hello ${recipientName || 'there'}! 👋</h2>
                    
                    <!-- Message Content -->
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 25px; margin: 25px 0;">
                      <div style="color: #374151; font-size: 15px; line-height: 1.8;">${htmlMessage}</div>
                    </div>
                    
                    <!-- CTA -->
                    <div style="text-align: center; margin: 35px 0;">
                      <p style="color: #6b7280; font-size: 14px; margin: 0 0 15px 0;">
                        Have more questions? Feel free to reply to this email.
                      </p>
                      <a href="https://hire-genai.com" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);">Visit HireGenAI</a>
                    </div>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background: #f9fafb; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #e5e7eb; border-top: none; text-align: center;">
                    <p style="color: #6b7280; font-size: 14px; margin: 0 0 15px 0;">
                      Need more help? Contact us at:
                    </p>
                    <p style="margin: 0 0 20px 0;">
                      <a href="mailto:support@hire-genai.com" style="color: #10b981; text-decoration: none; font-weight: 500;">support@hire-genai.com</a>
                    </p>
                    
                    <!-- Social Links -->
                    <div style="margin: 20px 0;">
                      <a href="https://www.linkedin.com/company/hire-genai" style="display: inline-block; margin: 0 8px;">
                        <img src="https://cdn-icons-png.flaticon.com/24/3536/3536505.png" alt="LinkedIn" style="width: 24px; height: 24px;">
                      </a>
                    </div>
                    
                    <p style="color: #9ca3af; font-size: 12px; margin: 20px 0 0 0;">
                      © ${new Date().getFullYear()} HireGenAI by SKYGENAI. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>`;

    const text = `
Hello ${recipientName || 'there'}!

${message}

Have more questions? Feel free to reply to this email.

---
Need more help? Contact us at: support@hire-genai.com

© ${new Date().getFullYear()} HireGenAI by SKYGENAI. All rights reserved.
    `;

    // Send email using contact mail transporter (support@hire-genai.com)
    console.log('📧 Sending reply email to:', recipientEmail)
    console.log('📎 Attachments count:', attachments.length)
    if (attachments.length > 0) {
      console.log('📎 Attachment details:', attachments.map(a => ({ filename: a.filename, cid: a.cid, contentType: a.contentType, size: a.content?.length })))
    }
    
    await sendContactMail({
      to: recipientEmail,
      subject: subject || 'Response from HireGenAI Support',
      html,
      text,
      from: process.env.EMAIL_FROM_CONTACT || 'HireGenAI Support <support@hire-genai.com>',
      attachments
    })

    console.log('✅ Reply email sent successfully to:', recipientEmail)

    // Update contact: mark replied and set status to active_prospect
    try {
      await DatabaseService.query(
        `UPDATE contact_messages 
         SET status = 'active_prospect', replied = true, updated_at = NOW() 
         WHERE id = CAST($1 AS UUID)`,
        [contactId]
      )
      console.log('✅ Contact marked replied & status set to active_prospect')
    } catch (dbError) {
      console.error('⚠️ Failed to update contact status:', dbError)
      // Don't fail the request if status update fails
    }

    return NextResponse.json({
      success: true,
      message: 'Reply sent successfully'
    })

  } catch (error) {
    console.error('❌ Error sending reply email:', error)
    return NextResponse.json(
      { error: 'Failed to send reply email' },
      { status: 500 }
    )
  }
}
