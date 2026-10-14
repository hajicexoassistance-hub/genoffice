/**
 * PluginRibbonTab — injects a plugin tab into the PDF ribbon bar.
 *
 * Uses createPortal to mount the tab button into #plugin-ribbon-tab-slot,
 * and the tab panel content into #plugin-ribbon-panel-slot.
 */
import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { PdfPluginContext, PdfPluginManifest } from '../types'

interface Props {
  manifest: PdfPluginManifest
  active: boolean
  context: PdfPluginContext
  onActivate: (active: boolean) => void
}

export function PluginRibbonTab({ manifest, active, context, onActivate }: Props) {
  const { ribbon } = manifest
  if (!ribbon) return null

  const RibbonComponent = ribbon.component
  const tabSlot = document.getElementById('plugin-ribbon-tab-slot')
  const panelSlot = document.getElementById('plugin-ribbon-panel-slot')

  // When a native ribbon tab is clicked in App.tsx, deactivate this plugin tab
  useEffect(() => {
    const handleNativeTab = () => {
      if (active) onActivate(false)
    }
    window.addEventListener('genoffice:pdf-ribbon-native-tab', handleNativeTab)
    return () => window.removeEventListener('genoffice:pdf-ribbon-native-tab', handleNativeTab)
  }, [active, onActivate])

  const handleTabClick = () => {
    if (!active) {
      onActivate(true)
      window.dispatchEvent(
        new CustomEvent('genoffice:pdf-ribbon-request-tab', {
          detail: { tab: `plugin:${manifest.id}` },
        }),
      )
    } else {
      onActivate(false)
      window.dispatchEvent(
        new CustomEvent('genoffice:pdf-ribbon-request-tab', {
          detail: { tab: 'home' },
        }),
      )
    }
  }

  const handleClose = () => {
    onActivate(false)
    window.dispatchEvent(
      new CustomEvent('genoffice:pdf-ribbon-request-tab', {
        detail: { tab: 'home' },
      }),
    )
  }

  return (
    <>
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
