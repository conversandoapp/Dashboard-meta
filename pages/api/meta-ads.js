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
      since: '2024-12-01',
      until: '2025-01-13'
    });
    
    const url = `https://graph.facebook.com/v21.0/act_${cleanAccountId}/insights?fields=reach,impressions,cpc,spend,clicks,ctr,ad_id,ad_name,date_start,date_stop&level=ad&time_range=${encodeURIComponent(timeRange)}&access_token=${token}`;
    
    console.log('Fetching Meta Ads data...');
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (!response.ok) {
      console.error('Meta API error:', data);
      return res.status(response.status).json({
        error: data.error?.message || 'Error al obtener datos de Meta',
        details: data.error
      });
    }
    
    if (!data.data || data.data.length === 0) {
      return res.status(200).json({ 
        data: [], 
        message: 'No se encontraron anuncios en el periodo especificado' 
      });
    }
    
    console.log(`Found ${data.data.length} ads`);
    
    const adsWithImages = await Promise.all(
      data.data.map(async (ad) => {
        try {
          const creativeResponse = await fetch(
            `https://graph.facebook.com/v21.0/${ad.ad_id}?fields=creative{image_url,thumbnail_url}&access_token=${token}`
          );
          const creativeData = await creativeResponse.json();
          
          return {
            ...ad,
            image_url: creativeData.creative?.image_url || 
                      creativeData.creative?.thumbnail_url || 
                      null
          };
        } catch (err) {
          console.error(`Error fetching image for ad ${ad.ad_id}:`, err);
          return { ...ad, image_url: null };
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
