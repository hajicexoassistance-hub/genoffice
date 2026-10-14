/**
 * PluginRibbonTab — injects a plugin tab into the Docs ribbon bar.
 *
 * Uses createPortal to mount the tab button into #plugin-ribbon-tab-slot,
 * and the tab panel content into #plugin-ribbon-panel-slot.
 * Both slot divs must be rendered by the Docs Ribbon component.
 */
import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { DocxPluginContext, DocxPluginManifest } from '../types'

interface Props {
  manifest: DocxPluginManifest
  active: boolean
  context: DocxPluginContext
  onActivate: (active: boolean) => void
}

export function PluginRibbonTab({ manifest, active, context, onActivate }: Props) {
  const { ribbon } = manifest
  if (!ribbon) return null

  const RibbonComponent = ribbon.component
  const tabSlot = document.getElementById('plugin-ribbon-tab-slot')
  const panelSlot = document.getElementById('plugin-ribbon-panel-slot')

  // When a native tab is selected in Ribbon.tsx, deactivate this plugin tab
  useEffect(() => {
    const handleNativeTab = () => {
      if (active) onActivate(false)
    }
    window.addEventListener('genoffice:ribbon-native-tab', handleNativeTab)
    return () => window.removeEventListener('genoffice:ribbon-native-tab', handleNativeTab)
  }, [active, onActivate])

  const handleTabClick = () => {
    if (!active) {
      onActivate(true)
      window.dispatchEvent(
        new CustomEvent('genoffice:ribbon-request-tab', {
          detail: { tab: `plugin:${manifest.id}` },
        }),
      )
    } else {
      onActivate(false)
      window.dispatchEvent(
        new CustomEvent('genoffice:ribbon-request-tab', {
          detail: { tab: 'home' },
        }),
      )
    }
  }

  const handleClose = () => {
    onActivate(false)
    window.dispatchEvent(
      new CustomEvent('genoffice:ribbon-request-tab', {
        detail: { tab: 'home' },
      }),
    )
  }

  return (
    <>
      {/* Tab button — injected into the ribbon tab strip */}
      {tabSlot &&
        createPortal(
          <button
            className={`ribbon-tab plugin-ribbon-tab${active ? ' active' : ''}`}
            onClick={handleTabClick}
            aria-selected={active}
            role="tab"
            data-plugin-id={manifest.id}
          >
            {ribbon.icon && (
              <span className="plugin-ribbon-tab-icon" aria-hidden>
                {ribbon.icon}
              </span>
            )}
            <span className="plugin-ribbon-tab-label">{ribbon.label}</span>
          </button>,
          tabSlot,
        )}

      {/* Tab panel content — shown when active */}
      {panelSlot &&
        active &&
        createPortal(
          <div
            className="plugin-ribbon-panel"
            role="tabpanel"
            data-plugin-id={manifest.id}
            aria-label={`${ribbon.label} tab`}
          >
            <RibbonComponent context={context} onClose={handleClose} />
          </div>,
          panelSlot,
        )}
    </>
  )
}

