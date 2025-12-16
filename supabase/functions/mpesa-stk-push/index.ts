import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LIPANA_SECRET_KEY = Deno.env.get('LIPANA_SECRET_KEY');
    if (!LIPANA_SECRET_KEY) {
      throw new Error('LIPANA_SECRET_KEY not configured');
    }

    const { phone, amount, userId, contributionType, description } = await req.json();

    if (!phone || !amount) {
      return new Response(
        JSON.stringify({ success: false, error: 'Phone and amount are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (amount < 10) {
      return new Response(
        JSON.stringify({ success: false, error: 'Minimum amount is KES 10' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let formattedPhone = phone.replace(/\s/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '+254' + formattedPhone.substring(1);
    } else if (formattedPhone.startsWith('254')) {
      formattedPhone = '+' + formattedPhone;
    } else if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+254' + formattedPhone;
    }

    console.log('Initiating STK push to:', formattedPhone, 'Amount:', amount);

    const lipanaResponse = await fetch('https://api.lipana.dev/v1/transactions/push-stk', {
      method: 'POST',
      headers: {
        'x-api-key': LIPANA_SECRET_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone: formattedPhone,
        amount: Number(amount),
      }),
    });

    const lipanaData = await lipanaResponse.json();
    console.log('Lipana response:', lipanaData);

    if (!lipanaResponse.ok) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: lipanaData.message || 'Failed to initiate payment' 
        }),
        { status: lipanaResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: txn, error: txnError } = await supabase
      .from('mpesa_transactions')
      .insert({
        user_id: userId || null,
        phone_number: formattedPhone,
        amount: Number(amount),
        transaction_type: contributionType || 'contribution',
        checkout_request_id: lipanaData.data?.checkoutRequestID,
        status: 'pending',
      })
      .select()
      .single();

    if (txnError) {
      console.error('Error recording transaction:', txnError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: lipanaData.data?.message || 'STK push sent to your phone',
        transactionId: lipanaData.data?.transactionId,
        checkoutRequestId: lipanaData.data?.checkoutRequestID,
        internalId: txn?.id,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: unknown) {
    const error = err as Error;
    console.error('Error in mpesa-stk-push:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
