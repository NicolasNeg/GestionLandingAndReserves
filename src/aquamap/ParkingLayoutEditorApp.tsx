import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getLandingPage, upsertLandingPage } from '../lib/dataLayer.js';
import { DEFAULT_MAPA_JSON } from '../lib/distribucionMapa.js';
import { AquaMapSiteEditor } from './AquaMapSiteEditor';
import { ensureAquamapEnvelopeFromSiteJson } from './siteEnvelope';
import { syncAllParkingElementsToDb } from './parkingSpotsSync';
import './parkingLayoutEditor.css';

const LANDING_PAGE_ID = 'main';

type LandingRow = {
  descripcionParque?: string;
  mapaEstacionamientoJson?: string;
  mapaDistribucionJson?: string;
  mapaMesasJson?: string;
  imagenSatelitalUrl?: string;
  googleMapsUrl?: string;
  googleMapsAddress?: string;
  horariosTexto?: string;
  abiertoAhora?: boolean;
  ocupacionTexto?: string;
  estacionamientoTexto?: string;
  botonesJson?: string;
};

export function ParkingLayoutEditorApp() {
  const [mapJson, setMapJson] = useState(DEFAULT_MAPA_JSON);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const baselineRef = useRef(DEFAULT_MAPA_JSON);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await getLandingPage({ id: LANDING_PAGE_ID });
        const row = (res.data?.landingPage || {}) as LandingRow;
        const json =
          row.mapaEstacionamientoJson || row.mapaDistribucionJson || DEFAULT_MAPA_JSON;
        if (!cancelled) {
          baselineRef.current = json;
          setMapJson(json);
        }
      } catch (e) {
        console.warn('[parking layout]', e);
        if (!cancelled) setError('No se pudo cargar el plano. Revisa la conexión.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const spotCount = useMemo(() => {
    try {
      const env = ensureAquamapEnvelopeFromSiteJson(mapJson, { view: 'estacionamiento' });
      return env.elements.filter((e) => e.type === 'parking').length;
    } catch {
      return 0;
    }
  }, [mapJson]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setStatus('');
    setError('');
    try {
      const res = await getLandingPage({ id: LANDING_PAGE_ID });
      const row = (res.data?.landingPage || {}) as LandingRow;
      const envelope = ensureAquamapEnvelopeFromSiteJson(mapJson, { view: 'estacionamiento' });
      await syncAllParkingElementsToDb(envelope);
      await upsertLandingPage({
        id: LANDING_PAGE_ID,
        descripcionParque: row.descripcionParque || '',
        mapaEstacionamientoJson: mapJson,
        mapaDistribucionJson: row.mapaDistribucionJson || DEFAULT_MAPA_JSON,
        mapaMesasJson: row.mapaMesasJson || row.mapaDistribucionJson || DEFAULT_MAPA_JSON,
        imagenSatelitalUrl: row.imagenSatelitalUrl || '',
        googleMapsUrl: row.googleMapsUrl || '',
        googleMapsAddress: row.googleMapsAddress || '',
        horariosTexto: row.horariosTexto || '',
        abiertoAhora: row.abiertoAhora ?? false,
        ocupacionTexto: row.ocupacionTexto || '',
        estacionamientoTexto: row.estacionamientoTexto || '',
        botonesJson: row.botonesJson || '{}'
      });
      baselineRef.current = mapJson;
      const count = envelope.elements.filter((e) => e.type === 'parking').length;
      setStatus(`Guardado · ${count} cajón${count === 1 ? '' : 'es'} en la base`);
    } catch (e) {
      console.warn(e);
      setError((e as Error)?.message || 'No se pudo guardar el plano.');
    } finally {
      setSaving(false);
    }
  }, [mapJson]);

  if (loading) {
    return (
      <div className="parking-layout-editor parking-layout-editor--loading">
        <p>Cargando editor de cajones…</p>
      </div>
    );
  }

  return (
    <div className="parking-layout-editor">
      <header className="parking-layout-editor__bar">
        <div>
          <p className="parking-layout-editor__eyebrow">Administración</p>
          <h2 className="parking-layout-editor__title">Configurar cajones</h2>
          <p className="parking-layout-editor__hint">
            Coloca cajones con la herramienta <strong>Parking</strong>. Cada uno se registra en la base
            al guardar. El patio operativo solo muestra esos lugares.
          </p>
        </div>
        <div className="parking-layout-editor__actions">
          <span className="parking-layout-editor__count">{spotCount} cajones en el plano</span>
          <button
            type="button"
            className="parking-layout-editor__save"
            disabled={saving}
            onClick={() => void handleSave()}
          >
            {saving ? 'Guardando…' : 'Guardar plano y cajones'}
          </button>
          <a
            href="/admin/dashboard?section=sitio&mapview=estacionamiento&mapfocus=1"
            className="parking-layout-editor__link"
            data-link
          >
            Abrir en Sitio → Mapa
          </a>
        </div>
      </header>
      {error ? <p className="parking-layout-editor__error">{error}</p> : null}
      {status ? <p className="parking-layout-editor__status">{status}</p> : null}
      <div className="parking-layout-editor__canvas">
        <AquaMapSiteEditor
          initialJson={mapJson}
          mapContext="estacionamiento"
          onChangeJson={setMapJson}
          onSaveSite={() => void handleSave()}
          onPreviewPublic={() => {
            window.open('/home#estacionamiento', '_blank', 'noopener');
          }}
        />
      </div>
    </div>
  );
}
