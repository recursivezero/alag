import { createPost, fetchDraft, saveDraft, discardDraft } from "../services/postService"
import type { DraftData } from "../services/postService"

const modal = document.getElementById("upload-modal")
const dialog = modal?.querySelector(".upload-dialog")
const openButtons = document.querySelectorAll("[data-upload-trigger]")
const closeButton = modal?.querySelector("[data-upload-close]")
const successCloseButton = modal?.querySelector("[data-upload-success-close]")
const form = modal?.querySelector("[data-upload-form]")
const uploadInput = modal?.querySelector("[data-upload-input]")
const dropzone = modal?.querySelector("[data-upload-dropzone]")
const previewImage = modal?.querySelector("[data-upload-preview-image]")
const previewPlaceholder = modal?.querySelector("[data-upload-preview-placeholder]")
const replaceButton = modal?.querySelector("[data-upload-replace]")
const removeButton = modal?.querySelector("[data-upload-remove]")
const captionInput = modal?.querySelector("[data-upload-caption]")
const feedTypeInputs = modal?.querySelectorAll("[data-upload-feed-type]")
const submitButton = modal?.querySelector("[data-upload-submit]")
const cancelButton = modal?.querySelector("[data-upload-cancel]")
const abortButton = modal?.querySelector("[data-upload-abort]")
const uploadingState = modal?.querySelector('[data-upload-state="uploading"]')
const formState = modal?.querySelector("[data-upload-form]")
const progressBar = modal?.querySelector("[data-upload-progress]")
const progressLabel = modal?.querySelector("[data-upload-progress-label]")
const toastRegion = modal?.querySelector("[data-upload-toast-region]")
const captionCount = modal?.querySelector("[data-upload-caption-count]")
const confirmOverlay = modal?.querySelector("[data-upload-confirm-overlay]")
const confirmTitle = modal?.querySelector("[data-confirm-title]")
const confirmMessage = modal?.querySelector("[data-confirm-message]")
const confirmActions = modal?.querySelector("[data-confirm-actions]")

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"])
const maxFileSize = 10 * 1024 * 1024

let selectedImage: File | null = null
let selectedImageUrl = ""
let activeDraftId: number | null = null
let uploadAbortController: AbortController | null = null
let uploadProgressTimer: ReturnType<typeof setInterval> | null = null
let activeElementBeforeOpen: HTMLElement | null = null
let dragDepth = 0
let toastDismissTimer: ReturnType<typeof setTimeout> | null = null



const uploadFocusableSelector =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

const getUploadFocusables = () => {
  if (!dialog) return []
  return Array.from(dialog.querySelectorAll<HTMLElement>(uploadFocusableSelector)).filter(
    (el) => el.offsetParent !== null
  )
}


const setModalVisibility = (visible: boolean) => {
  if (!modal) return
  modal.classList.toggle("pointer-events-none", !visible)
  modal.classList.toggle("invisible", !visible)
  modal.classList.toggle("opacity-0", !visible)
  modal.classList.toggle("opacity-100", visible)
  modal.setAttribute("aria-hidden", visible ? "false" : "true")
}

const setView = (view: "form" | "uploading") => {
  if (formState) formState.classList.toggle("hidden", view !== "form")
  if (uploadingState) uploadingState.classList.toggle("hidden", view !== "uploading")
}



type ButtonVariant = "primary" | "danger" | "default" | "ghost"

type ConfirmButton = {
  label: string
  variant: ButtonVariant
  onClick: () => void
}

type ConfirmRow = {
  
  buttons: [ConfirmButton] | [ConfirmButton, ConfirmButton]
}

type ConfirmConfig = {
  title: string
  message: string
  rows: ConfirmRow[]
}

const showConfirm = (config: ConfirmConfig) => {
  if (!confirmOverlay || !confirmTitle || !confirmMessage || !confirmActions) return

  confirmTitle.textContent = config.title
  confirmMessage.textContent = config.message
  confirmActions.innerHTML = ""

  config.rows.forEach((row) => {
    const rowEl = document.createElement("div")
    
    rowEl.className = row.buttons.length === 2 ? "confirm-row confirm-row-2" : "confirm-row"

    row.buttons.forEach((btn) => {
      const el = document.createElement("button")
      el.type = "button"
      el.textContent = btn.label

      const variantClass =
        btn.variant === "primary"  ? "confirm-btn--primary"  :
        btn.variant === "danger"   ? "confirm-btn--danger"   :
        btn.variant === "ghost"    ? "confirm-btn--ghost"    :
                                     "confirm-btn--default"

      el.className = `confirm-btn ${variantClass}`

      el.addEventListener("click", () => {
        hideConfirm()
        btn.onClick()
      })
      rowEl.appendChild(el)
    })

    confirmActions.appendChild(rowEl)
  })

  confirmOverlay.classList.remove("hidden")
  const firstBtn = confirmActions.querySelector<HTMLElement>("button")
  firstBtn?.focus()
}

