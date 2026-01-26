export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const token = process.env.META_ACCESS_TOKEN;
  const accountId = process.env.META_AD_ACCOUNT_ID;
  
  if (!token || !accountId) {
    return res.status(500).json({ 
      error: 'Configuración incompleta',
      message: 'META_ACCESS_TOKEN y META_AD_ACCOUNT_ID deben estar configurados'
    });
  }

  try {
    const cleanAccountId = accountId.replace(/^act_/i, '');
    
    // Usar 5 años atrás para asegurar que capture todas las campañas
    const today = new Date();
    const fiveYearsAgo = new Date(today);
    fiveYearsAgo.setFullYear(today.getFullYear() - 3);
    
    const timeRange = JSON.stringify({
      since: fiveYearsAgo.toISOString().split('T')[0],
      until: today.toISOString().split('T')[0]
    });
    
    console.log('📅 Time range:', timeRange);
    
    // ✅ Primera llamada: Intentar con insights (aumentado a 500)
    const insightsUrl = `https://graph.facebook.com/v21.0/act_${cleanAccountId}/insights?fields=reach,impressions,cpc,spend,clicks,ctr,ad_id,ad_name,date_start,date_stop&level=ad&time_range=${encodeURIComponent(timeRange)}&access_token=${token}&limit=500`;
    
    console.log('🔄 Fetching insights...');
    const insightsResponse = await fetch(insightsUrl);
    const insightsData = await insightsResponse.json();
    
    if (!insightsResponse.ok) {
      console.error('❌ Insights error:', insightsData);
      return res.status(insightsResponse.status).json({
        error: insightsData.error?.message || 'Error al obtener insights',
        details: insightsData.error
      });
    }
    
    console.log(`📊 Insights encontrados: ${insightsData.data?.length || 0}`);
    
    // ✅ Segunda llamada: SIEMPRE obtener lista completa de ads (sin importar si hay insights)
    const adsUrl = `https://graph.facebook.com/v21.0/act_${cleanAccountId}/ads?fields=id,name,status,effective_status,created_time,updated_time&limit=500&access_token=${token}`;
    
    console.log('🔄 Fetching all ads (including paused/inactive)...');
    const adsResponse = await fetch(adsUrl);
    const adsData = await adsResponse.json();
    
    if (!adsResponse.ok) {
      console.error('❌ Ads error:', adsData);
      return res.status(adsResponse.status).json({
        error: adsData.error?.message || 'Error al obtener ads',
        details: adsData.error
      });
    }
    
    const allAds = adsData.data || [];
    console.log(`📊 Total ads en la cuenta: ${allAds.length}`);
    console.log('Estados:', allAds.map(ad => `${ad.name}: ${ad.effective_status}`).join(', '));
    
    if (allAds.length === 0) {
      return res.status(200).json({ 
        data: [], 
        message: 'No se encontraron anuncios en esta cuenta.'
      });
    }
    
    // ✅ Combinar insights con ads completos
    const insightsMap = new Map();
    if (insightsData.data && insightsData.data.length > 0) {
      insightsData.data.forEach(insight => {
        insightsMap.set(insight.ad_id, insight);
      });
    }
    
    console.log(`🔄 Procesando ${allAds.length} anuncios...`);
    
    // Procesar TODOS los ads y obtener sus detalles
    const processedAds = await Promise.all(
      allAds.map(async (ad) => {
        try {
          // Obtener insights del map o desde API individual
          let adInsights = insightsMap.get(ad.id);
          
          if (!adInsights) {
            // Si no tiene insights en el map, intentar obtenerlos individualmente
            try {
              const individualInsightUrl = `https://graph.facebook.com/v21.0/${ad.id}/insights?fields=reach,impressions,cpc,spend,clicks,ctr&time_range=${encodeURIComponent(timeRange)}&access_token=${token}`;
              const individualResponse = await fetch(individualInsightUrl);
              const individualData = await individualResponse.json();
              adInsights = individualData.data?.[0] || {};
            } catch (err) {
              console.log(`ℹ️  No insights for ${ad.name} (${ad.effective_status})`);
              adInsights = {};
            }
          }
          
          // Obtener imagen
          let imageUrl = null;
          try {
            const creativeUrl = `https://graph.facebook.com/v21.0/${ad.id}?fields=creative{image_url,thumbnail_url,object_story_spec,image_hash}&access_token=${token}`;
            const creativeResponse = await fetch(creativeUrl);
            const creativeData = await creativeResponse.json();
            
            imageUrl = creativeData.creative?.image_url || 
                      creativeData.creative?.thumbnail_url || 
                      null;
            
            if (!imageUrl && creativeData.creative?.image_hash) {
              imageUrl = `https://scontent.xx.fbcdn.net/v/t45.1600-4/${creativeData.creative.image_hash}`;
            }
          } catch (err) {
            console.log(`ℹ️  No image for ${ad.name}`);
          }
          
          return {
            ad_id: ad.id,
            ad_name: ad.name,
            status: ad.status,
            effective_status: ad.effective_status,
            created_time: ad.created_time,
            updated_time: ad.updated_time,
            reach: adInsights.reach || 0,
            impressions: adInsights.impressions || 0,
            cpc: adInsights.cpc || 0,
            spend: adInsights.spend || 0,
            clicks: adInsights.clicks || 0,
            ctr: adInsights.ctr || 0,
            image_url: imageUrl,
            has_creative: !!imageUrl,
          };
        } catch (err) {
          console.error(`❌ Error processing ad ${ad.id}:`, err.message);
          return {
            ad_id: ad.id,
            ad_name: ad.name,
            status: ad.status,
            effective_status: ad.effective_status,
            created_time: ad.created_time,
            reach: 0,
            impressions: 0,
            cpc: 0,
            spend: 0,
            clicks: 0,
            ctr: 0,
            image_url: null,
            has_creative: false,
          };
        }
      })
    );
    
    const withImages = processedAds.filter(ad => ad.has_creative).length;
    const activeAds = processedAds.filter(ad => ad.effective_status === 'ACTIVE').length;
    const pausedAds = processedAds.filter(ad => ad.effective_status === 'PAUSED').length;
    
    console.log(`✅ Procesados: ${processedAds.length} total`);
    console.log(`   - Activos: ${activeAds}`);
    console.log(`   - Pausados: ${pausedAds}`);
    console.log(`   - Con imagen: ${withImages}`);
    
    res.status(200).json({ 
      data: processedAds,
      message: `${processedAds.length} anuncios (${activeAds} activos, ${pausedAds} pausados, ${withImages} con imagen)`
    });
    
  } catch (error) {
    console.error('💥 Server error:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      message: error.message 
    });
  }
}
