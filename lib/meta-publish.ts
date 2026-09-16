import 'server-only'

// Instagram Business accounts connected via direct Instagram Login are
// published to through graph.instagram.com; Facebook Pages still use
// graph.facebook.com.
const IG_GRAPH = 'https://graph.instagram.com/v21.0'
const FB_GRAPH = 'https://graph.facebook.com/v21.0'

type SocialAccount = {
  instagram_business_account_id: string | null
  facebook_page_id: string | null
  access_token: string
}

type Post = {
  id: number
  format?: string | null
  media_url?: string | null
  media_urls?: string[] | null
  contenu?: string | null
}

async function graphPost(base: string, path: string, body: Record<string, unknown>) {
  const res = await fetch(`${base}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok || data.error) {
    throw new Error(data.error?.message || `Graph API error on ${path}`)
  }
  return data
}

// With direct Instagram Login, the authenticated account is addressed as
// "me" on graph.instagram.com — the numeric instagram_business_account_id
// we store is for our own reference/lookups, not a valid path segment here.
async function publishInstagramPhoto(account: SocialAccount, post: Post) {
  const created = await graphPost(IG_GRAPH, `me/media`, {
    image_url: post.media_url,
    caption: post.contenu || '',
    access_token: account.access_token,
  })
  await graphPost(IG_GRAPH, `me/media_publish`, {
    creation_id: created.id,
    access_token: account.access_token,
  })
}

async function publishInstagramStory(account: SocialAccount, post: Post) {
  const created = await graphPost(IG_GRAPH, `me/media`, {
    image_url: post.media_url,
    media_type: 'STORIES',
    access_token: account.access_token,
  })
  await graphPost(IG_GRAPH, `me/media_publish`, {
    creation_id: created.id,
    access_token: account.access_token,
  })
}

async function publishInstagramCarousel(account: SocialAccount, post: Post) {
  const urls = post.media_urls || []
  if (urls.length < 2) {
    throw new Error('Un carrousel nécessite au moins 2 images (media_urls)')
  }
  const itemIds: string[] = []
  for (const url of urls) {
    const item = await graphPost(IG_GRAPH, `me/media`, {
      image_url: url,
      is_carousel_item: true,
      access_token: account.access_token,
    })
    itemIds.push(item.id)
  }
  const parent = await graphPost(IG_GRAPH, `me/media`, {
    media_type: 'CAROUSEL',
    children: itemIds.join(','),
    caption: post.contenu || '',
    access_token: account.access_token,
  })
  await graphPost(IG_GRAPH, `me/media_publish`, {
    creation_id: parent.id,
    access_token: account.access_token,
  })
}

// Reels are transcoded asynchronously by Meta. We poll briefly; if it isn't
// ready in time we surface a clear "still processing" error rather than
// timing out the request silently.
async function publishInstagramReel(account: SocialAccount, post: Post) {
  const created = await graphPost(IG_GRAPH, `me/media`, {
    video_url: post.media_url,
    caption: post.contenu || '',
    media_type: 'REELS',
    share_to_feed: true,
    access_token: account.access_token,
  })

  const maxAttempts = 5
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((r) => setTimeout(r, 2500))
    const statusRes = await fetch(
      `${IG_GRAPH}/${created.id}?fields=status_code&access_token=${account.access_token}`
    )
    const statusData = await statusRes.json()
    if (statusData.status_code === 'FINISHED') {
      await graphPost(IG_GRAPH, `me/media_publish`, {
        creation_id: created.id,
        access_token: account.access_token,
      })
      return
    }
    if (statusData.status_code === 'ERROR') {
      throw new Error('Le traitement de la vidéo a échoué côté Instagram')
    }
  }
  throw new Error('PROCESSING')
}

async function publishFacebookPhoto(account: SocialAccount, post: Post) {
  if (!account.facebook_page_id) return
  await graphPost(FB_GRAPH, `${account.facebook_page_id}/photos`, {
    url: post.media_url,
    caption: post.contenu || '',
    access_token: account.access_token,
  })
}

async function publishFacebookVideo(account: SocialAccount, post: Post) {
  if (!account.facebook_page_id) return
  await graphPost(FB_GRAPH, `${account.facebook_page_id}/videos`, {
    file_url: post.media_url,
    description: post.contenu || '',
    access_token: account.access_token,
  })
}

export async function publishPostToMeta(account: SocialAccount, post: Post) {
  const format = post.format || 'photo'

  if (account.instagram_business_account_id) {
    if (format === 'story') await publishInstagramStory(account, post)
    else if (format === 'video') await publishInstagramReel(account, post)
    else if (format === 'carrousel') await publishInstagramCarousel(account, post)
    else await publishInstagramPhoto(account, post)
  }

  // Facebook Page publishing runs for photo/carousel-cover and video formats,
  // independent of Instagram (skipped silently if no page is connected).
  if (format === 'video') await publishFacebookVideo(account, post)
  else await publishFacebookPhoto(account, post)
}
