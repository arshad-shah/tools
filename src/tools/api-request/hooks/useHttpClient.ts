import { useMemo, useRef, useState } from 'react';
import { newId } from '@/shared/lib/id';
import { notify } from '@/shared/lib/notify';
import { useJob } from '@/shared/state/useJob';
import {
  addCollection,
  addRequest,
  deleteNode,
  findRequest,
  replaceRequest,
} from '../lib/collections';
import {
  toHttpRequest,
  toStoredRequest,
  type Folder,
} from '../lib/collections-migrate';
import { parseCurl } from '../lib/curl';
import {
  envVars,
  toStoredEnvironments,
  withSessionSecrets,
  type Environment,
} from '../lib/env';
import {
  pushHistory,
  toPersistedHistory,
  type HistoryItem,
} from '../lib/history';
import { emptyRequest, type HttpRequest } from '../lib/model';
import { sendHttp, type SendResult } from '../lib/send';
import { timingFor, type TimingBreakdown } from '../lib/timing';
import { httpSettings } from '../settings';

export interface Sent extends SendResult {
  timing: TimingBreakdown | null;
  /** The previous body of the same method and URL, for Compare. */
  previousText?: string;
  request: HttpRequest;
}

const requestKey = (r: HttpRequest) => `${r.mode} ${r.method} ${r.url}`;

/** All HTTP Client state: the edited request, collections, environments, history, sends. */
export function useHttpClient() {
  const [settings, update] = httpSettings.useSettings();
  const [request, setRequest] = useState<HttpRequest>(() =>
    emptyRequest({ url: 'https://jsonplaceholder.typicode.com/users' }),
  );
  const [savedId, setSavedId] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>(() => settings.history);
  const lastBodies = useRef(new Map<string, string>());
  const [sent, setSent] = useState<Sent | null>(null);

  // Environments with this session's secret values put back.
  const [envVersion, setEnvVersion] = useState(0);
  const environments = useMemo(
    () => withSessionSecrets(settings.environments),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- envVersion re-reads session secrets
    [settings.environments, envVersion],
  );
  const activeEnv = environments.find((e) => e.id === settings.activeEnv);
  const vars = useMemo(() => envVars(activeEnv), [activeEnv]);

  const saveEnvironments = (envs: Environment[]) => {
    update({ environments: toStoredEnvironments(envs) });
    setEnvVersion((v) => v + 1);
  };

  const job = useJob(
    async (
      ctx,
      req: HttpRequest,
      v: Record<string, string>,
      timeoutMs: number,
    ) => sendHttp(req, v, { signal: ctx.signal, timeoutMs }),
  );

  const send = async () => {
    const req = request;
    const started = Date.now();
    const result = await job.run(req, vars, settings.timeoutMs);
    const status = result?.response.status ?? 0;
    const item: HistoryItem = {
      id: newId(),
      at: started,
      mode: req.mode,
      method: req.mode === 'graphql' ? 'POST' : req.method,
      url: req.url,
      status,
      durationMs: result?.durationMs ?? Date.now() - started,
      size: result?.response.size ?? 0,
      request: req,
    };
    setHistory((h) => {
      const next = pushHistory(h, item);
      if (settings.historyPersist)
        update({ history: toPersistedHistory(next) });
      return next;
    });
    if (!result) return;
    const key = requestKey(req);
    const previousText = lastBodies.current.get(key);
    if (result.response.text !== undefined)
      lastBodies.current.set(key, result.response.text);
    setSent({
      ...result,
      timing: timingFor(result.url),
      previousText,
      request: req,
    });
  };

  const setHistoryPersist = (on: boolean) =>
    update({
      historyPersist: on,
      history: on ? toPersistedHistory(history) : [],
    });
  const clearHistory = () => {
    setHistory([]);
    update({ history: [] });
  };

  const importCurl = (text: string): boolean => {
    try {
      const { request: r, warnings } = parseCurl(text);
      setRequest(r);
      setSavedId(null);
      notify.success('Imported from cURL');
      if (warnings.length) notify.info(warnings.join('. '));
      return true;
    } catch (e) {
      notify.error(e instanceof Error ? e.message : 'Not a cURL command');
      return false;
    }
  };

  const collections = settings.collections;
  const setCollections = (c: Folder[]) => update({ collections: c });

  const open = (id: string) => {
    const saved = findRequest(collections, id);
    if (!saved) return;
    setRequest(toHttpRequest(saved.request));
    setSavedId(id);
  };

  const saveAs = (name: string, folderId: string | null) => {
    const id = newId();
    setCollections(
      addRequest(collections, folderId, {
        id,
        type: 'request',
        name: name.trim() || 'Request',
        request: toStoredRequest(request),
      }),
    );
    setSavedId(id);
    notify.success('Request saved');
  };

  const saveCurrent = (): boolean => {
    const saved = savedId ? findRequest(collections, savedId) : null;
    if (!saved) return false;
    setCollections(
      replaceRequest(collections, {
        ...saved,
        request: toStoredRequest(request),
      }),
    );
    notify.success('Request saved');
    return true;
  };

  return {
    settings,
    update,
    request,
    setRequest,
    savedId,
    setSavedId,
    collections,
    setCollections,
    open,
    saveAs,
    saveCurrent,
    addCollection: (name: string) =>
      setCollections(addCollection(collections, name)),
    remove: (id: string) => {
      setCollections(deleteNode(collections, id));
      if (id === savedId) setSavedId(null);
    },
    environments,
    activeEnv,
    vars,
    saveEnvironments,
    history,
    setHistoryPersist,
    clearHistory,
    job,
    send,
    sent,
    importCurl,
  };
}

export type HttpClientState = ReturnType<typeof useHttpClient>;
