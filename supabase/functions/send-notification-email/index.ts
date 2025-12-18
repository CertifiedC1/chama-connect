import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  type: 'payment_success' | 'loan_application';
  userId: string;
  amount?: number;
  reference?: string;
  loanId?: string;
  loanPurpose?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, userId, amount, reference, loanId, loanPurpose }: EmailRequest = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user email from auth
    const { data: authData, error: authError } = await supabase.auth.admin.getUserById(userId);
    
    if (authError || !authData?.user?.email) {
      console.error('User not found:', authError);
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userEmail = authData.user.email;
    const userName = authData.user.user_metadata?.full_name || 'Member';

    // Get chama settings for the email
    const { data: settings } = await supabase
      .from('chama_settings')
      .select('chama_name')
      .single();

    const chamaName = settings?.chama_name || 'Chama';

    let subject = '';
    let htmlContent = '';

    if (type === 'payment_success') {
      subject = `Payment Confirmation - ${chamaName}`;
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #16a34a; margin: 0; font-size: 28px;">✓ Payment Successful</h1>
            </div>
            
            <p style="color: #333; font-size: 16px; line-height: 1.6;">
              Dear ${userName},
            </p>
            
            <p style="color: #333; font-size: 16px; line-height: 1.6;">
              Your M-Pesa payment has been successfully received and recorded.
            </p>
            
            <div style="background-color: #f0fdf4; border: 1px solid #16a34a; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <table style="width: 100%;">
                <tr>
                  <td style="color: #666; padding: 8px 0;">Amount:</td>
                  <td style="color: #16a34a; font-weight: bold; text-align: right; font-size: 20px;">KES ${amount?.toLocaleString() || '0'}</td>
                </tr>
                ${reference ? `
                <tr>
                  <td style="color: #666; padding: 8px 0;">Reference:</td>
                  <td style="color: #333; text-align: right;">${reference}</td>
                </tr>
                ` : ''}
                <tr>
                  <td style="color: #666; padding: 8px 0;">Date:</td>
                  <td style="color: #333; text-align: right;">${new Date().toLocaleDateString('en-KE', { dateStyle: 'full' })}</td>
                </tr>
              </table>
            </div>
            
            <p style="color: #333; font-size: 16px; line-height: 1.6;">
              Thank you for your contribution to ${chamaName}.
            </p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <p style="color: #999; font-size: 12px; text-align: center;">
              This is an automated message from ${chamaName}. Please do not reply to this email.
            </p>
          </div>
        </body>
        </html>
      `;
    } else if (type === 'loan_application') {
      subject = `Loan Application Received - ${chamaName}`;
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2563eb; margin: 0; font-size: 28px;">📋 Loan Application Received</h1>
            </div>
            
            <p style="color: #333; font-size: 16px; line-height: 1.6;">
              Dear ${userName},
            </p>
            
            <p style="color: #333; font-size: 16px; line-height: 1.6;">
              Your loan application has been submitted successfully and is pending review.
            </p>
            
            <div style="background-color: #eff6ff; border: 1px solid #2563eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <table style="width: 100%;">
                <tr>
                  <td style="color: #666; padding: 8px 0;">Amount Requested:</td>
                  <td style="color: #2563eb; font-weight: bold; text-align: right; font-size: 20px;">KES ${amount?.toLocaleString() || '0'}</td>
                </tr>
                ${loanPurpose ? `
                <tr>
                  <td style="color: #666; padding: 8px 0;">Purpose:</td>
                  <td style="color: #333; text-align: right;">${loanPurpose}</td>
                </tr>
                ` : ''}
                <tr>
                  <td style="color: #666; padding: 8px 0;">Status:</td>
                  <td style="color: #f59e0b; font-weight: bold; text-align: right;">Pending Review</td>
                </tr>
                <tr>
                  <td style="color: #666; padding: 8px 0;">Submitted:</td>
                  <td style="color: #333; text-align: right;">${new Date().toLocaleDateString('en-KE', { dateStyle: 'full' })}</td>
                </tr>
              </table>
            </div>
            
            <p style="color: #333; font-size: 16px; line-height: 1.6;">
              Our team will review your application and get back to you shortly. You will receive another email once a decision has been made.
            </p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <p style="color: #999; font-size: 12px; text-align: center;">
              This is an automated message from ${chamaName}. Please do not reply to this email.
            </p>
          </div>
        </body>
        </html>
      `;
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid email type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${chamaName} <onboarding@resend.dev>`,
        to: [userEmail],
        subject: subject,
        html: htmlContent,
      }),
    });

    const emailData = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error("Resend error:", emailData);
      return new Response(
        JSON.stringify({ error: emailData.message || 'Failed to send email' }),
        { status: emailResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("Email sent successfully:", emailData);

    return new Response(
      JSON.stringify({ success: true, emailId: emailData.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error("Error sending email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
