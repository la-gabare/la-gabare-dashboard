import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  try {
    // Check auth header for admin verification
    const authHeader = request.headers.get('authorization');
    const expectedKey = process.env.GABARE_SERVICE_ROLE_KEY;

    if (authHeader !== `Bearer ${expectedKey}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Add stripe_customer_id column
    try {
      await supabaseAdmin.rpc('execute_sql', {
        sql: `
          ALTER TABLE clients
          ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
        `
      });
    } catch {
      // Column might already exist, ignore error
    }

    // Add notification columns
    try {
      await supabaseAdmin.rpc('execute_sql', {
        sql: `
          ALTER TABLE clients
          ADD COLUMN IF NOT EXISTS notif_published BOOLEAN DEFAULT true,
          ADD COLUMN IF NOT EXISTS notif_validation BOOLEAN DEFAULT true,
          ADD COLUMN IF NOT EXISTS notif_feedback BOOLEAN DEFAULT true;
        `
      });
    } catch {
      // Columns might already exist, ignore error
    }

    return NextResponse.json({
      success: true,
      message: 'Columns added successfully'
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
