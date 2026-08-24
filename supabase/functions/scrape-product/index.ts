import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Validate URL format and block suspicious patterns
function isValidProductUrl(urlString: string): { valid: boolean; error?: string } {
  try {
    const url = new URL(urlString);
    
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(url.protocol)) {
      return { valid: false, error: 'Invalid protocol' };
    }
    
    // Block localhost and private IPs
    const hostname = url.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.') ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal')
    ) {
      return { valid: false, error: 'Private network URLs not allowed' };
    }
    
    // Block common internal service patterns
    if (
      hostname.includes('supabase') ||
      hostname.includes('docker') ||
      hostname.includes('kubernetes') ||
      hostname.includes('k8s')
    ) {
      return { valid: false, error: 'Internal service URLs not allowed' };
    }
    
    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function cleanProductTitle(title: string, variantParts: string[]): string {
  let cleanTitle = normalizeText(title)
    .replace(/\s*[|•]\s*(buy|shop|online|price|sale).*$/i, '')
    .replace(/\s*-\s*(buy|shop|online|price|sale).*$/i, '')
    .replace(/\s*—\s*(buy|shop|online|price|sale).*$/i, '');

  for (const part of variantParts) {
    const variant = normalizeText(part);
    if (!variant) continue;
    cleanTitle = cleanTitle
      .replace(new RegExp(`\\s*(?:-|–|—|/)\\s*${escapeRegExp(variant)}\\s*$`, 'i'), '')
      .replace(new RegExp(`\\s*\\(\\s*${escapeRegExp(variant)}\\s*\\)\\s*$`, 'i'), '');
  }

  return cleanTitle || normalizeText(title) || 'Unknown Product';
}

function uniqueTextParts(parts: string[]): string[] {
  const seen = new Set<string>();
  return parts.filter((part) => {
    const normalized = normalizeText(part);
    const key = normalized.toLowerCase();
    if (!normalized || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the user is authenticated
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate URL length
    if (typeof url !== 'string' || url.length > 2048) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL too long' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      console.error('FIRECRAWL_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Scraping service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format URL
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    // Validate URL security
    const urlValidation = isValidProductUrl(formattedUrl);
    if (!urlValidation.valid) {
      return new Response(
        JSON.stringify({ success: false, error: urlValidation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Scraping product URL for user:', user.id, 'URL:', formattedUrl);

    // Use Firecrawl with extract format for product details
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: formattedUrl,
        formats: ['extract'],
        extract: {
          schema: {
            type: 'object',
            properties: {
              title: { type: 'string', description: 'Only the clean product item name. Do not include size, color, style, SKU, price, retailer, category, promotional text, or page title details.' },
              price: { type: 'number', description: 'The product price as a number' },
              currency: { type: 'string', description: 'The currency code (e.g., USD, ZAR)' },
              description: { type: 'string', description: 'A short product description' },
              image_url: { type: 'string', description: 'The main product image URL for the currently selected variant' },
              brand: { type: 'string', description: 'The brand name' },
              retailer: { type: 'string', description: 'The retailer or store name' },
              selected_color: { type: 'string', description: 'Only the selected color variant value if visible, with no labels or extra details' },
              selected_size: { type: 'string', description: 'Only the selected size variant value if visible, with no labels or extra details' },
              variant_name: { type: 'string', description: 'Only the selected style, material, pack size, scent, or other variant value if visible. Do not repeat the product name, price, retailer, SKU, or promotional details.' },
            },
            required: ['title'],
          },
        },
        onlyMainContent: true,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Firecrawl API error for user:', user.id);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to scrape product' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract product data from response
    const extractData = data.data?.extract || data.extract || {};
    const metadata = data.data?.metadata || data.metadata || {};

    // Try to get image from metadata if not in extract
    let imageUrl = extractData.image_url;
    if (!imageUrl && metadata.ogImage) {
      imageUrl = metadata.ogImage;
    }

    // Keep the product name clean and separate variant details for display.
    const variantParts = uniqueTextParts([
      extractData.selected_color,
      extractData.selected_size,
      extractData.variant_name,
    ].map(normalizeText));
    const cleanTitle = cleanProductTitle(extractData.title || metadata.title || 'Unknown Product', variantParts);

    const result = {
      success: true,
      product: {
        title: cleanTitle,
        price: extractData.price || null,
        currency: extractData.currency || 'ZAR',
        description: extractData.description || metadata.description || null,
        image_url: imageUrl || null,
        brand: extractData.brand || null,
        retailer: extractData.retailer || new URL(formattedUrl).hostname.replace('www.', ''),
        source_url: formattedUrl,
        selected_color: variantParts[0] && normalizeText(extractData.selected_color) ? normalizeText(extractData.selected_color) : null,
        selected_size: normalizeText(extractData.selected_size) || null,
        variant_name: normalizeText(extractData.variant_name) || null,
      },
    };

    console.log('Product extracted for user:', user.id, 'Title:', result.product.title);
    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error scraping product:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to process request' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
