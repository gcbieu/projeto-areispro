import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// Configuração de CORS para permitir que seu site no GitHub Pages acesse a função
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // 1. Responde a requisições de "pré-venda" (OPTIONS) que o navegador faz por segurança
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const token = Deno.env.get('CONVERT_API_TOKEN')
    
    // 2. Verifica se o token existe antes de tentar a conversão
    if (!token) {
      throw new Error("Token da ConvertAPI não configurado no Supabase.")
    }

    const formData = await req.formData()

    // 3. Chamada para a ConvertAPI
    const response = await fetch(`https://v2.convertapi.com/convert/pdf/to/docx?Token=${token}`, {
      method: "POST",
      body: formData
    })

    const data = await response.json()
    
    // 4. Retorna o resultado com os headers de CORS
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    })
  }
})