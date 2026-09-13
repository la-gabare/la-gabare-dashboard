import { NextResponse } from 'next/server'

const ALLOWED_ORIGIN = 'https://la-gabare.fr'

export function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  }
}

export function withCors(response: NextResponse) {
  const headers = corsHeaders()
  Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value))
  return response
}

export function corsPreflight() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() })
}
