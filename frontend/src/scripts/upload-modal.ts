import { createPost } from "../services/postService"

const modal = document.getElementById("upload-modal")
const dialog = modal?.querySelector(".upload-dialog")
const openButtons = document.querySelectorAll("[data-upload-trigger]")
const closeButtons = modal?.querySelectorAll("[data-upload-close], [data-upload-success-close]")
const form = modal?.querySelector("[data-upload-form]")
const uploadInput = modal?.querySelector("[data-upload-input]")
const dropzone = modal?.querySelector("[data-upload-dropzone]")
const previewImage = modal?.querySelector("[data-upload-preview-image]")
const previewPlaceholder = modal?.querySelector("[data-upload-preview-placeholder]")
const replaceButton = modal?.querySelector("[data-upload-replace]")
const removeButton = modal?.querySelector("[data-upload-remove]")
const captionInput = modal?.querySelector("[data-upload-caption]")
const altInput = modal?.querySelector("[data-upload-alt]")
const categoryInput = modal?.querySelector("[data-upload-category]")
const locationInput = modal?.querySelector("[data-upload-location]")
const feedTypeInputs = modal?.querySelectorAll("[data-upload-feed-type]")
const submitButton = modal?.querySelector("[data-upload-submit]")
const cancelButton = modal?.querySelector("[data-upload-cancel]")
const abortButton = modal?.querySelector("[data-upload-abort]")
const uploadingState = modal?.querySelector('[data-upload-state="uploading"]')
const successState = modal?.querySelector('[data-upload-state="success"]')
const formState = modal?.querySelector("[data-upload-form]")
const progressBar = modal?.querySelector("[data-upload-progress]")
const progressLabel = modal?.querySelector("[data-upload-progress-label]")
const successLink = modal?.querySelector("[data-upload-success-link]")
const toastRegion = modal?.querySelector("[data-upload-toast-region]")
const captionCount = modal?.querySelector("[data-upload-caption-count]")
const altCount = modal?.querySelector("[data-upload-alt-count]")

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"])
const maxFileSize = 10 * 1024 * 1024

let selectedImage = null
let selectedImageUrl = ""
let uploadAbortController = null
let uploadProgressTimer = null
let activeElementBeforeOpen = null
let currentSuccessSlug = ""
let dragDepth = 0
let toastDismissTimer = null

const uploadFocusableSelector =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

const getUploadFocusables = () => {
  if (!dialog) return []
  return Array.from(dialog.querySelectorAll(uploadFocusableSelector)).filter((element) => element.offsetParent !== null)
}

const setModalVisibility = (visible) => {
  if (!modal) return
  modal.classList.toggle("pointer-events-none", !visible)
  modal.classList.toggle("invisible", !visible)
  modal.classList.toggle("opacity-0", !visible)
  modal.classList.toggle("opacity-100", visible)
  modal.setAttribute("aria-hidden", visible ? "false" : "true")
}

const setView = (view) => {
  if (formState) formState.classList.toggle("hidden", view !== "form")
  if (uploadingState) uploadingState.classList.toggle("hidden", view !== "uploading")
  if (successState) successState.classList.toggle("hidden", view !== "success")
}

const clearToasts = () => {
  if (toastDismissTimer) {
    window.clearTimeout(toastDismissTimer)
    toastDismissTimer = null
  }

  if (toastRegion) {
    toastRegion.querySelectorAll("[data-upload-toast]").forEach((toast) => toast.remove())
  }
}

const dismissToast = (toast) => {
  if (!toast) return

  toast.dataset.state = "closing"
  window.setTimeout(() => {
    toast.remove()
  }, 180)
}

const showToast = ({ tone = "info", title, message }) => {
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

  const closeButton = document.createElement("button")
  closeButton.type = "button"
  closeButton.className = "upload-toast__close"
  closeButton.setAttribute("aria-label", "Dismiss notification")
  closeButton.innerHTML = '<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m18 6-12 12"></path><path d="m6 6 12 12"></path></svg>'
  closeButton.addEventListener("click", () => dismissToast(toast))

  toast.append(icon, body, closeButton)
  toastRegion.prepend(toast)

  toastDismissTimer = window.setTimeout(() => dismissToast(toast), 3800)
}

const updateCounters = () => {
  if (captionCount && captionInput) captionCount.textContent = `${captionInput.value.length} / 500`
  if (altCount && altInput) altCount.textContent = `${altInput.value.length} / 200`
}

