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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the user is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user is admin
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!roleData || roleData.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Forbidden - Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, password } = await req.json();

    if (action === 'check') {
      // Check lockout status for this admin
      const { data: lockout } = await supabase
        .from('admin_lockouts')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (lockout?.locked_until && new Date(lockout.locked_until) > new Date()) {
        return new Response(
          JSON.stringify({ 
            isLocked: true, 
            lockedUntil: lockout.locked_until,
            failedAttempts: lockout.failed_attempts 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          isLocked: false, 
          failedAttempts: lockout?.failed_attempts || 0 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'verify') {
      if (!password) {
        return new Response(
          JSON.stringify({ error: 'Password required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if currently locked
      const { data: lockout } = await supabase
        .from('admin_lockouts')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (lockout?.locked_until && new Date(lockout.locked_until) > new Date()) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            isLocked: true,
            error: 'Account locked. Try again later.' 
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify password by attempting sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password,
      });

      if (signInError) {
        // Increment failed attempts using service role
        const newAttempts = (lockout?.failed_attempts || 0) + 1;
        const lockUntil = newAttempts >= 5 
          ? new Date(Date.now() + 30 * 60 * 1000).toISOString() 
          : null;

        await supabase
          .from('admin_lockouts')
          .upsert({
            user_id: user.id,
            failed_attempts: newAttempts,
            locked_until: lockUntil,
            updated_at: new Date().toISOString(),
          });

        // Log failed attempt
        await supabase.from('admin_access_logs').insert({
          user_id: user.id,
          user_email: user.email,
          action: 'reauth_failed',
          success: false,
          failure_reason: newAttempts >= 5 ? 'Account locked - too many attempts' : 'Invalid password',
          user_agent: req.headers.get('user-agent') || null,
        });

        return new Response(
          JSON.stringify({ 
            success: false, 
            isLocked: newAttempts >= 5,
            attemptsRemaining: Math.max(0, 5 - newAttempts),
            error: newAttempts >= 5 ? 'Account locked for 30 minutes' : 'Invalid password'
          }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Success - reset lockout using service role
      await supabase
        .from('admin_lockouts')
        .upsert({
          user_id: user.id,
          failed_attempts: 0,
          locked_until: null,
          updated_at: new Date().toISOString(),
        });

      // Log successful access
      await supabase.from('admin_access_logs').insert({
        user_id: user.id,
        user_email: user.email,
        action: 'reauth_success',
        success: true,
        user_agent: req.headers.get('user-agent') || null,
      });

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: unknown) {
    const error = err as Error;
    console.error('Admin lockout error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
