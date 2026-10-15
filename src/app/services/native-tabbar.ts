import { registerPlugin, PluginListenerHandle } from '@capacitor/core';

export interface TabEntry { id: string; title: string; icon: string; color?: string; }   // icon: nombre de SF Symbol; color: 'rgb(r, g, b)'

/** Barra de pestañas nativa de iOS (plugin local NativeTabBar.swift). Solo existe en la app de iPhone/iPad. */
export interface NativeTabBarPlugin {
  /** lateral: barra lateral de iPad (items arriba, more abajo) en vez de pestañas; devuelve el ancho que ocupa. */
  show(o: { items: TabEntry[]; more: TabEntry[]; selected?: string; lateral?: boolean }): Promise<{ height: number; width: number }>;
  hide(): Promise<void>;
  select(o: { id: string }): Promise<void>;
  addListener(ev: 'tabSelected', fn: (e: { id: string }) => void): Promise<PluginListenerHandle>;
  addListener(ev: 'anchoLateral', fn: (e: { width: number }) => void): Promise<PluginListenerHandle>;
}

export const NativeTabBar = registerPlugin<NativeTabBarPlugin>('NativeTabBar');
