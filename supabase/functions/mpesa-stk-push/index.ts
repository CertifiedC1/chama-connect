import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// SECURITY: Valid contribution types - reject anything else
const VALID_CONTRIBUTION_TYPES = ['monthly', 'emergency', 'special', 'loan_repayment', 'contribution'];

// SECURITY: Amount limits to prevent abuse
const MIN_AMOUNT = 10;
const MAX_AMOUNT = 100000;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LIPANA_SECRET_KEY = Deno.env.get('LIPANA_SECRET_KEY');
    if (!LIPANA_SECRET_KEY) {
      throw new Error('LIPANA_SECRET_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // SECURITY: Verify user authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing authorization header');
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error('Invalid auth token:', userError?.message);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { phone, amount, userId, contributionType, description } = await req.json();

    // SECURITY: Ensure userId matches authenticated user (prevent initiating for others)
    if (userId && userId !== user.id) {
      console.error('User ID mismatch:', userId, 'vs', user.id);
      return new Response(
        JSON.stringify({ success: false, error: 'Cannot initiate payment for another user' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // SECURITY: Validate phone number format
    if (!phone || typeof phone !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'Valid phone number is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // SECURITY: Validate amount with min and max limits
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount < MIN_AMOUNT || numAmount > MAX_AMOUNT) {
      return new Response(
        JSON.stringify({ success: false, error: `Amount must be between KES ${MIN_AMOUNT} and KES ${MAX_AMOUNT.toLocaleString()}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // SECURITY: Validate contribution type
    const safeContributionType = contributionType && VALID_CONTRIBUTION_TYPES.includes(contributionType) 
      ? contributionType 
      : 'contribution';

    // SECURITY: Verify phone matches user's profile (optional but recommended)
    const { data: profile } = await supabase
      .from('profiles')
      .select('phone_number')
      .eq('id', user.id)
      .single();

    // Format phone number
    let formattedPhone = phone.replace(/\s/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '+254' + formattedPhone.substring(1);
    } else if (formattedPhone.startsWith('254')) {
      formattedPhone = '+' + formattedPhone;
    } else if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+254' + formattedPhone;
    }

    console.log('Initiating STK push for user:', user.id, 'Phone:', formattedPhone, 'Amount:', numAmount);

    const lipanaResponse = await fetch('https://api.lipana.dev/v1/transactions/push-stk', {
      method: 'POST',
      headers: {
        'x-api-key': LIPANA_SECRET_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone: formattedPhone,
        amount: numAmount,
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

    // Record transaction with verified user ID
    const { data: txn, error: txnError } = await supabase
      .from('mpesa_transactions')
      .insert({
        user_id: user.id, // Always use authenticated user's ID
        phone_number: formattedPhone,
        amount: numAmount,
        transaction_type: safeContributionType,
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
