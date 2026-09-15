// @vitest-environment happy-dom
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import useObservations from './useObservations';
import config from './theme.json';

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

let root, container, current, bridge;

function Harness({ entityId }) {
  current = useObservations(entityId);
  return null;
}

async function mount(entityId) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root.render(createElement(Harness, { entityId })));
}

async function unmount() {
  if (!root) return;
  await act(async () => root.unmount());
  root = null;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
  bridge = {
    getObservationsByQuery: vi.fn().mockResolvedValue([]),
    openFormplayer: vi.fn().mockResolvedValue({ status: 'saved' }),
  };
  vi.stubGlobal('getFormulus', vi.fn().mockResolvedValue(bridge));
  vi.stubGlobal('onReceiveFocus', undefined);
  vi.stubGlobal('formulusCallbacks', {});
});

afterEach(async () => {
  await unmount();
  container?.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('useObservations refresh', () => {
  it.each(['saved', 'cancelled'])('re-queries both lists after a %s form closes', async (status) => {
    const form = deferred();
    bridge.openFormplayer.mockReturnValue(form.promise);
    await mount('entity-1');
    expect(bridge.getObservationsByQuery).toHaveBeenCalledTimes(2);
    bridge.getObservationsByQuery.mockClear();
    const records = [{ id: 'updated' }];
    const older = { id: 'older', createdAt: '2026-01-01' };
    const newer = { id: 'newer', createdAt: '2026-02-01' };
    bridge.getObservationsByQuery.mockResolvedValueOnce(records).mockResolvedValueOnce([older, newer]);
    let opening;
    await act(async () => { opening = current.openForm(config.followUpForm, { entity_id: 'entity-1' }); });
    expect(current.opening).toBe(true);
    expect(bridge.getObservationsByQuery).not.toHaveBeenCalled();
    expect(bridge.openFormplayer).toHaveBeenCalledWith(
      config.followUpForm, { defaultData: { entity_id: 'entity-1' } }, {}, { skipDraftSelection: true },
    );
    await act(async () => { form.resolve({ status }); await opening; });
    expect(bridge.getObservationsByQuery.mock.calls).toEqual([
      [{ formType: config.registrationForm, isDraft: false, includeDeleted: false }],
      [{ formType: config.followUpForm, isDraft: false, includeDeleted: false,
        filter: { field: 'data.entity_id', op: 'eq', value: 'entity-1' } }],
    ]);
    expect(current.registrations).toEqual(records);
    expect(current.followUps).toEqual([newer, older]);
    expect(current.opening).toBe(false);
    expect(current.loading).toBe(false);
  });

  it('refreshes for the first revision and changes, but not unchanged or invalid revisions', async () => {
    bridge.getCurrentDataRevisionCount = vi.fn().mockResolvedValue(10);
    await mount();
    expect(bridge.getCurrentDataRevisionCount).toHaveBeenCalledTimes(1);
    expect(bridge.getObservationsByQuery).toHaveBeenCalledTimes(2);
    bridge.getObservationsByQuery.mockClear();
    await act(async () => vi.advanceTimersByTimeAsync(5000));
    expect(bridge.getObservationsByQuery).not.toHaveBeenCalled();
    bridge.getCurrentDataRevisionCount.mockResolvedValue(11);
    await act(async () => vi.advanceTimersByTimeAsync(5000));
    expect(bridge.getObservationsByQuery).toHaveBeenCalledTimes(1);
    for (const revision of [-1, NaN, undefined]) {
      bridge.getCurrentDataRevisionCount.mockResolvedValue(revision);
      await act(async () => vi.advanceTimersByTimeAsync(5000));
    }
    expect(bridge.getObservationsByQuery).toHaveBeenCalledTimes(1);
  });

  it('refreshes on browser focus and becoming visible, but not while hidden', async () => {
    await mount();
    bridge.getObservationsByQuery.mockClear();
    await act(async () => window.dispatchEvent(new Event('focus')));
    expect(bridge.getObservationsByQuery).toHaveBeenCalledTimes(1);
    vi.mocked(Object.getOwnPropertyDescriptor(document, 'visibilityState').get).mockReturnValue('hidden');
    await act(async () => {
      window.dispatchEvent(new Event('focus'));
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(bridge.getObservationsByQuery).toHaveBeenCalledTimes(1);
    vi.mocked(Object.getOwnPropertyDescriptor(document, 'visibilityState').get).mockReturnValue('visible');
    await act(async () => document.dispatchEvent(new Event('visibilitychange')));
    expect(bridge.getObservationsByQuery).toHaveBeenCalledTimes(2);
  });

  it('chains both host focus callbacks and restores them on cleanup', async () => {
    const previousWindow = vi.fn().mockReturnValue('window result');
    const previousCallback = vi.fn().mockReturnValue('callback result');
    window.onReceiveFocus = previousWindow;
    window.formulusCallbacks.onReceiveFocus = previousCallback;
    await mount();
    const wrappedWindow = window.onReceiveFocus;
    const wrappedCallback = window.formulusCallbacks.onReceiveFocus;
    bridge.getObservationsByQuery.mockClear();
    const receiver = {};
    await act(async () => {
      expect(wrappedWindow.call(receiver, 'a')).toBe('window result');
    });
    await act(async () => {
      expect(wrappedCallback.call(receiver, 'b')).toBe('callback result');
    });
    expect(previousWindow).toHaveBeenCalledWith('a');
    expect(previousWindow.mock.contexts[0]).toBe(receiver);
    expect(previousCallback).toHaveBeenCalledWith('b');
    expect(bridge.getObservationsByQuery).toHaveBeenCalledTimes(2);
    await unmount();
    expect(window.onReceiveFocus).toBe(previousWindow);
    expect(window.formulusCallbacks.onReceiveFocus).toBe(previousCallback);
    bridge.getObservationsByQuery.mockClear();
    wrappedWindow();
    wrappedCallback();
    window.dispatchEvent(new Event('focus'));
    document.dispatchEvent(new Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(10000);
    expect(vi.getTimerCount()).toBe(0);
    expect(bridge.getObservationsByQuery).not.toHaveBeenCalled();
  });

  it.each(['resolve', 'reject'])('ignores a stale query that later %ss', async (settle) => {
    await mount();
    const stale = deferred();
    const latest = deferred();
    bridge.getObservationsByQuery.mockReturnValueOnce(stale.promise).mockReturnValueOnce(latest.promise);
    let first, second;
    await act(async () => { first = current.refresh(); });
    await act(async () => { second = current.refresh(); });
    await act(async () => {
      stale[settle](settle === 'resolve' ? [{ id: 'stale' }] : new Error('stale failure'));
      await first;
    });
    expect(current.loading).toBe(true);
    expect(current.registrations).toEqual([]);
    expect(current.error).toBe('');
    await act(async () => { latest.resolve([{ id: 'latest' }]); await second; });
    expect(current.registrations).toEqual([{ id: 'latest' }]);
    expect(current.loading).toBe(false);
  });

  it('does not let an older response overwrite a completed newer refresh', async () => {
    await mount();
    const stale = deferred();
    bridge.getObservationsByQuery.mockReturnValueOnce(stale.promise).mockResolvedValueOnce([{ id: 'latest' }]);
    let first;
    await act(async () => { first = current.refresh(); });
    await act(async () => current.refresh());
    await act(async () => { stale.resolve([{ id: 'stale' }]); await first; });
    expect(current.registrations).toEqual([{ id: 'latest' }]);
    expect(current.loading).toBe(false);
  });

  it('ignores pending revision and form completions after unmount', async () => {
    const revision = deferred();
    const form = deferred();
    bridge.getCurrentDataRevisionCount = vi.fn().mockReturnValue(revision.promise);
    bridge.openFormplayer.mockReturnValue(form.promise);
    await mount();
    let opening;
    await act(async () => { opening = current.openForm(config.registrationForm); });
    await unmount();
    bridge.getObservationsByQuery.mockClear();
    await act(async () => {
      revision.resolve(20);
      form.resolve({ status: 'saved' });
      await opening;
    });
    await vi.advanceTimersByTimeAsync(10000);
    expect(bridge.getObservationsByQuery).not.toHaveBeenCalled();
    expect(bridge.getCurrentDataRevisionCount).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
});
