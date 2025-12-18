import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-lipana-signature',
};

async function verifySignature(payload: string, signature: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload)
  );
  
  const hashArray = Array.from(new Uint8Array(signatureBuffer));
  const expectedSignature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return signature === expectedSignature;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LIPANA_WEBHOOK_SECRET = Deno.env.get('LIPANA_WEBHOOK_SECRET');
    if (!LIPANA_WEBHOOK_SECRET) {
      console.error('LIPANA_WEBHOOK_SECRET not configured');
      return new Response('Server configuration error', { status: 500 });
    }

    const rawBody = await req.text();
    const signature = req.headers.get('x-lipana-signature');

    if (!signature) {
      console.error('Missing webhook signature');
      return new Response('Unauthorized', { status: 401 });
    }

    const isValid = await verifySignature(rawBody, signature, LIPANA_WEBHOOK_SECRET);
    if (!isValid) {
      console.error('Invalid webhook signature');
      return new Response('Unauthorized', { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    console.log('Webhook payload:', payload);

    const { event, data: eventData } = payload;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (event === 'transaction.success' || event === 'payment.success') {
      const { transactionId, amount, phone, checkoutRequestID } = eventData;

      const { data: txn, error: findError } = await supabase
        .from('mpesa_transactions')
        .select('*')
        .eq('checkout_request_id', checkoutRequestID)
        .single();

      if (findError || !txn) {
        console.error('Transaction not found:', checkoutRequestID);
        return new Response(JSON.stringify({ received: true }), { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      await supabase
        .from('mpesa_transactions')
        .update({ 
          status: 'success', 
          mpesa_reference: transactionId,
          updated_at: new Date().toISOString()
        })
        .eq('id', txn.id);

      if (txn.transaction_type === 'contribution' && txn.user_id) {
        // Update existing contribution or create new one
        const { data: existingContrib } = await supabase
          .from('contributions')
          .select('id')
          .eq('user_id', txn.user_id)
          .eq('status', 'pending')
          .eq('amount', txn.amount)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        let contributionId = existingContrib?.id;

        if (existingContrib) {
          await supabase
            .from('contributions')
            .update({ status: 'completed', mpesa_reference: transactionId })
            .eq('id', existingContrib.id);
        } else {
          const { data: newContrib } = await supabase
            .from('contributions')
            .insert({
              user_id: txn.user_id,
              amount: txn.amount,
              contribution_type: 'monthly',
              payment_method: 'mpesa',
              mpesa_reference: transactionId,
              status: 'completed',
            })
            .select()
            .single();
          contributionId = newContrib?.id;
        }

        await supabase.from('notifications').insert({
          user_id: txn.user_id,
          title: 'Payment Successful',
          message: `Your contribution of KES ${txn.amount.toLocaleString()} has been received.`,
          type: 'contribution_success',
          related_id: contributionId,
          related_type: 'contribution',
        });

        // Send email notification
        try {
          await supabase.functions.invoke('send-notification-email', {
            body: {
              type: 'payment_success',
              userId: txn.user_id,
              amount: txn.amount,
              reference: transactionId,
            },
          });
        } catch (emailErr) {
          console.error('Failed to send email notification:', emailErr);
        }
      }

      if (txn.transaction_type === 'loan_repayment' && txn.user_id && txn.related_id) {
        await supabase.from('loan_repayments').insert({
          loan_id: txn.related_id,
          user_id: txn.user_id,
          amount: txn.amount,
          payment_method: 'mpesa',
          mpesa_reference: transactionId,
          status: 'completed',
        });

        await supabase.from('notifications').insert({
          user_id: txn.user_id,
          title: 'Loan Repayment Successful',
          message: `Your loan repayment of KES ${txn.amount.toLocaleString()} has been received.`,
          type: 'loan_repayment_success',
          related_id: txn.related_id,
          related_type: 'loan',
        });
      }

    } else if (event === 'transaction.failed' || event === 'payment.failed') {
      const { checkoutRequestID } = eventData;

      await supabase
        .from('mpesa_transactions')
        .update({ status: 'failed', updated_at: new Date().toISOString() })
        .eq('checkout_request_id', checkoutRequestID);

      const { data: txn } = await supabase
        .from('mpesa_transactions')
        .select('user_id, amount')
        .eq('checkout_request_id', checkoutRequestID)
        .single();

      if (txn?.user_id) {
        await supabase.from('notifications').insert({
          user_id: txn.user_id,
          title: 'Payment Failed',
          message: `Your payment of KES ${txn.amount?.toLocaleString()} failed. Please try again.`,
          type: 'payment_failed',
        });
      }
    }

    return new Response(JSON.stringify({ received: true }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (err: unknown) {
    const error = err as Error;
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