const hideConfirm = () => {
  confirmOverlay?.classList.add("hidden")
}



const clearToasts = () => {
  if (toastDismissTimer) {
    window.clearTimeout(toastDismissTimer)
    toastDismissTimer = null
  }
  toastRegion?.querySelectorAll("[data-upload-toast]").forEach((t) => t.remove())
}

const dismissToast = (toast: HTMLElement) => {
  toast.dataset.state = "closing"
  window.setTimeout(() => toast.remove(), 180)
}

const showToast = ({
  tone = "info",
  title,
  message,
}: {
  tone?: "info" | "success" | "error"
  title: string
  message: string
}) => {
  if (!toastRegion) return
  clearToasts()

  const toast = document.createElement("div")
  toast.className = `upload-toast upload-toast--${tone}`
  toast.dataset.uploadToast = ""
  toast.dataset.state = "open"
  toast.setAttribute("role", "alert")
  toast.setAttribute("aria-live", "assertive")
  toast.setAttribute("aria-atomic", "true")

  const icon = document.createElement("div")
  icon.className = "upload-toast__icon"
  icon.innerHTML =
    tone === "success"
      ? '<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M20 6 9 17l-5-5"></path></svg>'
      : tone === "error"
        ? '<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 9v4"></path><path d="M12 17h.01"></path><path d="M10.3 4.7 2.6 18a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.7a2 2 0 0 0-3.4 0Z"></path></svg>'
        : '<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 16V4"></path><path d="m7 9 5-5 5 5"></path><path d="M4 20h16"></path></svg>'

  const body = document.createElement("div")
  body.className = "upload-toast__body"

  const titleEl = document.createElement("div")
  titleEl.className = "upload-toast__title"
  titleEl.textContent = title

  const messageEl = document.createElement("div")
  messageEl.className = "upload-toast__message"
  messageEl.textContent = message

  body.append(titleEl, messageEl)

  const closeBtn = document.createElement("button")
  closeBtn.type = "button"
  closeBtn.className = "upload-toast__close"
  closeBtn.setAttribute("aria-label", "Dismiss notification")
  closeBtn.innerHTML =
    '<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m18 6-12 12"></path><path d="m6 6 12 12"></path></svg>'
  closeBtn.addEventListener("click", () => dismissToast(toast))

  toast.append(icon, body, closeBtn)
  toastRegion.prepend(toast)
  toastDismissTimer = window.setTimeout(() => dismissToast(toast), 6000)
}



const updateCounters = () => {
  if (captionCount && captionInput) {
    captionCount.textContent = `${(captionInput as HTMLTextAreaElement).value.length} / 500`
  }
}

const getFeedType = (): "public" | "personal" => {
  const checked = Array.from(feedTypeInputs || []).find((i) => (i as HTMLInputElement).checked)
  return (checked as HTMLInputElement)?.value === "personal" ? "personal" : "public"
}

const setFeedType = (feedType: "public" | "personal") => {
  feedTypeInputs?.forEach((i) => {
    ;(i as HTMLInputElement).checked = (i as HTMLInputElement).value === feedType
  })
}

const hasFormContent = () => {
  const captionVal = (captionInput as HTMLTextAreaElement | undefined)?.value?.trim() || ""
  return Boolean(selectedImage || selectedImageUrl || captionVal)
}

const syncSubmitState = () => {
  if (!submitButton || !captionInput) return
  const canSubmit = Boolean(
    selectedImageUrl && (captionInput as HTMLTextAreaElement).value.trim() && !uploadAbortController
  )
  ;(submitButton as HTMLButtonElement).disabled = !canSubmit
}

const syncImageButtons = () => {
  const hasImage = Boolean(selectedImageUrl)
  ;(replaceButton as HTMLButtonElement | undefined)?.toggleAttribute("disabled", !hasImage)
  ;(removeButton as HTMLButtonElement | undefined)?.toggleAttribute("disabled", !hasImage)
}



const setPreview = (dataUrl: string) => {
  selectedImageUrl = dataUrl
  if (previewImage && previewPlaceholder) {
    ;(previewImage as HTMLImageElement).src = dataUrl
    previewImage.classList.remove("hidden")
    previewPlaceholder.classList.add("hidden")
    dropzone?.classList.add("has-image")
  }
  syncImageButtons()
}

const clearPreview = () => {
  selectedImage = null
  selectedImageUrl = ""
  if (uploadInput) (uploadInput as HTMLInputElement).value = ""
  if (previewImage && previewPlaceholder) {
    ;(previewImage as HTMLImageElement).src = ""
    previewImage.classList.add("hidden")
    previewPlaceholder.classList.remove("hidden")
    dropzone?.classList.remove("has-image")
  }
  syncImageButtons()
}



