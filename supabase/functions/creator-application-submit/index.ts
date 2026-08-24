import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type ApplicationStatus = 'pending' | 'approved' | 'declined' | 'more_info_needed'

type Body = {
  firstName?: string
  lastName?: string
  email?: string
  whatsappNumber?: string
  instagramHandle?: string
  tiktokHandle?: string
  youtubeHandle?: string
  otherLink?: string
  primaryPlatform?: string
  followerRange?: string
  referralCode?: string
}

const validPlatforms = new Set(['Instagram', 'TikTok', 'YouTube', 'Other'])
const validFollowerRanges = new Set([
  'Under 1,000',
  '1,000 – 5,000',
  '5,000 – 10,000',
  '10,000 – 50,000',
  '50,000 – 250,000',
  '250,000+',
])

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function addDays(value: string, days: number) {
  const date = new Date(value)
  date.setDate(date.getDate() + days)
  return date
}

function clean(value?: string) {
  return typeof value === 'string' ? value.trim() : ''
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')

  if (!supabaseUrl || !serviceKey || !anonKey) {
    console.error('Missing required environment variables')
    return json({ error: 'Server configuration error' }, 500)
  }

  let body: Body
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  const firstName = clean(body.firstName)
  const lastName = clean(body.lastName)
  const email = clean(body.email).toLowerCase()
  const whatsappNumber = clean(body.whatsappNumber)
  const instagramHandle = clean(body.instagramHandle)
  const tiktokHandle = clean(body.tiktokHandle)
  const youtubeHandle = clean(body.youtubeHandle)
  const otherLink = clean(body.otherLink)
  const primaryPlatform = clean(body.primaryPlatform)
  const followerRange = clean(body.followerRange)
  const referralCode = clean(body.referralCode)

  if (!firstName || !lastName || !email || !email.includes('@')) {
    return json({ error: 'First name, last name, and a valid email are required.' }, 400)
  }
  if (!instagramHandle) return json({ error: 'Instagram is required.' }, 400)
  if (!validPlatforms.has(primaryPlatform)) return json({ error: 'Choose a valid primary platform.' }, 400)
  if (!validFollowerRanges.has(followerRange)) return json({ error: 'Choose a valid follower count range.' }, 400)
  if (otherLink) {
    try {
      new URL(otherLink)
    } catch {
      return json({ error: 'Other link must be a valid URL.' }, 400)
    }
  }

  const adminClient = createClient(supabaseUrl, serviceKey)
  let userId: string | null = null
  const authHeader = req.headers.get('Authorization')
  let referrerId: string | null = null

  if (authHeader?.startsWith('Bearer ')) {
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const token = authHeader.replace('Bearer ', '')
    const { data } = await authClient.auth.getUser(token)
    userId = data.user?.id ?? null
  }

  if (userId) {
    const { data: roleData } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'creator')
      .maybeSingle()

    if (roleData) return json({ status: 'already_creator' })
  }

  if (referralCode) {
    const { data: referrerData, error: referrerError } = await adminClient
      .rpc('resolve_creator_referrer', { p_ref: referralCode })
      .maybeSingle()

    if (referrerError) {
      console.error('Failed to resolve referral code', referrerError)
    } else if (referrerData?.id && referrerData.id !== userId) {
      referrerId = referrerData.id
    }
  }

  let query = adminClient
    .from('creator_applications')
    .select('id,status,submitted_at,reviewed_at')
    .eq('email', email)
    .order('submitted_at', { ascending: false })
    .limit(1)

  if (userId) {
    query = adminClient
      .from('creator_applications')
      .select('id,status,submitted_at,reviewed_at')
      .or(`user_id.eq.${userId},email.eq.${email}`)
      .order('submitted_at', { ascending: false })
      .limit(1)
  }

  const { data: existingRows, error: existingError } = await query
  if (existingError) {
    console.error('Failed to check existing application', existingError)
    return json({ error: 'Could not check existing applications.' }, 500)
  }

  const existing = existingRows?.[0] as { id: string; status: ApplicationStatus; submitted_at: string; reviewed_at: string | null } | undefined
  if (existing?.status === 'pending' || existing?.status === 'more_info_needed') {
    return json({ status: 'duplicate_pending', application: existing }, 409)
  }
  if (existing?.status === 'approved') {
    return json({ status: 'already_approved', application: existing }, 409)
  }
  if (existing?.status === 'declined') {
    const reapplyDate = addDays(existing.reviewed_at || existing.submitted_at, 30)
    if (reapplyDate > new Date()) {
      return json({ status: 'reapply_later', application: existing, reapplyDate: reapplyDate.toISOString() }, 409)
    }
  }

  const { data: inserted, error: insertError } = await adminClient
    .from('creator_applications')
    .insert({
      user_id: userId,
      first_name: firstName,
      last_name: lastName,
      email,
      whatsapp_number: whatsappNumber || null,
      instagram_handle: instagramHandle || null,
      tiktok_handle: tiktokHandle || null,
      youtube_handle: youtubeHandle || null,
      other_link: otherLink || null,
      primary_platform: primaryPlatform,
      follower_range: followerRange,
      status: 'pending',
    })
    .select('id')
    .single()

  if (insertError) {
    console.error('Failed to insert creator application', insertError)
    return json({ error: 'Could not submit your application.' }, 500)
  }

  if (referrerId) {
    const { error: referralError } = await adminClient
      .from('creator_referrals')
      .insert({
        referrer_id: referrerId,
        application_id: inserted.id,
        referred_user_id: userId,
        referred_email: email,
        referred_name: `${firstName} ${lastName}`.trim(),
        status: 'pending',
        submitted_at: new Date().toISOString(),
      })

    if (referralError) {
      console.error('Failed to record creator referral', referralError)
    }
  }

  try {
    const { error: emailError } = await adminClient.functions.invoke('send-transactional-email', {
      body: {
        templateName: 'creator-application-received',
        recipientEmail: email,
        idempotencyKey: `creator-application-${inserted.id}`,
        templateData: { firstName },
      },
    })
    if (emailError) {
      console.error('Confirmation email request failed', emailError)
    }
  } catch (error) {
    console.error('Confirmation email request crashed', error)
  }

  try {
    const { error: adminEmailError } = await adminClient.functions.invoke('send-transactional-email', {
      body: {
        templateName: 'creator-application-admin-notification',
        recipientEmail: 'roxi@mystorefront.io',
        idempotencyKey: `creator-application-admin-${inserted.id}`,
        templateData: {
          firstName,
          lastName,
          email,
          whatsappNumber,
          instagramHandle,
          tiktokHandle,
          youtubeHandle,
          otherLink,
          primaryPlatform,
          followerRange,
        },
      },
    })
    if (adminEmailError) {
      console.error('Admin notification email request failed', adminEmailError)
    }
  } catch (error) {
    console.error('Admin notification email request crashed', error)
  }


  return json({ status: 'submitted', id: inserted.id })
})
