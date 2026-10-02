import { Activity, useState, type ReactNode } from 'react';
import { useLocation, useOutlet } from 'react-router-dom';

/** Pages kept alive (hidden) after you leave them. */
const MAX = 5;

interface Entry {
  path: string;
  /** Bumped when the page must start fresh (a hand-off or share link). */
  version: number;
  element: ReactNode;
}

/**
 * Outlet that keeps the last few pages mounted but hidden (React
 * Activity), so going back to a tool finds its inputs, results and scroll
 * as you left them (6-H navigation). Nothing is written to storage. Hidden
 * pages run no effects, so their commands and shortcuts are unregistered.
 * A hand-off (`?handoff=`) or share link (`#s=`) always mounts the page
 * fresh, because tools read those once when they mount.
 */
export function KeepAliveOutlet() {
  const outlet = useOutlet();
  const { pathname, search, hash } = useLocation();
  const fresh = /[?&]handoff=/.test(search) || hash.startsWith('#s=');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [seen, setSeen] = useState({ pathname, search, hash });

  const arrived =
    seen.pathname !== pathname || seen.search !== search || seen.hash !== hash;
  let list = entries;
  const at = list.findIndex((e) => e.path === pathname);
  if (at < 0 || (arrived && fresh)) {
    const version = at < 0 ? 0 : list[at].version + 1;
    list = [
      ...list.filter((e) => e.path !== pathname),
      { path: pathname, version, element: outlet },
    ].slice(-MAX);
  }
  if (list !== entries) setEntries(list);
  if (arrived) setSeen({ pathname, search, hash });

  return list.map((e) => {
    const active = e.path === pathname;
    return (
      <Activity
        key={`${e.path}#${e.version}`}
        mode={active ? 'visible' : 'hidden'}
      >
        {active ? outlet : e.element}
      </Activity>
    );
  });
}