const validateFile = (file: File | null) => {
  if (!file) return false
  if (!allowedTypes.has(file.type)) {
    showToast({ tone: "error", title: "Invalid file type", message: "Only JPG, PNG, and WEBP images are allowed." })
    return false
  }
  if (file.size > maxFileSize) {
    showToast({ tone: "error", title: "File too large", message: "Image must be 10MB or smaller." })
    return false
  }
  return true
}

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ""))
    reader.onerror = () => reject(new Error("Unable to read file"))
    reader.readAsDataURL(file)
  })

const handleFileSelection = async (file: File | null) => {
  if (!validateFile(file)) { syncSubmitState(); return }
  selectedImage = file
  const dataUrl = await readFileAsDataUrl(file!)
  setPreview(dataUrl)
  syncSubmitState()
}



const loadDraft = async () => {
  let draft: DraftData | null = null
  try {
    draft = await fetchDraft()
  } catch {

  }

  if (!draft) return

  activeDraftId = draft.id


  if (captionInput && draft.caption) {
    ;(captionInput as HTMLTextAreaElement).value = draft.caption
    updateCounters()
  }

 
  if (draft.feedType) {
    setFeedType(draft.feedType)
  }

 
  if (draft.imageUrl) {
    selectedImageUrl = draft.imageUrl
    
    if (previewImage && previewPlaceholder) {
      ;(previewImage as HTMLImageElement).src = draft.imageUrl
      previewImage.classList.remove("hidden")
      previewPlaceholder.classList.add("hidden")
      dropzone?.classList.add("has-image")
    }
    syncImageButtons()
  }

  syncSubmitState()
}


const openModal = async () => {
  setModalVisibility(true)
  setView("form")
  clearToasts()
  updateCounters()
  syncSubmitState()
  syncImageButtons()
  activeElementBeforeOpen = document.activeElement instanceof HTMLElement ? document.activeElement : null
  document.body.style.overflow = "hidden"

  await loadDraft()

  window.requestAnimationFrame(() => {
    ;(captionInput as HTMLElement | undefined)?.focus()
  })
}

const resetForm = () => {
  clearPreview()
  activeDraftId = null
  if (captionInput) (captionInput as HTMLTextAreaElement).value = ""
  setFeedType("public")
  updateCounters()
  syncSubmitState()
  syncImageButtons()
}

const closeModal = (shouldRestore = true) => {
  if (uploadAbortController) { uploadAbortController.abort(); uploadAbortController = null }
  if (uploadProgressTimer) { clearInterval(uploadProgressTimer); uploadProgressTimer = null }
  hideConfirm()
  setModalVisibility(false)
  setView("form")
  clearToasts()
  resetForm()
  document.body.style.overflow = ""
  if (shouldRestore) activeElementBeforeOpen?.focus()
}



const handleCloseRequest = () => {
  if (!hasFormContent()) { closeModal(); return }

  showConfirm({
    title: "Save changes?",
    message: "Do you want to save your changes before closing?",
    rows: [
  {
    buttons: [
      {
        label: "Save Draft",
        variant: "primary",
        onClick: async () => {
          const caption =
            (captionInput as HTMLTextAreaElement | undefined)?.value?.trim() || ""

          const feedType = getFeedType()

          const result = await saveDraft({
            imageUrl: selectedImageUrl,
            caption,
            altText: caption,
            feedType,
            category: "general",
            location: "",
          })

          if (result) {
            activeDraftId = result.id
          }

          closeModal()
        },
      },
      {
        label: "Discard",
        variant: "ghost",
        onClick: async () => {
          await discardDraft()
          closeModal()
        },
      },
    ],
  },

  {
    buttons: [
      {
        label: "Cancel",
        variant: "default",
        onClick: () => {},
      },
    ],
  },
],
  })
}



const handleReplaceRequest = () => {
  showConfirm({
    title: "Replace image?",
    message: "Do you want to replace the current image?",
    rows: [
      {
        buttons: [
          {
            label: "Yes",
            variant: "primary",
            onClick: () => {
              clearPreview()
              syncSubmitState()
              uploadInput && (uploadInput as HTMLInputElement).click()
            },
          },
          {
            label: "No",
            variant: "default",
            onClick: () => {},
          },
        ],
      },
    ],
  })
}

const handleRemoveRequest = () => {
  showConfirm({
    title: "Remove image?",
    message: "Do you want to remove the current image?",
    rows: [
      {
        buttons: [
          {
            label: "Yes",
            variant: "danger",
            onClick: () => {
              clearPreview()
              clearToasts()
              syncSubmitState()
            },
          },
          {
            label: "No",
            variant: "default",
            onClick: () => {},
          },
        ],
      },
    ],
  })
}



