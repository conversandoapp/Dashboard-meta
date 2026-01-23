const { google } = require('googleapis');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { adsData, accountId } = req.body;

    if (!adsData || !Array.isArray(adsData)) {
      return res.status(400).json({ error: 'Datos inválidos' });
    }

    // Leer variables de entorno
    const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID;
    const SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!SPREADSHEET_ID || !SERVICE_ACCOUNT_EMAIL || !PRIVATE_KEY) {
      return res.status(500).json({ 
        error: 'Variables de entorno no configuradas',
        details: 'Asegúrate de configurar GOOGLE_SHEETS_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL y GOOGLE_PRIVATE_KEY'
      });
    }

    // Autenticar con Google Sheets
    const auth = new google.auth.JWT(
      SERVICE_ACCOUNT_EMAIL,
      null,
      PRIVATE_KEY,
      ['https://www.googleapis.com/auth/spreadsheets']
    );

    const sheets = google.sheets({ version: 'v4', auth });

    // Preparar datos para Google Sheets
    const timestamp = new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' });
    
    // Header
    const headers = [
      'Fecha/Hora',
      'Account ID',
      'Nombre Anuncio',
      'Estado',
      'Alcance',
      'Impresiones',
      'Clics',
      'CPC',
      'CTR',
      'Gasto',
      'URL Imagen'
    ];

    // Datos
    const rows = adsData.map(ad => [
      timestamp,
      accountId,
      ad.ad_name || 'Sin nombre',
      ad.effective_status || ad.status || 'DESCONOCIDO',
      parseInt(ad.reach || 0),
      parseInt(ad.impressions || 0),
      parseInt(ad.clicks || 0),
      parseFloat(ad.cpc || 0).toFixed(2),
      ad.ctr ? parseFloat(ad.ctr).toFixed(2) + '%' : '0%',
      parseFloat(ad.spend || 0).toFixed(2),
      ad.image_url || ''
    ]);

    // Verificar si la hoja existe, si no crearla
    const sheetName = 'Meta Ads Data';
    
    try {
      // Intentar obtener la hoja
      await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${sheetName}!A1`,
      });
    } catch (error) {
      // Si no existe, crearla
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        resource: {
          requests: [{
            addSheet: {
              properties: {
                title: sheetName
              }
            }
          }]
        }
      });

      // Agregar headers
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${sheetName}!A1`,
        valueInputOption: 'RAW',
        resource: {
          values: [headers]
        }
      });
    }

    // Agregar datos (append al final)
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A2`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      resource: {
        values: rows
      }
    });

    // Calcular totales
    const totals = adsData.reduce((acc, ad) => ({
      reach: acc.reach + parseInt(ad.reach || 0),
      impressions: acc.impressions + parseInt(ad.impressions || 0),
      clicks: acc.clicks + parseInt(ad.clicks || 0),
      spend: acc.spend + parseFloat(ad.spend || 0),
    }), { reach: 0, impressions: 0, clicks: 0, spend: 0 });

    return res.status(200).json({
      success: true,
      message: `${adsData.length} anuncios sincronizados exitosamente`,
      details: `Alcance: ${totals.reach.toLocaleString()} | Inversión: $${totals.spend.toFixed(2)}`,
      spreadsheetId: SPREADSHEET_ID,
      rowsAdded: adsData.length
    });

  } catch (error) {
    console.error('Error syncing to Google Sheets:', error);
    return res.status(500).json({ 
      error: 'Error al sincronizar con Google Sheets',
      details: error.message 
    });
  }
}
