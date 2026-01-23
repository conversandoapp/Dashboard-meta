import { google } from 'googleapis';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { adsData } = req.body;

    if (!adsData || !Array.isArray(adsData)) {
      return res.status(400).json({ error: 'Datos de anuncios inválidos' });
    }

    // Configurar credenciales desde variables de entorno
    const auth = new google.auth.GoogleAuth({
      credentials: {
        type: 'service_account',
        project_id: process.env.GOOGLE_PROJECT_ID,
        private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        client_id: process.env.GOOGLE_CLIENT_ID,
        auth_uri: 'https://accounts.google.com/o/oauth2/auth',
        token_uri: 'https://oauth2.googleapis.com/token',
        auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
        client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.GOOGLE_CLIENT_EMAIL}`
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    // Obtener datos existentes
    const existingData = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Dashboard!A:H',
    });

    const rows = existingData.data.values || [];
    const headers = ['Nombre del Anuncio', 'Estado', 'Alcance', 'Impresiones', 'Clics', 'CPC', 'Gasto', 'CTR'];
    
    // Si no hay encabezados, crearlos
    if (rows.length === 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Dashboard!A1:H1',
        valueInputOption: 'RAW',
        resource: {
          values: [headers],
        },
      });
      rows.push(headers);
    }

    // Crear un mapa de anuncios existentes (nombre -> índice de fila)
    const existingAdsMap = new Map();
    for (let i = 1; i < rows.length; i++) {
      const adName = rows[i][0];
      if (adName) {
        existingAdsMap.set(adName, i);
      }
    }

    // Preparar actualizaciones y nuevos registros
    const updates = [];
    const newRows = [];

    for (const ad of adsData) {
      const adName = ad.ad_name || 'Sin nombre';
      const status = ad.effective_status || ad.status || 'UNKNOWN';
      const reach = parseInt(ad.reach || 0);
      const impressions = parseInt(ad.impressions || 0);
      const clicks = parseInt(ad.clicks || 0);
      const cpc = parseFloat(ad.cpc || 0);
      const spend = parseFloat(ad.spend || 0);
      const ctr = parseFloat(ad.ctr || 0);

      const rowData = [
        adName,
        status,
        reach,
        impressions,
        clicks,
        cpc,
        spend,
        ctr
      ];

      if (existingAdsMap.has(adName)) {
        // Actualizar registro existente - SUMAR valores numéricos
        const rowIndex = existingAdsMap.get(adName);
        const existingRow = rows[rowIndex];
        
        const updatedRow = [
          adName, // Mantener nombre
          status, // Actualizar estado
          (parseInt(existingRow[2] || 0) + reach), // Sumar alcance
          (parseInt(existingRow[3] || 0) + impressions), // Sumar impresiones
          (parseInt(existingRow[4] || 0) + clicks), // Sumar clics
          cpc, // Actualizar CPC (último valor)
          (parseFloat(existingRow[6] || 0) + spend), // Sumar gasto
          ctr // Actualizar CTR (último valor)
        ];

        updates.push({
          range: `Dashboard!A${rowIndex + 1}:H${rowIndex + 1}`,
          values: [updatedRow],
        });
      } else {
        // Nuevo registro
        newRows.push(rowData);
      }
    }

    // Ejecutar actualizaciones en batch
    if (updates.length > 0) {
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId,
        resource: {
          valueInputOption: 'RAW',
          data: updates,
        },
      });
    }

    // Agregar nuevos registros
    if (newRows.length > 0) {
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'Dashboard!A:H',
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        resource: {
          values: newRows,
        },
      });
    }

    res.status(200).json({
      success: true,
      message: `Sincronizado: ${updates.length} actualizados, ${newRows.length} nuevos`,
      updated: updates.length,
      added: newRows.length,
    });

  } catch (error) {
    console.error('Error al sincronizar con Google Sheets:', error);
    res.status(500).json({
      error: 'Error al sincronizar con Google Sheets',
      details: error.message,
    });
  }
}
