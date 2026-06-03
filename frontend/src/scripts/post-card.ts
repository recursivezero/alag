import { getStoredUser } from "../stores/userStore"
import { deletePost as apiDeletePost, togglePostLike, togglePostSave } from "../services/postService"

// Idempotent init
if (!(window as any).__postCardInitialized) {
  ;(window as any).__postCardInitialized = true

  const toastsContainerId = 'post-card-toast-container'

  const ensureToastsContainer = () => {
    let c = document.getElementById(toastsContainerId)
    if (!c) {
      c = document.createElement('div')
      c.id = toastsContainerId
      Object.assign(c.style, {
        position: 'fixed',
        top: '1rem',
        right: '1rem',
        zIndex: '9999',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        alignItems: 'flex-end',
        pointerEvents: 'none',
      })
      document.body.appendChild(c)
    }
    return c
  }

  const showToast = (text: string, type: 'success' | 'error' = 'success', timeout = 4000) => {
    const c = ensureToastsContainer()
    const t = document.createElement('div')
    t.className = `post-card-toast post-card-toast-${type}`
    t.setAttribute('role', 'status')
    t.setAttribute('aria-live', 'polite')
    Object.assign(t.style, {
      pointerEvents: 'auto',
      minWidth: '220px',
      maxWidth: '360px',
      background: type === 'success' ? 'rgba(16,185,129,0.95)' : 'rgba(239,68,68,0.95)',
      color: '#fff',
      padding: '0.6rem 0.75rem',
      borderRadius: '10px',
      boxShadow: '0 8px 30px rgba(2,6,23,0.4)',
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
    })

    const txt = document.createElement('div')
    txt.style.flex = '1'
    txt.textContent = text

    const closeBtn = document.createElement('button')
    closeBtn.setAttribute('aria-label', 'Close')
    Object.assign(closeBtn.style, {
      background: 'transparent',
      border: 'none',
      color: 'inherit',
      cursor: 'pointer',
      fontWeight: 700,
    })
    closeBtn.textContent = '×'
    closeBtn.addEventListener('click', () => {
      t.remove()
    })

    t.appendChild(txt)
    t.appendChild(closeBtn)
    c.appendChild(t)

    if (timeout > 0) {
      setTimeout(() => t.remove(), timeout)
    }
  }

  const openMenu = (menu: HTMLElement, btn: HTMLElement) => {
    menu.classList.remove('invisible', 'opacity-0')
    menu.classList.remove('translate-y-1')
    menu.classList.add('visible', 'opacity-100', 'translate-y-0')
    menu.setAttribute('aria-hidden', 'false')
    btn.setAttribute('aria-expanded', 'true')
  }

  const closeMenu = (menu: HTMLElement, btn: HTMLElement) => {
    menu.classList.add('invisible', 'opacity-0')
    menu.classList.remove('visible', 'opacity-100', 'translate-y-0')
    menu.classList.add('translate-y-1')
    menu.setAttribute('aria-hidden', 'true')
    btn.setAttribute('aria-expanded', 'false')
  }

  const openModal = (modal: HTMLElement) => {
    modal.classList.remove('pointer-events-none', 'invisible', 'opacity-0')
    modal.classList.add('visible', 'opacity-100')
    const confirm = modal.querySelector('[data-delete-confirm]') as HTMLElement | null
    confirm?.focus()
  }

  const closeModal = (modal: HTMLElement) => {
    modal.classList.add('pointer-events-none', 'invisible', 'opacity-0')
    modal.classList.remove('visible', 'opacity-100')
  }

  const normalizeComparableValue = (value: unknown) => {
    if (value === null || value === undefined) return ''
    return String(value).trim().toLowerCase()
  }

  const getStoredUserProfile = () => getStoredUser()

  const getOwnershipState = (card: HTMLElement) => {
    const storedUser = getStoredUserProfile()
    const currentUserId = storedUser?.id ?? null
    const currentUsername = storedUser?.username ?? storedUser?.name ?? null
    const currentEmail = storedUser?.email ?? null

    const authorId = card.getAttribute('data-post-author-id')
    const authorUsername = card.getAttribute('data-post-author-username')
    const authorEmail = card.getAttribute('data-post-author-email')

    const normalizedCurrentUserId = normalizeComparableValue(currentUserId)
    const normalizedCurrentUsername = normalizeComparableValue(currentUsername)
    const normalizedCurrentEmail = normalizeComparableValue(currentEmail)
    const normalizedAuthorId = normalizeComparableValue(authorId)
    const normalizedAuthorUsername = normalizeComparableValue(authorUsername)
    const normalizedAuthorEmail = normalizeComparableValue(authorEmail)

    const comparablePairs = [
      [normalizedCurrentUserId, normalizedAuthorId],
      [normalizedCurrentUsername, normalizedAuthorUsername],
      [normalizedCurrentEmail, normalizedAuthorEmail],
    ] as const

    const hasComparablePair = comparablePairs.some(
      ([current, author]) => current !== '' && author !== '',
    )

    const isOwner = comparablePairs.some(
      ([current, author]) => current !== '' && author !== '' && current === author,
    )

    const isIndeterminate = !hasComparablePair

    console.log('[post-card ownership]', {
      currentUserId,
      currentUsername,
      currentEmail,
      postOwnerId: authorId,
      postOwnerUsername: authorUsername,
      postOwnerEmail: authorEmail,
      normalizedCurrentUserId,
      normalizedCurrentUsername,
      normalizedCurrentEmail,
      normalizedPostOwnerId: normalizedAuthorId,
      normalizedPostOwnerUsername: normalizedAuthorUsername,
      normalizedPostOwnerEmail: normalizedAuthorEmail,
      ownershipResult: {
        isOwner,
        isIndeterminate,
        shouldRenderMenu: isOwner || isIndeterminate,
      },
    })

    return {
      isOwner,
      isIndeterminate,
      shouldRenderMenu: isOwner || isIndeterminate,
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // LIKE BUTTON HELPERS
  // ─────────────────────────────────────────────────────────────────

  const LIKED_BTN_CLASSES   = ['bg-rose-500/10', 'text-rose-300']
  const UNLIKED_BTN_CLASSES = [
    'text-[color:var(--dashboard-muted)]',
    'hover:bg-white/[0.04]',
    'hover:text-white',
    'hover:shadow-[0_8px_20px_rgba(0,0,0,0.08)]',
  ]

  const formatCounter = (n: number): string => {
    if (n >= 1000) return `${Math.round(n / 100) / 10}k`
    return String(n)
  }

  /**
   * Parse a formatted counter string ("12", "1.2k") back to a plain number.
   */
  const parseCounter = (raw: string): number => {
    const t = raw.trim()
    if (t.endsWith('k')) return Math.round(parseFloat(t) * 1000)
    return parseInt(t, 10) || 0
  }

  /**
   * Write a counter value back into a button's text node (last text node).
   * Falls back to a [data-*-count] span if no text node exists.
   */
  const writeCounterText = (btn: HTMLElement, value: number, dataAttr: string) => {
    const textNodes = Array.from(btn.childNodes).filter((n) => n.nodeType === Node.TEXT_NODE)
    if (textNodes.length) {
      textNodes[textNodes.length - 1].textContent = ` ${formatCounter(value)}`
    } else {
      let el = btn.querySelector(`[${dataAttr}]`) as HTMLElement | null
      if (!el) {
        el = document.createElement('span')
        el.setAttribute(dataAttr, '')
        btn.appendChild(el)
      }
      el.textContent = formatCounter(value)
    }
  }

  const applyLikeState = (btn: HTMLElement, liked: boolean, likeCount: number) => {
    btn.setAttribute('aria-pressed', liked ? 'true' : 'false')

    if (liked) {
      UNLIKED_BTN_CLASSES.forEach((cls) => btn.classList.remove(cls))
      LIKED_BTN_CLASSES.forEach((cls) => btn.classList.add(cls))
    } else {
      LIKED_BTN_CLASSES.forEach((cls) => btn.classList.remove(cls))
      UNLIKED_BTN_CLASSES.forEach((cls) => btn.classList.add(cls))
    }

    const svg = btn.querySelector('svg')
    if (svg) svg.setAttribute('fill', liked ? 'currentColor' : 'none')

    writeCounterText(btn, likeCount, 'data-like-count')
  }

  // ─────────────────────────────────────────────────────────────────
  // SAVE BUTTON HELPERS
  // The save button uses violet instead of rose, and shows "Save" text
  // (no numeric counter — matches PostCard.astro).
  // ─────────────────────────────────────────────────────────────────

  const SAVED_BTN_CLASSES   = ['bg-violet-500/10', 'text-violet-300']
  const UNSAVED_BTN_CLASSES = [
    'text-[color:var(--dashboard-muted)]',
    'hover:bg-white/[0.04]',
    'hover:text-white',
    'hover:shadow-[0_8px_20px_rgba(0,0,0,0.08)]',
  ]

  /**
   * Update the save button's visual state without a page reload.
   * The save button shows no counter — only fill state and colour change.
   */
  const applySaveState = (btn: HTMLElement, saved: boolean) => {
    btn.setAttribute('aria-pressed', saved ? 'true' : 'false')

    if (saved) {
      UNSAVED_BTN_CLASSES.forEach((cls) => btn.classList.remove(cls))
      SAVED_BTN_CLASSES.forEach((cls) => btn.classList.add(cls))
    } else {
      SAVED_BTN_CLASSES.forEach((cls) => btn.classList.remove(cls))
      UNSAVED_BTN_CLASSES.forEach((cls) => btn.classList.add(cls))
    }

    // Toggle bookmark SVG fill
    const svg = btn.querySelector('svg')
    if (svg) svg.setAttribute('fill', saved ? 'currentColor' : 'none')
  }

  // ─────────────────────────────────────────────────────────────────
  // BIND CARD
  // ─────────────────────────────────────────────────────────────────

  const bindCard = (card: HTMLElement) => {
    const slug = card.getAttribute('data-post-slug')
    if (!slug) return

    const menuBtn    = card.querySelector('[data-post-menu-btn]') as HTMLElement | null
    const menu       = card.querySelector('[data-post-menu]')     as HTMLElement | null
    const menuDelete = card.querySelector('[data-post-menu-delete]') as HTMLElement | null
    const menuCancel = card.querySelector('[data-post-menu-cancel]') as HTMLElement | null
    const modal      = document.getElementById(`delete-modal-${slug}`) as HTMLElement | null

    // ── All aria-pressed buttons in this card ────────────────────
    // PostCard.astro layout (confirmed):
    //   Left action group:  [like btn aria-pressed] [comment btn — no aria-pressed]
    //   Right action group: [save btn aria-pressed] [share btn — no aria-pressed]
    const allToggleBtns = Array.from(
      card.querySelectorAll<HTMLButtonElement>('button[aria-pressed]'),
    )
    const likeBtn = allToggleBtns[0] ?? null   // first  aria-pressed → like (heart)
    const saveBtn = allToggleBtns[1] ?? null   // second aria-pressed → save (bookmark)

    // ── Like button ──────────────────────────────────────────────

    if (likeBtn) {
      let likeInProgress = false

      likeBtn.addEventListener('click', async () => {
        if (likeInProgress) return

        const wasLiked    = likeBtn.getAttribute('aria-pressed') === 'true'
        const currentCount = parseCounter(likeBtn.textContent ?? '0')
        const optimistic   = wasLiked ? Math.max(0, currentCount - 1) : currentCount + 1

        applyLikeState(likeBtn, !wasLiked, optimistic)
        likeInProgress  = true
        likeBtn.disabled = true

        try {
          const result = await togglePostLike(slug)
          applyLikeState(likeBtn, result.liked, result.likeCount)
        } catch (err: any) {
          applyLikeState(likeBtn, wasLiked, currentCount)
          showToast(err?.message || 'Unable to toggle like', 'error')
        } finally {
          likeInProgress  = false
          likeBtn.disabled = false
        }
      })
    }

    // ── Save button ──────────────────────────────────────────────
    // The save button shows no counter — only icon fill + colour toggle.

    if (saveBtn) {
      let saveInProgress = false

      saveBtn.addEventListener('click', async () => {
        if (saveInProgress) return

        const wasSaved = saveBtn.getAttribute('aria-pressed') === 'true'

        // Optimistic update — immediate visual feedback
        applySaveState(saveBtn, !wasSaved)
        saveInProgress  = true
        saveBtn.disabled = true

        try {
          const result = await togglePostSave(slug)
          // Apply authoritative state from the server
          applySaveState(saveBtn, result.saved)
        } catch (err: any) {
          // Roll back on failure
          applySaveState(saveBtn, wasSaved)
          showToast(err?.message || 'Unable to toggle save', 'error')
        } finally {
          saveInProgress  = false
          saveBtn.disabled = false
        }
      })
    }

    // ── Menu / delete (unchanged) ────────────────────────────────

    if (!menuBtn || !menu) return

    let menuOpen = false

    const syncMenuVisibility = () => {
      const menuWrapper = menuBtn.parentElement as HTMLElement | null
      if (!menuWrapper) return

      const ownershipState = getOwnershipState(card)
      menuWrapper.style.display = ownershipState.shouldRenderMenu ? '' : 'none'

      if (!ownershipState.shouldRenderMenu && menuOpen) {
        menuOpen = false
        closeMenu(menu, menuBtn)
      }
    }

    syncMenuVisibility()

    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      const ownershipState = getOwnershipState(card)
      if (!ownershipState.shouldRenderMenu) {
        syncMenuVisibility()
        return
      }

      menuOpen = !menuOpen
      if (menuOpen) openMenu(menu, menuBtn)
      else closeMenu(menu, menuBtn)
    })

    menuCancel?.addEventListener('click', (e) => {
      e.stopPropagation()
      menuOpen = false
      closeMenu(menu, menuBtn)
    })

    document.addEventListener('click', (event) => {
      if (!menuOpen) return
      if (event.target instanceof Node && !menu.contains(event.target) && event.target !== menuBtn) {
        menuOpen = false
        closeMenu(menu, menuBtn)
      }
    })

    document.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape') {
        if (menuOpen) {
          menuOpen = false
          closeMenu(menu, menuBtn)
        }
        if (modal && !modal.classList.contains('pointer-events-none')) {
          closeModal(modal)
        }
      }
    })

    menuDelete?.addEventListener('click', (e) => {
      e.stopPropagation()
      if (modal) openModal(modal)
      menuOpen = false
      closeMenu(menu, menuBtn)
    })

    if (!modal) return

    document.addEventListener('alag-user-profile-updated', syncMenuVisibility as EventListener)
    window.addEventListener('storage', (event) => {
      if (event.key === 'alag-user-profile') {
        syncMenuVisibility()
      }
    })

    const cancelBtn  = modal.querySelector('[data-delete-cancel]')  as HTMLButtonElement | null
    const confirmBtn = modal.querySelector('[data-delete-confirm]') as HTMLButtonElement | null

    cancelBtn?.addEventListener('click', () => {
      closeModal(modal)
    })

    let inProgress = false

    confirmBtn?.addEventListener('click', async () => {
      if (inProgress) return
      inProgress = true
      confirmBtn.disabled = true
      const originalText = confirmBtn.textContent
      confirmBtn.textContent = 'Deleting...'

      try {
        await apiDeletePost(slug)
      } catch (err: any) {
        showToast(err?.message || 'Unable to delete post', 'error')
        inProgress = false
        confirmBtn.disabled = false
        confirmBtn.textContent = originalText || 'Delete Post'
        return
      }

      document.querySelectorAll(`[data-post-slug="${slug}"]`).forEach((el) => el.remove())
      window.dispatchEvent(new CustomEvent('post-deleted', { detail: { slug } }))
      showToast('Post deleted successfully', 'success')
      closeModal(modal)

      inProgress = false
      confirmBtn.disabled = false
      confirmBtn.textContent = originalText || 'Delete Post'
    })
  }

  const cards = Array.from(document.querySelectorAll<HTMLElement>('[data-post-card]'))
  cards.forEach(bindCard)
}