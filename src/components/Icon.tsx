import { createElement, useEffect, useSyncExternalStore } from 'react'
import { getIconSync, loadIcon, subscribeIcons, type IconProps } from '../icons'

/** Renders any icon id; non-curated ones load lazily and appear when ready. */
export function Icon({ id, ...props }: IconProps & { id: string }) {
  const Comp = useSyncExternalStore(subscribeIcons, () => getIconSync(id))
  useEffect(() => {
    if (!Comp) void loadIcon(id)
  }, [id, Comp])
  return Comp ? createElement(Comp, props) : null
}