const getFeedType = () => {
  const checked = Array.from(feedTypeInputs || []).find((input) => input.checked)
  return checked?.value === "personal" ? "personal" : "public"
}

const syncSubmitState = () => {
  if (!submitButton || !captionInput || !altInput) return
  const canSubmit = Boolean(selectedImage && selectedImageUrl && captionInput.value.trim() && altInput.value.trim() && !uploadAbortController)
  submitButton.disabled = !canSubmit || Boolean(uploadAbortController)
}

const setPreview = (dataUrl) => {
  selectedImageUrl = dataUrl
  if (previewImage && previewPlaceholder) {
    previewImage.src = dataUrl
    previewImage.classList.remove("hidden")
    previewPlaceholder.classList.add("hidden")
  }
}

const clearPreview = () => {
  selectedImage = null
  selectedImageUrl = ""
  if (uploadInput) uploadInput.value = ""
  if (previewImage && previewPlaceholder) {
    previewImage.src = ""
    previewImage.classList.add("hidden")
    previewPlaceholder.classList.remove("hidden")
  }
}

const validateFile = (file) => {
  if (!file) {
    return false
  }

  if (!allowedTypes.has(file.type)) {
    showToast({
      tone: "error",
      title: "Invalid file type",
      message: "Only JPG, JPEG, PNG, and WEBP images are allowed.",
    })
    return false
  }

  if (file.size > maxFileSize) {
    showToast({
      tone: "error",
      title: "File too large",
      message: "Image must be 10MB or smaller.",
    })
    return false
  }

  return true
}

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ""))
    reader.onerror = () => reject(new Error("Unable to read file"))
    reader.readAsDataURL(file)
  })

const handleFileSelection = async (file) => {
  if (!validateFile(file)) {
    syncSubmitState()
    return
  }

  selectedImage = file
  const dataUrl = await readFileAsDataUrl(file)
  setPreview(dataUrl)
  syncSubmitState()
}

const openModal = () => {
  setModalVisibility(true)
  setView("form")
  clearToasts()
  updateCounters()
  syncSubmitState()
  activeElementBeforeOpen = document.activeElement instanceof HTMLElement ? document.activeElement : null
  window.requestAnimationFrame(() => {
    captionInput?.focus()
  })
  document.body.style.overflow = "hidden"
}

const closeModal = (shouldRestore = true) => {
  if (uploadAbortController) {
    uploadAbortController.abort()
    uploadAbortController = null
  }

  if (uploadProgressTimer) {
    clearInterval(uploadProgressTimer)
    uploadProgressTimer = null
  }

  setModalVisibility(false)
  setView("form")
  clearToasts()
  clearPreview()

  if (captionInput) captionInput.value = ""
  if (altInput) altInput.value = ""
  if (categoryInput) categoryInput.value = "Nature"
  if (locationInput) locationInput.value = ""
  if (feedTypeInputs) {
    feedTypeInputs.forEach((input) => {
      input.checked = input.value === "public"
    })
  }

  currentSuccessSlug = ""
  updateCounters()
  syncSubmitState()
  document.body.style.overflow = ""

  if (shouldRestore) {
    activeElementBeforeOpen?.focus()
  }
}

const beginUploadAnimation = () => {
  let progress = 0

  if (progressBar) progressBar.style.width = "0%"
  if (progressLabel) progressLabel.textContent = "0%"

  uploadProgressTimer = window.setInterval(() => {
    progress = Math.min(progress + (progress < 70 ? 11 : 5), 96)
    if (progressBar) progressBar.style.width = `${progress}%`
    if (progressLabel) progressLabel.textContent = `${progress}%`
  }, 140)
}

const finishUploadAnimation = () => {
  if (uploadProgressTimer) {
    clearInterval(uploadProgressTimer)
    uploadProgressTimer = null
  }

  if (progressBar) progressBar.style.width = "100%"
  if (progressLabel) progressLabel.textContent = "100%"
}

const showSuccess = (post) => {
  currentSuccessSlug = post?.slug || ""
  if (successLink) {
    successLink.href = post?.slug ? `/posts/${post.slug}` : "#"
  }
  showToast({
    tone: "success",
    title: "Upload successful",
    message: "Your image has been published.",
  })
  setView("success")
  syncSubmitState()
  window.requestAnimationFrame(() => {
    successLink?.focus()
  })
}

