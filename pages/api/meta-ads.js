export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { token, accountId } = req.query;
  
  if (!token || !accountId) {
    return res.status(400).json({ 
      error: 'Faltan parámetros: token y accountId son requeridos' 
    });
  }

  try {
    const cleanAccountId = accountId.replace(/^act_/i, '');
    
    const timeRange = JSON.stringify({
      since: '2024-11-01',
      until: '2025-01-13'
    });
    
    // CAMBIO IMPORTANTE: Agregamos effective_status para ver el estado
    // y quitamos filtros para ver TODAS las campañas
    const url = `https://graph.facebook.com/v21.0/act_${cleanAccountId}/insights?fields=reach,impressions,cpc,spend,clicks,ctr,ad_id,ad_name,date_start,date_stop&level=ad&time_range=${encodeURIComponent(timeRange)}&access_token=${token}&limit=100`;
    
    console.log('Fetching Meta Ads data (including inactive)...');
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (!response.ok) {
      console.error('Meta API error:', data);
      return res.status(response.status).json({
        error: data.error?.message || 'Error al obtener datos de Meta',
        details: data.error
      });
    }
    
    // Si no hay datos en insights, intentamos obtener los anuncios directamente
    if (!data.data || data.data.length === 0) {
      console.log('No insights found, fetching ads directly...');
      
      // Intentar obtener anuncios directamente (sin filtro de insights)
      const adsUrl = `https://graph.facebook.com/v21.0/act_${cleanAccountId}/ads?fields=id,name,status,effective_status,created_time,updated_time&limit=100&access_token=${token}`;
      const adsResponse = await fetch(adsUrl);
      const adsData = await adsResponse.json();
      
      if (adsData.data && adsData.data.length > 0) {
        // Obtener insights individuales para cada anuncio
        const adsWithInsights = await Promise.all(
          adsData.data.slice(0, 20).map(async (ad) => {
            try {
              const insightUrl = `https://graph.facebook.com/v21.0/${ad.id}/insights?fields=reach,impressions,cpc,spend,clicks,ctr&time_range=${encodeURIComponent(timeRange)}&access_token=${token}`;
              const insightResponse = await fetch(insightUrl);
              const insightData = await insightResponse.json();
              
              const insight = insightData.data && insightData.data[0] ? insightData.data[0] : {};
              
              return {
                ad_id: ad.id,
                ad_name: ad.name,
                status: ad.status,
                effective_status: ad.effective_status,
                reach: insight.reach || 0,
                impressions: insight.impressions || 0,
                cpc: insight.cpc || 0,
                spend: insight.spend || 0,
                clicks: insight.clicks || 0,
                ctr: insight.ctr || 0,
              };
            } catch (err) {
              console.error(`Error fetching insights for ad ${ad.id}:`, err);
              return {
                ad_id: ad.id,
                ad_name: ad.name,
                status: ad.status,
                effective_status: ad.effective_status,
                reach: 0,
                impressions: 0,
                cpc: 0,
                spend: 0,
                clicks: 0,
                ctr: 0,
              };
            }
          })
        );
        
        return res.status(200).json({ 
          data: adsWithInsights,
          message: `Se encontraron ${adsWithInsights.length} anuncios (incluyendo inactivos)`
        });
      }
      
      return res.status(200).json({ 
        data: [], 
        message: 'No se encontraron anuncios en esta cuenta. Verifica el Account ID.' 
      });
    }
    
    console.log(`Found ${data.data.length} ads with insights`);
    
    // Obtener imágenes y estado de cada anuncio
    const adsWithImages = await Promise.all(
      data.data.map(async (ad) => {
        try {
          const adDetailsUrl = `https://graph.facebook.com/v21.0/${ad.ad_id}?fields=creative{image_url,thumbnail_url},status,effective_status&access_token=${token}`;
          const adDetailsResponse = await fetch(adDetailsUrl);
          const adDetails = await adDetailsResponse.json();
          
          return {
            ...ad,
            image_url: adDetails.creative?.image_url || 
                      adDetails.creative?.thumbnail_url || 
                      null,
            status: adDetails.status || 'UNKNOWN',
            effective_status: adDetails.effective_status || 'UNKNOWN'
          };
        } catch (err) {
          console.error(`Error fetching details for ad ${ad.ad_id}:`, err);
          return { ...ad, image_url: null, status: 'UNKNOWN' };
        }
      })
    );
    
    res.status(200).json({ data: adsWithImages });
    
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      message: error.message 
    });
  }
}
