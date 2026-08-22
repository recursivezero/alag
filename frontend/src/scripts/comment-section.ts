import { submitComment } from '../services/postService'

if (!(window as any).__commentSectionInitialized) {
  ;(window as any).__commentSectionInitialized = true

  const formatDate = (iso: string): string => {
    try {
      return new Date(iso).toLocaleDateString()
    } catch {
      return ''
    }
  }

  const buildCommentHTML = (
    authorName: string,
    authorPicture: string | null,
    createdAt: string,
    body: string,
  ): string => {
    const avatarSrc = authorPicture || '/icon.png'
    const escapedBody = body
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')

    return `
      <article
        data-comment-item
        class="flex gap-3 rounded-[22px] border border-[color:var(--dashboard-border)] bg-white/5 p-4"
        style="animation: feedIn 0.3s ease forwards"
      >
        <img
          src="${avatarSrc}"
          alt="${authorName}"
          class="h-8 w-8 shrink-0 rounded-full object-cover"
          onerror="this.src='/icon.png'"
        />
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <p class="text-sm font-semibold text-[color:var(--dashboard-text)]">
              ${authorName}
            </p>
            <span class="text-xs text-[color:var(--dashboard-muted)]">
              ${formatDate(createdAt)}
            </span>
          </div>
          <p class="mt-1 text-sm leading-6 text-[color:var(--dashboard-muted)]">
            ${escapedBody}
          </p>
        </div>
      </article>
    `.trim()
  }

  const updateCountDisplays = (
    countEl: HTMLElement | null,
    pillEl: HTMLElement | null,
    n: number,
  ) => {
    if (countEl) {
      countEl.textContent = `${n} ${n === 1 ? 'reply' : 'replies'}`
    }

    if (pillEl) {
      pillEl.textContent = `${n} comment${n === 1 ? '' : 's'}`
    }
  }

  const showError = (
    errorEl: HTMLElement | null,
    message: string,
  ) => {
    if (!errorEl) return

    errorEl.textContent = message
    errorEl.classList.remove('hidden')
  }

  const clearError = (errorEl: HTMLElement | null) => {
    if (!errorEl) return

    errorEl.textContent = ''
    errorEl.classList.add('hidden')
  }

  const initCommentSection = () => {
    const section = document.querySelector<HTMLElement>(
      '[data-comment-section]',
    )

    if (!section) {
      return
    }

    const slug = section.getAttribute('data-post-slug') ?? ''

    if (!slug) {
      return
    }

    const listEl =
      section.querySelector<HTMLElement>('[data-comments-list]')

    const countEl =
      section.querySelector<HTMLElement>('[data-comment-count]')

    const bodyEl =
      section.querySelector<HTMLTextAreaElement>('[data-comment-body]')

    const submitEl =
      section.querySelector<HTMLButtonElement>('[data-comment-submit]')

    const errorEl =
      section.querySelector<HTMLElement>('[data-comment-error]')

    const pillEl =
      document.querySelector<HTMLElement>('[data-post-comment-pill]')

    if (!bodyEl || !submitEl) {
      return
    }

    let inProgress = false

    const handleSubmit = async () => {
      if (inProgress) return

      clearError(errorEl)

      const body = bodyEl.value.trim()

      if (!body) {
        showError(errorEl, 'Please write something before posting.')
        bodyEl.focus()
        return
      }

      if (body.length > 1000) {
        showError(
          errorEl,
          `Comment is too long (${body.length}/1000 chars).`,
        )
        bodyEl.focus()
        return
      }

      inProgress = true
      submitEl.disabled = true

      const originalText =
        submitEl.textContent ?? 'Post'

      submitEl.textContent = 'Posting...'

      try {
        const { comment, commentCount } =
          await submitComment(slug, body)

        if (listEl) {
          const emptyPlaceholder =
            listEl.querySelector('[data-empty-comments]')

          emptyPlaceholder?.remove()

          const tempDiv = document.createElement('div')

          tempDiv.innerHTML = buildCommentHTML(
            comment.author.name,
            comment.author.picture ?? null,
            comment.createdAt,
            comment.body,
          )

          const newArticle = tempDiv.firstElementChild

          if (newArticle && listEl.firstChild) {
            listEl.insertBefore(
              newArticle,
              listEl.firstChild,
            )
          } else if (newArticle) {
            listEl.appendChild(newArticle)
          }
        }

        updateCountDisplays(
          countEl,
          pillEl,
          commentCount,
        )

        bodyEl.value = ''
      } catch (err: any) {
        showError(
          errorEl,
          err?.message ||
            'Unable to post comment. Please try again.',
        )
      } finally {
        inProgress = false
        submitEl.disabled = false
        submitEl.textContent = originalText
      }
    }

    submitEl.addEventListener('click', handleSubmit)

    bodyEl.addEventListener(
      'keydown',
      (e: KeyboardEvent) => {
        if (
          (e.ctrlKey || e.metaKey) &&
          e.key === 'Enter'
        ) {
          e.preventDefault()
          handleSubmit()
        }
      },
    )

    bodyEl.addEventListener('input', () =>
      clearError(errorEl),
    )
  }

  initCommentSection()
}