const submitUpload = async (event) => {
  event.preventDefault()

  const caption = String(captionInput?.value || "").trim()
  const altText = String(altInput?.value || "").trim()
  const category = String(categoryInput?.value || "").trim() || "Nature"
  const location = String(locationInput?.value || "").trim()
  const feedType = getFeedType()

  let hasError = false
  let missingRequiredField = false

  if (!selectedImage || !selectedImageUrl) {
    hasError = true
    missingRequiredField = true
  }

  if (!caption) {
    hasError = true
    missingRequiredField = true
  }

  if (!altText) {
    hasError = true
    missingRequiredField = true
  }

  if (selectedImage && !validateFile(selectedImage)) {
    hasError = true
  }

  if (hasError && missingRequiredField) {
    showToast({
      tone: "error",
      title: "Missing required fields",
      message: "Add an image, caption, and ALT text before publishing.",
    })
    syncSubmitState()
    return
  }

  uploadAbortController = new AbortController()
  setView("uploading")
  beginUploadAnimation()
  syncSubmitState()

  try {
    const post = await createPost({
      imageUrl: selectedImageUrl,
      caption,
      altText,
      category,
      feedType,
      location,
    }, uploadAbortController.signal)

    finishUploadAnimation()
    showSuccess(post)
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return
    }

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
  if (uploadAbortController) {
    uploadAbortController.abort()
    uploadAbortController = null
  }

  closeModal(true)
}

openButtons.forEach((button) => {
  button.addEventListener("click", openModal)
})

closeButtons?.forEach((button) => {
  button.addEventListener("click", () => {
    if (currentSuccessSlug) {
      window.location.reload()
      return
    }

    closeModal(true)
  })
})

dropzone?.addEventListener("click", () => uploadInput?.click())
replaceButton?.addEventListener("click", () => uploadInput?.click())
removeButton?.addEventListener("click", () => {
  clearPreview()
  clearToasts()
  syncSubmitState()
})

uploadInput?.addEventListener("change", async () => {
  const file = uploadInput.files?.[0] || null
  try {
    await handleFileSelection(file)
  } catch {
    showToast({
      tone: "error",
      title: "Upload failed",
      message: "Unable to read the selected image.",
    })
  }
})

captionInput?.addEventListener("input", () => {
  updateCounters()
  syncSubmitState()
})

altInput?.addEventListener("input", () => {
  updateCounters()
  syncSubmitState()
})

categoryInput?.addEventListener("change", syncSubmitState)
locationInput?.addEventListener("input", syncSubmitState)
feedTypeInputs?.forEach((input) => input.addEventListener("change", syncSubmitState))

form?.addEventListener("submit", submitUpload)
cancelButton?.addEventListener("click", cancelUpload)
abortButton?.addEventListener("click", cancelUpload)

modal?.addEventListener("click", (event) => {
  if (event.target === modal) {
    closeModal(true)
  }
})

modal?.addEventListener("dragenter", (event) => {
  event.preventDefault()
  dragDepth += 1
  dropzone?.classList.add("is-dragging")
})

modal?.addEventListener("dragover", (event) => {
  event.preventDefault()
})

modal?.addEventListener("dragleave", (event) => {
  event.preventDefault()
  dragDepth = Math.max(0, dragDepth - 1)
  if (dragDepth === 0) {
    dropzone?.classList.remove("is-dragging")
  }
})

modal?.addEventListener("drop", async (event) => {
  event.preventDefault()
  dragDepth = 0
  dropzone?.classList.remove("is-dragging")

  const file = event.dataTransfer?.files?.[0] || null
  try {
    await handleFileSelection(file)
  } catch {
    showToast({
      tone: "error",
      title: "Upload failed",
      message: "Unable to read the selected image.",
    })
  }
})

document.addEventListener("keydown", (event) => {
  if (!modal || modal.classList.contains("invisible")) return

  if (event.key === "Escape") {
    event.preventDefault()
    if (uploadAbortController) {
      uploadAbortController.abort()
      uploadAbortController = null
    }
    closeModal(true)
    return
  }

  if (event.key !== "Tab") return

  const focusable = getUploadFocusables()
  if (!focusable.length) return

  const first = focusable[0]
  const last = focusable[focusable.length - 1]

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
    return
  }

  if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
})

setModalVisibility(false)
updateCounters()
syncSubmitState()