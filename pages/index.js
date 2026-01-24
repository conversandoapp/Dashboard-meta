import React, { useState, useEffect } from 'react';

export default function MetaAdsDashboard() {
  const [metaData, setMetaData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncMessage, setSyncMessage] = useState(null);

  const fetchMetaAdsData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/meta-ads');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || data.message || 'Error al obtener datos');
      }
      
      if (!data.data || data.data.length === 0) {
        setError('No se encontraron anuncios. Verifica tu configuración en Render.');
        setLoading(false);
        return;
      }
      
      setMetaData(data.data);
      setLoading(false);
      
    } catch (err) {
      console.error('Error:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  const syncToGoogleSheets = async () => {
    if (!metaData || metaData.length === 0) {
      setSyncMessage({ type: 'error', text: 'No hay datos para sincronizar' });
      return;
    }

    setSyncLoading(true);
    setSyncMessage(null);

    try {
      const response = await fetch('/api/sync-to-sheets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adsData: metaData,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details || data.error || 'Error al sincronizar');
      }

      setSyncMessage({
        type: 'success',
        text: `✅ ${data.message}`,
      });

      setTimeout(() => setSyncMessage(null), 5000);

    } catch (err) {
      console.error('Error al sincronizar:', err);
      setSyncMessage({
        type: 'error',
        text: `❌ Error: ${err.message}`,
      });
    } finally {
      setSyncLoading(false);
    }
  };

  useEffect(() => {
    fetchMetaAdsData();
  }, []);

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

  const getStatusColor = (status) => {
    switch(status) {
      case 'ACTIVE': return '#10b981';
      case 'PAUSED': return '#f59e0b';
      case 'DELETED':
      case 'ARCHIVED': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusText = (status) => {
    switch(status) {
      case 'ACTIVE': return 'ACTIVO';
      case 'PAUSED': return 'PAUSADO';
      case 'DELETED': return 'ELIMINADO';
      case 'ARCHIVED': return 'ARCHIVADO';
      default: return status || 'DESCONOCIDO';
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.headerContainer}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.dashboardTitle}>📊 Dashboard Meta Ads</h1>
            <p style={styles.dashboardSubtitle}>Monitoreo completo de campañas (activas e inactivas)</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button onClick={fetchMetaAdsData} disabled={loading} style={styles.refreshButton}>
              {loading ? '⏳ Cargando...' : '🔄 Actualizar'}
            </button>
            <button 
              onClick={syncToGoogleSheets} 
              disabled={syncLoading || !metaData}
              style={{
                ...styles.syncButton,
                opacity: syncLoading || !metaData ? 0.6 : 1,
                cursor: syncLoading || !metaData ? 'not-allowed' : 'pointer',
              }}
            >
              {syncLoading ? '⏳ Sincronizando...' : '📊 Sincronizar a Sheets'}
            </button>
          </div>
        </div>
      </div>

      {syncMessage && (
        <div style={{
          ...styles.messageBox,
          background: syncMessage.type === 'success' ? '#f0fdf4' : '#fef2f2',
          border: syncMessage.type === 'success' ? '2px solid #86efac' : '2px solid #fecaca',
          color: syncMessage.type === 'success' ? '#166534' : '#991b1b',
        }}>
          <p style={{ margin: 0 }}>{syncMessage.text}</p>
        </div>
      )}

      {error && (
        <div style={styles.errorBox}>
          <p style={{ margin: 0 }}>⚠️ {error}</p>
          <p style={{ fontSize: '13px', marginTop: '8px', margin: '8px 0 0 0' }}>
            Asegúrate de haber configurado las variables de entorno en Render.
          </p>
        </div>
      )}

      {loading ? (
        <div style={styles.loadingBox}>
          <div style={styles.spinner}></div>
          <p style={styles.loadingText}>⏳ Cargando datos de Meta Ads...</p>
          <p style={styles.loadingHint}>Esto puede tomar unos segundos...</p>
        </div>
      ) : totals ? (
        <>
          <div style={styles.kpiGrid}>
            <div style={styles.kpiCard}>
              <div style={styles.kpiIcon}>👥</div>
              <h3 style={styles.kpiLabel}>Alcance Total</h3>
              <p style={styles.kpiValue}>{totals.reach.toLocaleString()}</p>
              <p style={styles.kpiHint}>Usuarios únicos alcanzados</p>
            </div>
            <div style={styles.kpiCard}>
              <div style={styles.kpiIcon}>👁️</div>
              <h3 style={styles.kpiLabel}>Impresiones</h3>
              <p style={styles.kpiValue}>{totals.impressions.toLocaleString()}</p>
              <p style={styles.kpiHint}>Total de veces mostrado</p>
            </div>
            <div style={styles.kpiCard}>
              <div style={styles.kpiIcon}>💰</div>
              <h3 style={styles.kpiLabel}>CPC Promedio</h3>
              <p style={styles.kpiValue}>${totals.avgCPC}</p>
              <p style={styles.kpiHint}>Costo promedio por clic</p>
            </div>
            <div style={styles.kpiCard}>
              <div style={styles.kpiIcon}>💸</div>
              <h3 style={styles.kpiLabel}>Inversión Total</h3>
              <p style={styles.kpiValue}>${totals.spend.toFixed(2)}</p>
              <p style={styles.kpiHint}>Gasto total del periodo</p>
            </div>
          </div>

          <div style={styles.statsBar}>
            <div style={styles.statsItem}>
              <span style={styles.statsLabel}>Total de anuncios:</span>
              <span style={styles.statsValue}>{metaData.length}</span>
            </div>
            <div style={styles.statsItem}>
              <span style={styles.statsLabel}>Activos:</span>
              <span style={{ ...styles.statsValue, color: '#10b981' }}>
                {metaData.filter(ad => ad.effective_status === 'ACTIVE').length}
              </span>
            </div>
            <div style={styles.statsItem}>
              <span style={styles.statsLabel}>Pausados:</span>
              <span style={{ ...styles.statsValue, color: '#f59e0b' }}>
                {metaData.filter(ad => ad.effective_status === 'PAUSED').length}
              </span>
            </div>
            <div style={styles.statsItem}>
              <span style={styles.statsLabel}>Otros:</span>
              <span style={{ ...styles.statsValue, color: '#6b7280' }}>
                {metaData.filter(ad => ad.effective_status !== 'ACTIVE' && ad.effective_status !== 'PAUSED').length}
              </span>
            </div>
          </div>

          <div style={styles.adsGrid}>
            {metaData.map((ad, index) => (
              <div key={index} style={styles.adCard}>
                {ad.image_url ? (
                  <img src={ad.image_url} alt={ad.ad_name} style={styles.adImage} />
                ) : (
                  <div style={styles.adImagePlaceholder}>
                    <div style={styles.placeholderIcon}>🖼️</div>
                    <div style={styles.placeholderText}>Sin imagen disponible</div>
                  </div>
                )}
                <div style={styles.adContent}>
                  <div style={styles.adHeader}>
                    <h3 style={styles.adTitle}>{ad.ad_name}</h3>
                    {(ad.effective_status || ad.status) && (
                      <span style={{
                        ...styles.statusBadge,
                        backgroundColor: getStatusColor(ad.effective_status || ad.status),
                      }}>
                        {getStatusText(ad.effective_status || ad.status)}
                      </span>
                    )}
                  </div>
                  <div style={styles.adStats}>
                    <div style={styles.adStat}>
                      <span style={styles.adStatLabel}>👥 Alcance:</span>
                      <span style={styles.adStatValue}>{parseInt(ad.reach || 0).toLocaleString()}</span>
                    </div>
                    <div style={styles.adStat}>
                      <span style={styles.adStatLabel}>👁️ Impresiones:</span>
                      <span style={styles.adStatValue}>{parseInt(ad.impressions || 0).toLocaleString()}</span>
                    </div>
                    <div style={styles.adStat}>
                      <span style={styles.adStatLabel}>💰 CPC:</span>
                      <span style={styles.adStatValue}>${parseFloat(ad.cpc || 0).toFixed(2)}</span>
                    </div>
                    <div style={styles.adStat}>
                      <span style={styles.adStatLabel}>🖱️ Clics:</span>
                      <span style={styles.adStatValue}>{parseInt(ad.clicks || 0).toLocaleString()}</span>
                    </div>
                    <div style={styles.adStat}>
                      <span style={styles.adStatLabel}>💸 Gasto:</span>
                      <span style={{ ...styles.adStatValue, color: '#dc2626', fontWeight: 'bold' }}>
                        ${parseFloat(ad.spend || 0).toFixed(2)}
                      </span>
                    </div>
                    {ad.ctr && (
                      <div style={styles.adStat}>
                        <span style={styles.adStatLabel}>📊 CTR:</span>
                        <span style={styles.adStatValue}>{parseFloat(ad.ctr || 0).toFixed(2)}%</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '24px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  headerContainer: {
    marginBottom: '24px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '16px',
    marginBottom: '20px',
  },
  dashboardTitle: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: 'white',
    margin: 0,
    textShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  dashboardSubtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    margin: '4px 0 0 0',
    fontSize: '14px',
  },
  refreshButton: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    padding: '12px 24px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'transform 0.2s',
  },
  syncButton: {
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    color: 'white',
    padding: '12px 24px',
    borderRadius: '8px',
    border: 'none',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'transform 0.2s',
  },
  messageBox: {
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '24px',
    fontSize: '15px',
    fontWeight: '500',
  },
  errorBox: {
    background: '#fef2f2',
    border: '2px solid #fecaca',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '24px',
    color: '#991b1b',
    fontSize: '15px',
  },
  loadingBox: {
    background: 'white',
    borderRadius: '16px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    padding: '60px',
    textAlign: 'center',
  },
  spinner: {
    width: '50px',
    height: '50px',
    margin: '0 auto 20px',
    border: '4px solid #e5e7eb',
    borderTop: '4px solid #667eea',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    color: '#1f2937',
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '8px',
  },
  loadingHint: {
    color: '#6b7280',
    fontSize: '14px',
  },
  statsBar: {
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    padding: '20px',
    marginBottom: '24px',
    display: 'flex',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    gap: '16px',
  },
  statsItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
  },
  statsLabel: {
    fontSize: '13px',
    color: '#6b7280',
    fontWeight: '500',
  },
  statsValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#1f2937',
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
    marginBottom: '24px',
  },
  kpiCard: {
    background: 'white',
    borderRadius: '16px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    padding: '28px',
    transition: 'transform 0.3s',
  },
  kpiIcon: {
    fontSize: '32px',
    marginBottom: '8px',
  },
  kpiLabel: {
    color: '#6b7280',
    fontSize: '14px',
    margin: '0 0 12px 0',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  kpiValue: {
    fontSize: '36px',
    fontWeight: 'bold',
    color: '#1f2937',
    margin: '0 0 8px 0',
  },
  kpiHint: {
    fontSize: '12px',
    color: '#9ca3af',
    margin: 0,
  },
  adsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '24px',
  },
  adCard: {
    background: 'white',
    borderRadius: '16px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    overflow: 'hidden',
    transition: 'transform 0.3s, box-shadow 0.3s',
  },
  adImage: {
    width: '100%',
    height: '220px',
    objectFit: 'cover',
  },
  adImagePlaceholder: {
    width: '100%',
    height: '220px',
    background: 'linear-gradient(135deg, #e5e7eb 0%, #d1d5db 100%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  placeholderIcon: {
    fontSize: '48px',
    opacity: 0.5,
  },
  placeholderText: {
    fontSize: '13px',
    color: '#6b7280',
    fontWeight: '500',
  },
  adContent: {
    padding: '20px',
  },
  adHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px',
    gap: '12px',
  },
  adTitle: {
    fontSize: '17px',
    fontWeight: '700',
    color: '#1f2937',
    margin: 0,
    flex: 1,
    lineHeight: '1.4',
  },
  statusBadge: {
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '11px',
    color: 'white',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    whiteSpace: 'nowrap',
  },
  adStats: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  adStat: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '14px',
    padding: '8px 0',
    borderBottom: '1px solid #f3f4f6',
  },
  adStatLabel: {
    color: '#6b7280',
    fontWeight: '500',
  },
  adStatValue: {
    fontWeight: '600',
    color: '#1f2937',
  },
};
