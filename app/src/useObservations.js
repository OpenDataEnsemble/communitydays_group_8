import { useCallback, useEffect, useRef, useState } from 'react';
import config from './theme.json';

export function observationQuery(formType, entityId) {
  return {
    formType,
    isDraft: false,
    includeDeleted: false,
    ...(entityId === undefined
      ? {}
      : { filter: { field: 'data.entity_id', op: 'eq', value: entityId } }),
  };
}

function message(error) {
  return error instanceof Error ? error.message : String(error);
}

export default function useObservations(entityId) {
  const [api, setApi] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [followUps, setFollowUps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [opening, setOpening] = useState(false);
  const mounted = useRef(false);
  const request = useRef(0);
  const session = useRef(0);
  const formBusy = useRef(false);

  const refresh = useCallback(async () => {
    const current = ++request.current;
    const isCurrent = () => mounted.current && current === request.current;
    setLoading(true);
    setError('');
    try {
      if (typeof window.getFormulus !== 'function') {
        throw new Error('The Formulus loader is unavailable.');
      }
      const bridge = await window.getFormulus();
      if (!isCurrent()) return;
      if (typeof bridge.getObservationsByQuery !== 'function' ||
          typeof bridge.openFormplayer !== 'function') {
        throw new Error('This host does not support the required observation and form APIs.');
      }
      setApi(bridge);
      const [records, history] = await Promise.all([
        bridge.getObservationsByQuery(observationQuery(config.registrationForm)),
        entityId === undefined
          ? Promise.resolve([])
          : bridge.getObservationsByQuery(observationQuery(config.followUpForm, entityId)),
      ]);
      if (!isCurrent()) return;
      if (!Array.isArray(records) || !Array.isArray(history)) {
        throw new Error('The host returned an unexpected observation response.');
      }
      setRegistrations(records);
      setFollowUps([...history].sort((a, b) =>
        (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0)));
    } catch (failure) {
      if (isCurrent()) setError(message(failure));
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [entityId]);

  useEffect(() => {
    mounted.current = true;
    session.current += 1;
    setRegistrations([]);
    setFollowUps([]);
    setFormError('');
    setOpening(false);
    formBusy.current = false;
    void refresh();
    return () => {
      mounted.current = false;
      request.current += 1;
      session.current += 1;
    };
  }, [refresh]);

  useEffect(() => {
    if (!api) return;
    let active = true;
    let checking = false;
    let lastRevision;
    async function checkRevision() {
      if (checking || document.visibilityState !== 'visible' ||
          typeof api.getCurrentDataRevisionCount !== 'function') return;
      checking = true;
      try {
        const revision = await api.getCurrentDataRevisionCount();
        if (!active || !Number.isFinite(revision) || revision < 0) return;
        // The initial query may have raced with a sync; re-read on the first revision too.
        if (lastRevision !== revision) {
          lastRevision = revision;
          void refresh();
        }
      } catch {
        // Older/offline hosts may not expose revisions. Focus and form-close still refresh.
      } finally {
        checking = false;
      }
    }
    const onFocus = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    // Hosts have used both callback locations. Preserve other bridge consumers.
    const callbacks = window.formulusCallbacks || (window.formulusCallbacks = {});
    const previousWindowFocus = window.onReceiveFocus;
    const previousCallbackFocus = callbacks.onReceiveFocus;
    const wrap = (previous) => function (...args) {
      try {
        return typeof previous === 'function' ? previous.apply(this, args) : undefined;
      } finally {
        if (active) void refresh();
      }
    };
    const windowFocus = wrap(previousWindowFocus);
    const callbackFocus = wrap(previousCallbackFocus);
    window.onReceiveFocus = windowFocus;
    callbacks.onReceiveFocus = callbackFocus;
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    const timer = window.setInterval(checkRevision, 5000);
    void checkRevision();
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
      if (window.onReceiveFocus === windowFocus) window.onReceiveFocus = previousWindowFocus;
      if (callbacks.onReceiveFocus === callbackFocus) callbacks.onReceiveFocus = previousCallbackFocus;
    };
  }, [api, refresh]);

  const openForm = async (formType, defaultData = {}) => {
    if (!api || formBusy.current) return;
    const currentSession = session.current;
    const isCurrent = () => mounted.current && currentSession === session.current;
    formBusy.current = true;
    setOpening(true);
    setFormError('');
    try {
      const result = await api.openFormplayer(
        formType, { defaultData }, {}, { skipDraftSelection: true },
      );
      if (result?.status === 'error') throw new Error(result.message || 'The form could not be saved.');
    } catch (failure) {
      if (isCurrent()) setFormError(message(failure));
    } finally {
      if (isCurrent()) {
        formBusy.current = false;
        setOpening(false);
        // Local edits do not change the server revision; even cancellation must re-query.
        await refresh();
      }
    }
  };

  return { api, registrations, followUps, loading, error, formError, opening, refresh, openForm };
}
