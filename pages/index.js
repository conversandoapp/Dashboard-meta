```javascript
import React, { useState, useEffect } from 'react';

export default function MetaAdsDashboard() {
  const [metaData, setMetaData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [metaToken, setMetaToken] = useState('');
  const [adAccountId, setAdAccountId] = useState('');
  const [isConfigured, setIsConfigured] = useState(false);

  const fetchMetaAdsData = async () => {
    if (!metaToken || !adAccountId) {
      setError('Por favor ingresa tu Access Token y Ad Account ID');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Llamar a nuestro backend (API route)
      const response = await fetch(
        `/api/meta-ads?token=${encodeURIComponent(metaToken)}&accountId=${encodeURIComponent(adAccountId)}`
      );
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Error al obtener datos');
      }
      
      if (!data.data || data.data.length === 0) {
        setError('No se encontraron anuncios. Verifica tu Account ID y que tengas campañas activas.');
        setLoading(false);
        return;
      }
      
      setMetaData(data.data);
      setLoading(false);
      
      // Guardar credenciales en localStorage para no tener que ingresarlas cada vez
      if (typeof window !== 'undefined') {
        localStorage.setItem('meta_token', metaToken);
        localStorage.setItem('ad_account_id', adAccountId);
      }
      
    } catch (err) {
      console.error('Error:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  // Cargar credenciales guardadas al iniciar
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedToken = localStorage.getItem('meta_token');
      const savedAccountId = localStorage.getItem('ad_account_id');
      
      if (savedToken && savedAccountId) {
        setMetaToken(savedToken);
        setAdAccountId(savedAccountId);
        setIsConfigured(true);
      }
    }
  }, []);

  // Cargar datos automáticamente si ya está configurado
  useEffect(() => {
    if (isConfigured && metaToken && adAccountId) {
      fetchMetaAdsData();
    }
  }, [isConfigured]);

  const calculateTotals = () => {
    if (!metaData || metaData.length === 0) return null;

    const totals = metaData.reduce((acc, ad) => ({
      reach: acc.reach + parseInt(ad.reach || 0),
      impressions: acc.impressions + parseInt(ad.impressions || 0),
      clicks: acc.clicks + parseInt(ad.clicks || 0),
      spend: acc.spend + parseFloat(ad.spend || 0),
    }), { reach: 0, impressions: 0, clicks: 0, spend: 0 });

    totals.avgCPC = totals.clicks > 0 ? (totals.spend / totals.clicks).toFixed(2) : 0;
    return totals;
  };

  const totals = calculateTotals();

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('meta_token');
      localStorage.removeItem('ad_account_id');
    }
    setIsConfigured(false);
    setMetaData(null);
    setMetaToken('');
    setAdAccountId('');
  };

  if (!isConfigured) {
    return (
      
        
          🎯 Dashboard Meta Ads
          Configura tus credenciales para comenzar
          
          
            Meta Access Token
            <input
              type="password"
              value={metaToken}
              onChange={(e) => setMetaToken(e.target.value)}
              placeholder="EAABwzLixnjY..."
              style={styles.input}
            />
            
              Obtenlo en: developers.facebook.com/tools/explorer/
            
          
          
          
            Ad Account ID
            <input
              type="text"
              value={adAccountId}
              onChange={(e) => setAdAccountId(e.target.value)}
              placeholder="123456789"
              style={styles.input}
            />
            
              Encuéntralo en Meta Business Suite → Configuración
            
          

          <button
            onClick={() => setIsConfigured(true)}
            style={styles.button}
          >
            Conectar Dashboard
          

          
            📝 Instrucciones rápidas:
            
              Ve a developers.facebook.com/tools/explorer/
              Selecciona tu app y permisos: ads_read, ads_management
              Genera el token y cópialo
              Obtén tu Account ID en business.facebook.com
            
          
        
      
    );
  }

  return (
    
      
        
          📊 Dashboard Meta Ads
          Monitoreo en tiempo real
        
        
          
            {loading ? '⏳' : '🔄'} Actualizar
          
          
            🚪 Salir
          
        
      

      {error && (
        
          ⚠️ {error}
        
      )}

      {loading ? (
        
          ⏳ Cargando datos de Meta Ads...
        
      ) : totals ? (
        <>
          {/* KPIs */}
          
            
              Alcance Total
              {totals.reach.toLocaleString()}
              Usuarios únicos
            
            
              Impresiones
              {totals.impressions.toLocaleString()}
              Veces mostrado
            
            
              CPC Promedio
              ${totals.avgCPC}
              Costo por clic
            
            
              Inversión Total
              ${totals.spend.toFixed(2)}
              Gasto total
            
          

          {/* Anuncios */}
          
            {metaData.map((ad, index) => (
              
                {ad.image_url ? (
                  
                ) : (
                  🖼️
                )}
                
                  {ad.ad_name}
                  
                    
                      Alcance:
                      {parseInt(ad.reach || 0).toLocaleString()}
                    
                    
                      Impresiones:
                      {parseInt(ad.impressions || 0).toLocaleString()}
                    
                    
                      CPC:
                      ${parseFloat(ad.cpc || 0).toFixed(2)}
                    
                    
                      Clics:
                      {parseInt(ad.clicks || 0).toLocaleString()}
                    
                    
                      Gasto:
                      
                        ${parseFloat(ad.spend || 0).toFixed(2)}
                      
                    
                  
                
              
            ))}
          
        </>
      ) : null}
    
  );
}

// Estilos inline
const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(to bottom right, #eff6ff, #e0e7ff)',
    padding: '24px',
  },
  configCard: {
    maxWidth: '600px',
    margin: '0 auto',
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
    padding: '40px',
  },
  title: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '8px',
    textAlign: 'center',
  },
  subtitle: {
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: '32px',
  },
  formGroup: {
    marginBottom: '24px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '8px',
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  hint: {
    fontSize: '12px',
    color: '#6b7280',
    marginTop: '4px',
  },
  button: {
    width: '100%',
    background: '#2563eb',
    color: 'white',
    padding: '14px',
    borderRadius: '8px',
    border: 'none',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
    marginBottom: '24px',
  },
  infoBox: {
    background: '#fef3c7',
    border: '1px solid #fcd34d',
    borderRadius: '8px',
    padding: '16px',
  },
  infoTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#92400e',
    marginBottom: '8px',
  },
  list: {
    fontSize: '14px',
    color: '#78350f',
    paddingLeft: '20px',
    margin: 0,
  },
  header: {
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    padding: '24px',
    marginBottom: '24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dashboardTitle: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#1f2937',
    margin: 0,
  },
  dashboardSubtitle: {
    color: '#6b7280',
    margin: '4px 0 0 0',
  },
  refreshButton: {
    background: '#2563eb',
    color: 'white',
    padding: '10px 20px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
  },
  logoutButton: {
    background: '#ef4444',
    color: 'white',
    padding: '10px 20px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
  },
  errorBox: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '24px',
    color: '#991b1b',
  },
  loadingBox: {
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    padding: '48px',
    textAlign: 'center',
  },
  loadingText: {
    color: '#6b7280',
    fontSize: '16px',
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
    marginBottom: '24px',
  },
  kpiCard: {
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    padding: '24px',
  },
  kpiLabel: {
    color: '#6b7280',
    fontSize: '14px',
    margin: '0 0 8px 0',
    fontWeight: '500',
  },
  kpiValue: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#1f2937',
    margin: '0 0 4px 0',
  },
  kpiHint: {
    fontSize: '12px',
    color: '#9ca3af',
    margin: 0,
  },
  adsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '20px',
  },
  adCard: {
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    overflow: 'hidden',
  },
  adImage: {
    width: '100%',
    height: '200px',
    objectFit: 'cover',
  },
  adImagePlaceholder: {
    width: '100%',
    height: '200px',
    background: '#e5e7eb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '48px',
  },
  adContent: {
    padding: '16px',
  },
  adTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '12px',
  },
  adStats: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  adStat: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '14px',
  },
  adStatLabel: {
    color: '#6b7280',
  },
  adStatValue: {
    fontWeight: '500',
    color: '#1f2937',
  },
};
```