const beginUploadAnimation = () => {
  let progress = 0
  if (progressBar) (progressBar as HTMLElement).style.width = "0%"
  if (progressLabel) progressLabel.textContent = "0%"
  uploadProgressTimer = window.setInterval(() => {
    progress = Math.min(progress + (progress < 70 ? 11 : 5), 96)
    if (progressBar) (progressBar as HTMLElement).style.width = `${progress}%`
    if (progressLabel) progressLabel.textContent = `${progress}%`
  }, 140)
}

const finishUploadAnimation = () => {
  if (uploadProgressTimer) { clearInterval(uploadProgressTimer); uploadProgressTimer = null }
  if (progressBar) (progressBar as HTMLElement).style.width = "100%"
  if (progressLabel) progressLabel.textContent = "100%"
}



const submitUpload = async (event: Event) => {
  event.preventDefault()

  const caption = String((captionInput as HTMLTextAreaElement | undefined)?.value || "").trim()
  const feedType = getFeedType()

  if (!selectedImageUrl || !caption) {
    showToast({ tone: "error", title: "Missing required fields", message: "Add an image and caption before publishing." })
    syncSubmitState()
    return
  }

  if (selectedImage && !validateFile(selectedImage)) { syncSubmitState(); return }

  uploadAbortController = new AbortController()
  setView("uploading")
  beginUploadAnimation()
  syncSubmitState()

  try {
    await createPost(
      {
        imageUrl: selectedImageUrl,
        caption,
        altText: caption,
        category: "general",
        feedType,
        location: "",
        
        draftId: activeDraftId,
      },
      uploadAbortController.signal
    )
    finishUploadAnimation()
    closeModal()
    window.setTimeout(() => {
      showToast({ tone: "success", title: "Image uploaded successfully", message: "Your image has been published." })
    }, 80)
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return
    finishUploadAnimation()
    setView("form")
    showToast({
      tone: "error",
      title: "Upload failed",
      message: error instanceof Error ? error.message : "Unable to upload post.",
    })
    uploadAbortController = null
    syncSubmitState()
  } finally {
    uploadAbortController = null
    syncSubmitState()
  }
}

const cancelUpload = () => {
  if (uploadAbortController) { uploadAbortController.abort(); uploadAbortController = null }
  closeModal(true)
}



openButtons.forEach((btn) => btn.addEventListener("click", openModal))

closeButton?.addEventListener("click", handleCloseRequest)
successCloseButton?.addEventListener("click", () => closeModal(true))

dropzone?.addEventListener("click", () => (uploadInput as HTMLInputElement | undefined)?.click())
replaceButton?.addEventListener("click", handleReplaceRequest)
removeButton?.addEventListener("click", handleRemoveRequest)

uploadInput?.addEventListener("change", async () => {
  const file = (uploadInput as HTMLInputElement).files?.[0] || null
  try { await handleFileSelection(file) }
  catch { showToast({ tone: "error", title: "Upload failed", message: "Unable to read the selected image." }) }
})

captionInput?.addEventListener("input", () => { updateCounters(); syncSubmitState() })
feedTypeInputs?.forEach((i) => i.addEventListener("change", syncSubmitState))

form?.addEventListener("submit", submitUpload)
cancelButton?.addEventListener("click", cancelUpload)
abortButton?.addEventListener("click", cancelUpload)

modal?.addEventListener("click", (event) => {
  if (event.target === modal) handleCloseRequest()
})



modal?.addEventListener("dragenter", (event) => {
  event.preventDefault(); dragDepth += 1; dropzone?.classList.add("is-dragging")
})
modal?.addEventListener("dragover", (event) => event.preventDefault())
modal?.addEventListener("dragleave", (event) => {
  event.preventDefault()
  dragDepth = Math.max(0, dragDepth - 1)
  if (dragDepth === 0) dropzone?.classList.remove("is-dragging")
})
modal?.addEventListener("drop", async (event) => {
  event.preventDefault(); dragDepth = 0; dropzone?.classList.remove("is-dragging")
  const file = (event as DragEvent).dataTransfer?.files?.[0] || null
  try { await handleFileSelection(file) }
  catch { showToast({ tone: "error", title: "Upload failed", message: "Unable to read the selected image." }) }
})



document.addEventListener("keydown", (event) => {
  if (!modal || modal.classList.contains("invisible")) return

  if (event.key === "Escape") {
    event.preventDefault()
    if (confirmOverlay && !confirmOverlay.classList.contains("hidden")) { hideConfirm(); return }
    if (uploadAbortController) { uploadAbortController.abort(); uploadAbortController = null }
    handleCloseRequest()
    return
  }

  if (event.key !== "Tab") return
  const focusable = getUploadFocusables()
  if (!focusable.length) return
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); return }
  if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
})



setModalVisibility(false)
updateCounters()
syncSubmitState()
syncImageButtons()