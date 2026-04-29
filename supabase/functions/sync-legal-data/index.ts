// Supabase Edge Function: sync-legal-data
// Deploy with: supabase functions deploy sync-legal-data

// @ts-ignore: Deno imports are not recognized by Vite's TS config
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// CORS headers for browser requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Statik/Mocklanmış Yasal Veri Kaynağı (Gerçekte bir API'den veya JSON dosyasından çekilecek)
    // Örn: https://api.qpass.com/legal-data/latest veya proxy sunucu.
    
    // Simüle edilen veri (2026 Varsayımı veya güncel rakamlar)
    const latestLegalData = {
      min_wage_gross: 24500.00,
      min_wage_net: 20825.00,
      sgk_floor: 24500.00,
      sgk_ceiling: 183750.00,
      stamp_tax_rate: 0.00759,
      disability_discount_1: 8500,
      disability_discount_2: 4400,
      disability_discount_3: 2100,
      tax_brackets: [
        { limit: 140000, rate: 15 },
        { limit: 280000, rate: 20 },
        { limit: 1050000, rate: 27 },
        { limit: 3500000, rate: 35 },
        { limit: 999999999, rate: 40 }
      ]
    };

    // İsteğe bağlı olarak yetki kontrolü yapılabilir (Authorization header'daki JWT çözülerek)
    // Şimdilik sadece veriyi dönüyoruz.

    return new Response(JSON.stringify(latestLegalData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
